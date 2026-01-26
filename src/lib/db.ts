import { sql } from '@vercel/postgres';

export async function initializeDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(255) PRIMARY KEY,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_books_owner ON books(owner_username);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_books_borrower ON books(borrower_username);
    `;

    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export async function getOrCreateUser(username: string) {
  const normalizedUsername = username.toLowerCase().trim();

  // Try to get existing user
  const existingUser = await sql`
    SELECT * FROM users WHERE username = ${normalizedUsername}
  `;

  if (existingUser.rows.length > 0) {
    return existingUser.rows[0];
  }

  // Create new user
  const newUser = await sql`
    INSERT INTO users (username) VALUES (${normalizedUsername})
    RETURNING *
  `;

  return newUser.rows[0];
}

export async function getUserBooks(username: string) {
  const normalizedUsername = username.toLowerCase().trim();

  // Books owned by user (not lent out)
  const owned = await sql`
    SELECT * FROM books
    WHERE owner_username = ${normalizedUsername}
    AND lent_to_name IS NULL
    ORDER BY created_at DESC
  `;

  // Books lent to others
  const lending = await sql`
    SELECT * FROM books
    WHERE owner_username = ${normalizedUsername}
    AND lent_to_name IS NOT NULL
    ORDER BY created_at DESC
  `;

  // Books borrowed from others
  const borrowed = await sql`
    SELECT * FROM books
    WHERE borrower_username = ${normalizedUsername}
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
  openLibraryKey: string
) {
  const normalizedUsername = username.toLowerCase().trim();

  const result = await sql`
    INSERT INTO books (title, author, cover_url, open_library_key, owner_username)
    VALUES (${title}, ${author}, ${coverUrl}, ${openLibraryKey}, ${normalizedUsername})
    RETURNING *
  `;

  return result.rows[0];
}

export async function lendBook(bookId: string, lentToName: string, borrowerUsername?: string) {
  const normalizedBorrower = borrowerUsername?.toLowerCase().trim() || null;

  const result = await sql`
    UPDATE books
    SET lent_to_name = ${lentToName}, borrower_username = ${normalizedBorrower}
    WHERE id = ${bookId}
    RETURNING *
  `;

  return result.rows[0];
}

export async function returnBook(bookId: string) {
  const result = await sql`
    UPDATE books
    SET lent_to_name = NULL, borrower_username = NULL
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
