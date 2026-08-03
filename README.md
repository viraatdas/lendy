# Lendy

A cozy pixel-art library for the books you own, the ones you have lent out, and the ones you keep meaning to give back.

Lendy answers one question that a spreadsheet never quite does: *who has my copy?* Add books to your shelf, lend them to a friend, browse what other readers have, and ask to borrow. Live at **[lendy.viraat.dev](https://lendy.viraat.dev)**.

## Features

- **Your shelf.** Add books by searching Google Books, then track them across three states: owned, lent out, and borrowed from someone else.
- **Lending.** Mark a book as lent to a name, and mark it returned when it comes home.
- **Readers.** Browse everyone else on Lendy, see their shelf, and view their most recent activity.
- **Find a book.** Search across every public shelf at once. The search is typo tolerant, so `bhagvad gita` still finds *The Bhagavad Gita*.
- **Requests.** Ask an owner to borrow a book. They get an email and can accept or decline.
- **Comments.** Talk about a book on its page, with spoiler tags and likes.

## Quick start

You need Node 20 or newer and a PostgreSQL database. The app is built for [Neon](https://neon.tech) via `@vercel/postgres`, which is what Vercel provisions by default.

```bash
npm install
vercel env pull .env.local   # or write it by hand, see the table below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Pick any username to sign in. There is no password, see [Identity](#identity) for why.

### Environment variables

Only the database URL is required. Everything else degrades gracefully when unset.

| Variable | Required | What it does |
| --- | --- | --- |
| `POSTGRES_URL` | Yes | Neon connection string. `vercel env pull` writes this for you. |
| `GOOGLE_BOOKS_API_KEY` | No | Raises the Google Books rate limit. Search works without it, just with a smaller quota. |
| `RESEND_API_KEY` | No | Sends borrow request and contact emails through [Resend](https://resend.com). Without it, emails are skipped and logged. |
| `RESEND_FROM` | No | Sender address. Defaults to `Lendy <onboarding@resend.dev>`. |
| `NEXT_PUBLIC_APP_URL` | No | Base URL used in email links. Falls back to `VERCEL_URL`. |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | Enables PostHog analytics. Analytics are off when unset. |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | PostHog host, if you self host. |

If the project is linked to Vercel, `vercel env pull .env.local` fills all of these in one step.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on port 3000. |
| `npm run build` | Production build. Also type checks. |
| `npm start` | Serves the production build. |
| `npm run lint` | ESLint with the Next.js core web vitals and TypeScript configs. |

## How it works

### Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, and PostgreSQL through `@vercel/postgres`. Deployed on Vercel. No ORM and no state management library: the app is small enough that plain SQL and `useState` are the right size.

### Identity

There is no authentication. You type a username, it goes in `localStorage` under `lendy_username`, and it is sent as a query parameter or body field on API calls. Usernames are lowercased and trimmed before they touch the database.

This is deliberate for a small library among people who know each other, but it means **anyone who knows your username can act as you**. Do not put anything private in Lendy. Adding real auth is the obvious next step if this ever grows past friends and family.

Deleting a profile is a soft delete: it sets `users.deleted_at`, and every query joins with `deleted_at IS NULL`, so a deletion can be undone without losing the shelf.

### Schema bootstrap

There are no migration files. Every API route calls `initializeDatabase()` before touching data, and that function is a single idempotent block of `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and `CREATE INDEX IF NOT EXISTS` statements. Deploying new schema means adding another idempotent statement to that function.

This is unusual, and worth knowing before you change it. It keeps deploys to a single `git push` with no migration step, at the cost of a few extra statements per request. If you add a table or column, add it there, and make sure re-running it is a no op.

### Data model

| Table | Holds |
| --- | --- |
| `users` | Username as primary key, optional email and contact message, `deleted_at` for soft deletes. |
| `books` | Title, author, cover, and `owner_username`. `lent_to_name` is set when lent out, `borrowed_from_name` when the book belongs to someone else. Note that `open_library_key` holds a **Google Books** volume id: the column kept its name after the search backend changed. |
| `requests` | A borrow request between a requester and an owner, with status `pending`, `accepted`, or `declined`. |
| `comments` | Book comments, with a spoiler flag. |
| `comment_likes` | Join table keyed on comment and username. |

### Search

Two different searches, easy to confuse:

- `GET /api/search` queries **Google Books** to find a book to add to your shelf. Results are cached in memory for 10 minutes and retried once on failure, because typing fires a lot of requests.
- `GET /api/find` queries **other people's shelves** in Postgres. It combines substring matching with `pg_trgm` word similarity, so small misspellings still match. Exact titles rank first, then substring hits, then fuzzy hits by similarity, with available books always above lent ones.

`/api/find` matches on `LOWER(title)` and `LOWER(author)` rather than `ILIKE` on the raw columns, so both arms can use the GIN trigram indexes. Keep it that way if you edit the query, or it silently falls back to a sequential scan.

### API routes

All routes live under `src/app/api` and return JSON.

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/user` | GET, POST, DELETE | Fetch a profile, create a user or update the profile, soft delete. |
| `/api/books` | GET, POST | List a user's shelf, add a book. |
| `/api/books/[id]` | PATCH, DELETE | Lend, return, or remove a book. |
| `/api/readers` | GET | The reader directory with counts and last activity. |
| `/api/library` | GET | One reader's public shelf. |
| `/api/find` | GET | Typo tolerant search across all shelves. |
| `/api/search` | GET | Google Books lookup for adding a book. |
| `/api/synopsis` | GET | Description and metadata for one volume. |
| `/api/requests` | GET, POST, DELETE | Borrow requests in both directions. |
| `/api/requests/[id]` | PATCH, DELETE | Accept, decline, or cancel a request. |
| `/api/comments` | GET, POST | Comments on a book. |
| `/api/comments/[id]` | DELETE | Delete your own comment. |
| `/api/comments/[id]/like` | POST | Toggle a like. |
| `/api/messages` | POST | Contact a reader by email. |

### Project layout

```
src/
  app/
    api/          Route handlers, one folder per resource
    layout.tsx    Fonts, metadata, PostHog provider
    page.tsx      Username gate, then the bookshelf
    globals.css   Design tokens and the pixel-* utility classes
  components/     All UI. Client components, one per file
  lib/
    db.ts         Every SQL query in the app
    email.ts      Resend wrapper, no ops without an API key
    types.ts      Shared interfaces
```

## Style guide

### Visual language

The look is cozy pixel art: warm cream paper, hard black borders, and offset shadows with no blur. Nothing is rounded and nothing fades.

**Colors.** Defined as CSS variables in `globals.css`.

| Token | Value | Used for |
| --- | --- | --- |
| `--background` | `#fdf6e3` | Page background, warm cream |
| `--foreground` | `#2d2d2d` | Text, borders, shadows |
| `--accent` | `#ff6b9d` | Primary actions, focus rings, pink |
| `--accent-secondary` | `#7c5cff` | Secondary highlights, violet |
| | `#4ade80` | Available or success green |
| | `#ef4444` | Destructive red |
| | `#ffd700` | Stars and small celebrations |

**Type.** Two fonts, and the choice between them carries meaning. `Silkscreen` is for labels, buttons, and headings, anything short and structural. `VT323` is for body copy and anything a person wrote, including titles and comments. `Geist` is loaded for the sans fallback. Fonts are applied inline with `style={{ fontFamily: 'Silkscreen, cursive' }}` because they are outside the Tailwind theme.

**Shadows.** Always hard offset, never blurred: `box-shadow: 6px 6px 0 #2d2d2d`. Depth comes from the offset, and hover moves the element up and to the left while growing the shadow. Reduce shadow sizes below 640px, and disable hover transforms under `@media (hover: none)` so touch devices do not stick in a hover state.

**Reusable classes.** Prefer these over rebuilding the effect in Tailwind: `pixel-btn` and `pixel-btn-pink` for buttons, `pixel-card` for surfaces, `pixel-input` for fields, `pixel-border` for framing, `pixel-divider` for section breaks. Add a new `pixel-*` class in `globals.css` when a pattern shows up three times.

**Layout.** Tailwind utilities for everything structural: spacing, flex, grid, sizing. Reach for `globals.css` only for the pixel effects that Tailwind cannot express cleanly.

### Writing

Interface copy is plain and warm, sentence case, no exclamation marks. Say "No books yet" rather than "You have no books at this time." Errors say what happened and what to do next: "Book search is busy right now. Please try again in a moment."

Emoji are used sparingly, as icons in confirmation dialogs and empty states, not as decoration in headers.

### Code

**Components.** Client components, `'use client'` at the top, one component per file, default export. Props go in an `interface XProps` declared directly above the component. Local state with `useState`, and `useCallback` or `useMemo` only when something downstream actually depends on the identity of the value.

**Naming.** Database columns and the JSON that comes straight from them stay `snake_case`, since it is a direct passthrough of the row. Everything crossing into React props and local variables is `camelCase`. Do not rename mid layer, convert at the boundary or not at all.

**SQL.** Every query lives in `src/lib/db.ts`, exported as a named async function. Use the `sql` tagged template so values are parameterized. Never build a query by string concatenation. Interpolate user input as a value, never as an identifier or an operator.

**Route handlers.** Every one follows the same shape:

```ts
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    // validate inputs, return 400 with { error } if they are missing
    // call into src/lib/db.ts
    return NextResponse.json({ books });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 });
  }
}
```

Errors are always `{ error: string }` with a real status code. The message is safe to show a user, so keep the details in `console.error` and keep the response generic.

**External services.** Anything outside the app can fail, and a failure there should not take a page down. Google Books calls get an 8 second `AbortController` timeout, one retry, an in memory cache, and fall back to stale results before they fall back to an error. Email no ops with a warning when `RESEND_API_KEY` is missing. Follow that pattern for anything new.

**Comments.** Explain why, not what. The code already says what it does. A comment earns its place when it records a decision that is not obvious from reading the lines around it, like why a query avoids `ILIKE` or why a cache exists.

**Types.** Shared interfaces go in `src/lib/types.ts`. Avoid `any`. Prefer deriving from existing types with `Pick` or `extends` over redeclaring a shape.

## Deploying

Pushing to `main` deploys to production on Vercel automatically. There is no migration step, since `initializeDatabase()` runs on the first request after deploy.

```bash
vercel env pull .env.local   # sync environment variables
npm run build                # verify locally before pushing
```

## Contributing

Branch off `main`, keep the change focused, and open a PR. Before pushing, run `npm run build` and `npm run lint`. Both should be clean, and the build type checks, so a green build means the types are good.

If your change touches `findBooks` or `initializeDatabase`, say in the PR how you verified it. Those two functions affect every route in the app.
