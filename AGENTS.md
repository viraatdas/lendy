# AGENTS.md

Instructions for AI agents working in this repo. **This file is canonical.** There is no `CLAUDE.md`, and one should not be created: put agent guidance here so every tool reads the same file.

Lendy is a book lending library. Next.js 16 App Router, React 19, TypeScript, Tailwind v4, PostgreSQL on Neon via `@vercel/postgres`, deployed on Vercel at [lendy.viraat.dev](https://lendy.viraat.dev).

Read [README.md](README.md) first. It documents the architecture, the API surface, and the full style guide (visual language, copy tone, code conventions). Do not duplicate that content here. This file covers only what an agent needs that the README does not say.

## Things that will bite you

**There are no migrations.** `initializeDatabase()` in `src/lib/db.ts` is one idempotent block of `IF NOT EXISTS` statements, and **every API route calls it before touching data**. To add schema, add another idempotent statement there and confirm re-running it is a no op.

The blast radius is wider than it looks. `CREATE EXTENSION IF NOT EXISTS pg_trgm` sits at the top of that function, outside the inner try/catch, so if it ever fails then *every* route returns 500, not just search. It succeeds today as the non-superuser `neondb_owner` role on Neon. Verify before you move statements around in there.

**`findBooks()` must stay index-compatible.** Two constraints, both easy to undo by accident:

- Match on `LOWER(title)` / `LOWER(author)`, never `ILIKE` on the raw column. A `LOWER(...) gin_trgm_ops` index cannot serve `ILIKE`, and the whole OR then falls back to a sequential scan. Measured over 40k rows: 237 ms versus 0.23 ms.
- Use the word similarity operator `<%`, not `%`. `%` scores the query against the entire title, so a short query against a long title drops below the 0.3 threshold. `bhagvad gita` scored 0.212 against `The Bhagavad Gita (Classics of Indian Spirituality)` and returned nothing in production. `<%` scores the best matching extent instead and uses the same indexes.

Do not wrap the indexed column in `COALESCE`. `LOWER(COALESCE(author, ''))` is a different expression from the indexed `LOWER(author)`, so the index silently stops being used. `GREATEST` already ignores NULLs, so the `COALESCE` bought nothing.

**Two different searches, easy to confuse.** `/api/search` hits Google Books to find a book to add. `/api/find` searches other users' shelves in Postgres. They share nothing.

**`books.open_library_key` holds a Google Books volume id.** The column kept its name after the search backend changed.

**There is no auth.** The username lives in `localStorage` and is passed as a plain parameter. Anyone who knows a username can act as that user. Do not add features that assume the caller is who they claim to be without raising this first.

## Verifying database work

Never test schema or query changes against production. The pattern that works here, and that caught both bugs in PR #1:

1. `vercel env pull` to get `POSTGRES_URL_NON_POOLING`.
2. `CREATE DATABASE` a throwaway on the same Neon instance, then connect to it by swapping the pathname on the connection URL.
3. Recreate the tables, seed with realistic data. Reading real rows from production is fine and often necessary, since bugs like the `<%` one only show up against real title lengths. Reading is safe; writing is not.
4. Assert on behavior *and* on `EXPLAIN ANALYZE`. A query can return correct rows while using no index at all, which is exactly how the dead indexes shipped.
5. `DROP DATABASE` in a `finally` block.

Seed to roughly 40k rows before trusting a query plan. Postgres picks a sequential scan on a 98 row table no matter how good the index is, so a small fixture proves nothing about index usage.

## Checks before pushing

```bash
npm run build   # also type checks
npm run lint
```

Both must be clean. `npm run lint` reports 2 pre-existing `@next/next/no-img-element` warnings in `AddBookModal.tsx` and `BookCard.tsx`. That is the expected baseline, not something you introduced.

There is no test suite. Behavioral verification against a running app or a scratch database is the substitute, so say in the PR how you verified.

## Shipping

Pushing to `main` auto-deploys to production on Vercel. There is no migration step.

Merged, pushed, and deployed are three different states. Verify the live URL before calling something deployed, and prefer a check that can only pass with your change present. For search work, `curl 'https://lendy.viraat.dev/api/find?q=bhagvad%20gita&viewer=probe'` returning a book proves the fix is live in a way that a green build does not.

## Writing

No em dashes in prose. Restructure with commas, colons, or parentheses rather than swapping in a hyphen. Check with `grep -n "—\|–"` before committing, since they slip in easily.

Interface copy is plain and warm, sentence case, no exclamation marks. See the style guide in the README.

## Repo hygiene

`.gitignore` excludes rudder's scratch files (`.rudder/`, `RUDDER.md`, `DECISIONS.md`, and friends). Rudder rewrites some of these while you work, including `.gitignore` itself, so re-read that file immediately before editing it rather than trusting a copy you read earlier.

`RUDDER.md` is generated and wrapped in `RUDDER_GENERATED_START/END` markers. Anything written inside those markers is overwritten on the next regeneration. Durable notes go below the end marker.
