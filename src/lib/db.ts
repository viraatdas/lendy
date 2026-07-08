import { sql } from '@vercel/postgres';

export async function initializeDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255),
        contact_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS books (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        author VARCHAR(500),
        cover_url TEXT,
        open_library_key VARCHAR(255),
        owner_username VARCHAR(255) NOT NULL REFERENCES users(username),
        borrower_username VARCHAR(255) REFERENCES users(username),
        lent_to_name VARCHAR(255),
        borrowed_from_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Migrations for existing databases (safe to run repeatedly)
    try {
      await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS borrowed_from_name VARCHAR(255);`;
      await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_message TEXT;`;
    } catch {
      // Columns might already exist, ignore error
    }

    await sql`
      CREATE TABLE IF NOT EXISTS requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        requester_username VARCHAR(255) NOT NULL REFERENCES users(username),
        owner_username VARCHAR(255) NOT NULL REFERENCES users(username),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_books_owner ON books(owner_username);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_books_borrower ON books(borrower_username);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_requests_owner ON requests(owner_username);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_requests_requester ON requests(requester_username);`;

    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        username VARCHAR(255) NOT NULL REFERENCES users(username),
        body TEXT NOT NULL,
        is_spoiler BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_spoiler BOOLEAN DEFAULT false;`;

    await sql`
      CREATE TABLE IF NOT EXISTS comment_likes (
        comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        username VARCHAR(255) NOT NULL REFERENCES users(username),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (comment_id, username)
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_comments_book ON comments(book_id);`;

    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export async function getOrCreateUser(username: string) {
  const normalizedUsername = username.toLowerCase().trim();

  const existingUser = await sql`
    SELECT * FROM users WHERE username = ${normalizedUsername}
  `;

  if (existingUser.rows.length > 0) {
    return existingUser.rows[0];
  }

  const newUser = await sql`
    INSERT INTO users (username) VALUES (${normalizedUsername})
    RETURNING *
  `;

  return newUser.rows[0];
}

export async function userExists(username: string): Promise<boolean> {
  const normalizedUsername = username.toLowerCase().trim();
  if (!normalizedUsername) return false;
  const result = await sql`SELECT 1 FROM users WHERE username = ${normalizedUsername} LIMIT 1`;
  return result.rows.length > 0;
}

export async function getUserProfile(username: string) {
  const normalizedUsername = username.toLowerCase().trim();
  const result = await sql`
    SELECT username, email, contact_message FROM users WHERE username = ${normalizedUsername}
  `;
  return result.rows[0] || null;
}

export async function updateUserProfile(
  username: string,
  email: string | null,
  contactMessage: string | null
) {
  const normalizedUsername = username.toLowerCase().trim();
  const normalizedEmail = email ? email.toLowerCase().trim() : null;

  // Ensure the user exists first
  await getOrCreateUser(normalizedUsername);

  // Enforce unique email across users.
  if (normalizedEmail) {
    const taken = await sql`
      SELECT username FROM users
      WHERE LOWER(email) = ${normalizedEmail} AND username != ${normalizedUsername}
      LIMIT 1
    `;
    if (taken.rows.length > 0) {
      return { error: 'email_taken' as const };
    }
  }

  const result = await sql`
    UPDATE users
    SET email = ${normalizedEmail}, contact_message = ${contactMessage || null}
    WHERE username = ${normalizedUsername}
    RETURNING username, email, contact_message
  `;
  return { user: result.rows[0] };
}

// Permanently delete a user and everything tied to them.
export async function deleteUser(username: string) {
  const u = username.toLowerCase().trim();

  // Hand back any books this user had borrowed from others.
  await sql`
    UPDATE books SET lent_to_name = NULL, borrower_username = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE borrower_username = ${u} AND owner_username != ${u}
  `;
  // Likes this user gave on any comment.
  await sql`DELETE FROM comment_likes WHERE username = ${u}`;
  // Comments this user wrote (cascades likes on them).
  await sql`DELETE FROM comments WHERE username = ${u}`;
  // Requests to or from this user.
  await sql`DELETE FROM requests WHERE requester_username = ${u} OR owner_username = ${u}`;
  // Books this user owns (cascades comments/requests/likes on those books).
  await sql`DELETE FROM books WHERE owner_username = ${u}`;
  // Finally the user row.
  const result = await sql`DELETE FROM users WHERE username = ${u} RETURNING username`;
  return result.rows[0] || null;
}

export async function getUserBooks(username: string) {
  const normalizedUsername = username.toLowerCase().trim();

  const owned = await sql`
    SELECT * FROM books
    WHERE owner_username = ${normalizedUsername}
    AND lent_to_name IS NULL
    AND (borrowed_from_name IS NULL OR borrowed_from_name = '')
    ORDER BY created_at DESC
  `;

  const lending = await sql`
    SELECT * FROM books
    WHERE owner_username = ${normalizedUsername}
    AND lent_to_name IS NOT NULL
    ORDER BY created_at DESC
  `;

  // Books borrowed from others: either manually added by the user
  // (owner_username = me, borrowed_from_name set) OR lent to the user through
  // Lendy by another owner (borrower_username = me). For the latter, show the
  // owner's name as who it was borrowed from.
  const borrowed = await sql`
    SELECT *,
      COALESCE(NULLIF(borrowed_from_name, ''), owner_username) AS borrowed_from_name
    FROM books
    WHERE (owner_username = ${normalizedUsername}
           AND borrowed_from_name IS NOT NULL
           AND borrowed_from_name != '')
       OR (borrower_username = ${normalizedUsername}
           AND owner_username != ${normalizedUsername})
    ORDER BY created_at DESC
  `;

  return {
    owned: owned.rows,
    lending: lending.rows,
    borrowed: borrowed.rows,
  };
}

export async function addBook(
  username: string,
  title: string,
  author: string,
  coverUrl: string | null,
  openLibraryKey: string,
  borrowedFromName?: string
) {
  const normalizedUsername = username.toLowerCase().trim();

  const result = await sql`
    INSERT INTO books (title, author, cover_url, open_library_key, owner_username, borrowed_from_name)
    VALUES (${title}, ${author}, ${coverUrl}, ${openLibraryKey}, ${normalizedUsername}, ${borrowedFromName || null})
    RETURNING *
  `;

  return result.rows[0];
}

export async function lendBook(bookId: string, lentToName: string, borrowerUsername?: string) {
  const normalizedBorrower = borrowerUsername?.toLowerCase().trim() || null;

  const result = await sql`
    UPDATE books
    SET lent_to_name = ${lentToName}, borrower_username = ${normalizedBorrower}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${bookId}
    RETURNING *
  `;

  return result.rows[0];
}

export async function returnBook(bookId: string) {
  const result = await sql`
    UPDATE books
    SET lent_to_name = NULL, borrower_username = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${bookId}
    RETURNING *
  `;

  return result.rows[0];
}

export async function returnBorrowedBook(bookId: string) {
  const result = await sql`
    DELETE FROM books
    WHERE id = ${bookId}
    RETURNING *
  `;

  return result.rows[0];
}

export async function deleteBook(bookId: string, username: string) {
  const normalizedUsername = username.toLowerCase().trim();

  const result = await sql`
    DELETE FROM books
    WHERE id = ${bookId} AND owner_username = ${normalizedUsername}
    RETURNING *
  `;

  return result.rows[0];
}

// ---- Readers directory (task 2/3) ----

export async function getReaders(excludeUsername?: string) {
  const exclude = excludeUsername?.toLowerCase().trim() || '';

  const users = await sql`SELECT username FROM users`;

  const counts = await sql`
    SELECT owner_username,
      COUNT(*)::int AS book_count,
      MAX(GREATEST(created_at, COALESCE(updated_at, created_at))) AS last_activity
    FROM books
    GROUP BY owner_username
  `;

  // Latest book (by activity) per user, to describe their last action
  const latest = await sql`
    SELECT DISTINCT ON (owner_username)
      owner_username, title, lent_to_name,
      GREATEST(created_at, COALESCE(updated_at, created_at)) AS activity
    FROM books
    ORDER BY owner_username, GREATEST(created_at, COALESCE(updated_at, created_at)) DESC
  `;

  const countMap = new Map<string, { book_count: number; last_activity: string | null }>();
  for (const row of counts.rows) {
    countMap.set(row.owner_username, {
      book_count: row.book_count,
      last_activity: row.last_activity,
    });
  }

  const latestMap = new Map<string, { title: string; lent_to_name: string | null }>();
  for (const row of latest.rows) {
    latestMap.set(row.owner_username, { title: row.title, lent_to_name: row.lent_to_name });
  }

  const readers = users.rows
    .map((u) => {
      const username = u.username as string;
      const c = countMap.get(username);
      const l = latestMap.get(username);
      let last_action = 'Just joined';
      if (l) {
        last_action = l.lent_to_name
          ? `Lent "${l.title}" to ${l.lent_to_name}`
          : `Added "${l.title}"`;
      }
      return {
        username,
        book_count: c?.book_count ?? 0,
        last_activity: c?.last_activity ?? null,
        last_action,
      };
    })
    .filter((r) => r.username !== exclude)
    .sort((a, b) => {
      if (!a.last_activity && !b.last_activity) return a.username.localeCompare(b.username);
      if (!a.last_activity) return 1;
      if (!b.last_activity) return -1;
      return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
    });

  return readers;
}

// ---- Public library view (task 4) ----

export async function getPublicLibrary(username: string, viewer?: string) {
  const normalizedUsername = username.toLowerCase().trim();
  const normalizedViewer = viewer?.toLowerCase().trim() || '';

  const profile = await sql`
    SELECT username, email, contact_message FROM users WHERE username = ${normalizedUsername}
  `;

  const owned = await sql`
    SELECT b.*,
      EXISTS(
        SELECT 1 FROM requests r
        WHERE r.book_id = b.id
        AND r.requester_username = ${normalizedViewer}
        AND r.status = 'pending'
      ) AS requested
    FROM books b
    WHERE b.owner_username = ${normalizedUsername}
    AND b.lent_to_name IS NULL
    AND (b.borrowed_from_name IS NULL OR b.borrowed_from_name = '')
    ORDER BY b.created_at DESC
  `;

  const lending = await sql`
    SELECT * FROM books
    WHERE owner_username = ${normalizedUsername}
    AND lent_to_name IS NOT NULL
    ORDER BY created_at DESC
  `;

  const p = profile.rows[0];

  return {
    username: normalizedUsername,
    contact_message: p?.contact_message ?? null,
    hasContact: !!(p && p.email),
    owned: owned.rows,
    lending: lending.rows,
  };
}

// ---- Find a book across everyone's shelves ----

export async function findBooks(query: string, viewer: string) {
  const q = `%${query.trim()}%`;
  const v = viewer.toLowerCase().trim();
  const result = await sql`
    SELECT b.id, b.title, b.author, b.cover_url, b.open_library_key,
           b.owner_username, b.lent_to_name,
           EXISTS(
             SELECT 1 FROM requests r
             WHERE r.book_id = b.id AND r.requester_username = ${v} AND r.status = 'pending'
           ) AS requested
    FROM books b
    WHERE b.owner_username != ${v}
      AND (b.borrowed_from_name IS NULL OR b.borrowed_from_name = '')
      AND (b.title ILIKE ${q} OR b.author ILIKE ${q})
    ORDER BY (b.lent_to_name IS NULL) DESC, b.title ASC, b.owner_username ASC
    LIMIT 60
  `;
  return result.rows;
}

// ---- Requests (tasks 4 & 5) ----

export async function createRequest(bookId: string, requesterUsername: string) {
  const requester = requesterUsername.toLowerCase().trim();
  await getOrCreateUser(requester);

  const bookResult = await sql`SELECT * FROM books WHERE id = ${bookId}`;
  const book = bookResult.rows[0];
  if (!book) {
    return { error: 'Book not found' as const };
  }
  if (book.owner_username === requester) {
    return { error: 'You cannot request your own book' as const };
  }
  if (book.lent_to_name) {
    return { error: 'This book is currently lent out' as const };
  }

  // Prevent duplicate pending requests
  const existing = await sql`
    SELECT id FROM requests
    WHERE book_id = ${bookId} AND requester_username = ${requester} AND status = 'pending'
  `;
  if (existing.rows.length > 0) {
    return { error: 'You already requested this book' as const };
  }

  const inserted = await sql`
    INSERT INTO requests (book_id, requester_username, owner_username, status)
    VALUES (${bookId}, ${requester}, ${book.owner_username}, 'pending')
    RETURNING *
  `;

  // Owner's email (for notification)
  const ownerRow = await sql`SELECT email FROM users WHERE username = ${book.owner_username}`;

  return {
    request: inserted.rows[0],
    book,
    ownerEmail: (ownerRow.rows[0]?.email as string | null) ?? null,
  };
}

export async function getIncomingRequests(username: string) {
  const normalizedUsername = username.toLowerCase().trim();
  const result = await sql`
    SELECT r.id, r.book_id, r.requester_username, r.owner_username, r.status, r.created_at,
           b.title, b.author, b.cover_url
    FROM requests r
    JOIN books b ON b.id = r.book_id
    WHERE r.owner_username = ${normalizedUsername}
    AND r.status = 'pending'
    ORDER BY r.created_at DESC
  `;
  return result.rows;
}

export async function getOutgoingRequests(username: string) {
  const normalizedUsername = username.toLowerCase().trim();
  const result = await sql`
    SELECT r.id, r.book_id, r.requester_username, r.owner_username, r.status, r.created_at,
           b.title, b.author, b.cover_url
    FROM requests r
    JOIN books b ON b.id = r.book_id
    WHERE r.requester_username = ${normalizedUsername}
    AND r.status IN ('pending', 'declined')
    ORDER BY r.created_at DESC
  `;
  return result.rows;
}

export async function deleteRequest(id: string, requesterUsername: string) {
  const requester = requesterUsername.toLowerCase().trim();
  const result = await sql`
    DELETE FROM requests
    WHERE id = ${id} AND requester_username = ${requester}
    RETURNING *
  `;
  return result.rows[0] || null;
}

// Retract a pending request by book (used from the library view where we
// don't have the request id handy).
export async function cancelRequestByBook(bookId: string, requesterUsername: string) {
  const requester = requesterUsername.toLowerCase().trim();
  const result = await sql`
    DELETE FROM requests
    WHERE book_id = ${bookId} AND requester_username = ${requester} AND status = 'pending'
    RETURNING *
  `;
  return result.rows[0] || null;
}

export async function getRequestById(id: string) {
  const result = await sql`
    SELECT r.*, b.title, b.author, b.cover_url
    FROM requests r
    JOIN books b ON b.id = r.book_id
    WHERE r.id = ${id}
  `;
  return result.rows[0] || null;
}

// ---- Comments & likes (book detail view) ----

export async function getComments(bookId: string, viewer: string, sort: 'top' | 'new') {
  const normalizedViewer = viewer?.toLowerCase().trim() || '';

  if (sort === 'top') {
    const result = await sql`
      SELECT c.id, c.book_id, c.username, c.body, c.is_spoiler, c.created_at,
        COUNT(cl.username)::int AS like_count,
        BOOL_OR(cl.username = ${normalizedViewer}) AS liked
      FROM comments c
      LEFT JOIN comment_likes cl ON cl.comment_id = c.id
      WHERE c.book_id = ${bookId}
      GROUP BY c.id
      ORDER BY like_count DESC, c.created_at DESC
    `;
    return result.rows;
  }

  const result = await sql`
    SELECT c.id, c.book_id, c.username, c.body, c.is_spoiler, c.created_at,
      COUNT(cl.username)::int AS like_count,
      BOOL_OR(cl.username = ${normalizedViewer}) AS liked
    FROM comments c
    LEFT JOIN comment_likes cl ON cl.comment_id = c.id
    WHERE c.book_id = ${bookId}
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;
  return result.rows;
}

export async function addComment(
  bookId: string,
  username: string,
  body: string,
  isSpoiler = false
) {
  const normalizedUsername = username.toLowerCase().trim();
  await getOrCreateUser(normalizedUsername);
  const result = await sql`
    INSERT INTO comments (book_id, username, body, is_spoiler)
    VALUES (${bookId}, ${normalizedUsername}, ${body}, ${isSpoiler})
    RETURNING id, book_id, username, body, is_spoiler, created_at
  `;
  return { ...result.rows[0], like_count: 0, liked: false };
}

export async function deleteComment(id: string, username: string) {
  const normalizedUsername = username.toLowerCase().trim();
  const result = await sql`
    DELETE FROM comments
    WHERE id = ${id} AND username = ${normalizedUsername}
    RETURNING id
  `;
  return result.rows[0] || null;
}

export async function toggleCommentLike(commentId: string, username: string) {
  const normalizedUsername = username.toLowerCase().trim();
  await getOrCreateUser(normalizedUsername);

  const existing = await sql`
    SELECT 1 FROM comment_likes
    WHERE comment_id = ${commentId} AND username = ${normalizedUsername}
  `;

  let liked: boolean;
  if (existing.rows.length > 0) {
    await sql`
      DELETE FROM comment_likes
      WHERE comment_id = ${commentId} AND username = ${normalizedUsername}
    `;
    liked = false;
  } else {
    await sql`
      INSERT INTO comment_likes (comment_id, username)
      VALUES (${commentId}, ${normalizedUsername})
      ON CONFLICT DO NOTHING
    `;
    liked = true;
  }

  const count = await sql`
    SELECT COUNT(*)::int AS like_count FROM comment_likes WHERE comment_id = ${commentId}
  `;
  return { liked, like_count: count.rows[0].like_count as number };
}

export async function updateRequestStatus(
  id: string,
  status: 'accepted' | 'declined',
  ownerUsername: string
) {
  const owner = ownerUsername.toLowerCase().trim();
  const result = await sql`
    UPDATE requests
    SET status = ${status}
    WHERE id = ${id} AND owner_username = ${owner}
    RETURNING *
  `;
  if (result.rows.length === 0) return null;

  const req = result.rows[0];

  // Accepting a request auto-lends the book to the requester so it moves into
  // the owner's "Lending Out" and the requester's "Borrowed" views.
  if (status === 'accepted') {
    await sql`
      UPDATE books
      SET lent_to_name = ${req.requester_username},
          borrower_username = ${req.requester_username},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${req.book_id} AND lent_to_name IS NULL
    `;
    // Any other pending requests for this now-lent book are auto-declined.
    await sql`
      UPDATE requests
      SET status = 'declined'
      WHERE book_id = ${req.book_id} AND status = 'pending' AND id != ${id}
    `;
  }

  // Requester email for notification
  const requesterRow = await sql`SELECT email FROM users WHERE username = ${req.requester_username}`;
  return {
    request: req,
    requesterEmail: (requesterRow.rows[0]?.email as string | null) ?? null,
  };
}
