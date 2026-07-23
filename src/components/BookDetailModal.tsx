'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Comment, BookSynopsis } from '@/lib/types';

interface BookDetailModalProps {
  isOpen: boolean;
  book: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
    open_library_key: string; // Google Books volume id
  } | null;
  currentUsername: string;
  /** Set when this book belongs to someone else — enables the borrow CTA. */
  ownerUsername?: string | null;
  /** False when the owner has already lent the book out. */
  available?: boolean;
  /** Whether the viewer has a pending request on this book. */
  isRequested?: boolean;
  /** Called after a request is sent or retracted so the parent can refresh. */
  onRequestChange?: () => void;
  onClose: () => void;
}

type SortMode = 'top' | 'new';

// Strip HTML tags and decode a few common entities to plain text.
function stripHtml(html: string): string {
  const withoutTags = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');
  return withoutTags
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Relative timestamp: "just now", "5m", "3h", "2d", else a date.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const READ_MORE_THRESHOLD = 600;

// Palette for comment usernames — deterministic per name.
const USERNAME_COLORS = ['#ff6b9d', '#7c5cff', '#60a5fa', '#4ade80', '#e0982f'];
function usernameColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return USERNAME_COLORS[hash % USERNAME_COLORS.length];
}

export default function BookDetailModal({
  isOpen,
  book,
  currentUsername,
  ownerUsername = null,
  available = true,
  isRequested = false,
  onRequestChange,
  onClose,
}: BookDetailModalProps) {
  const [synopsis, setSynopsis] = useState<BookSynopsis | null>(null);
  const [synopsisLoading, setSynopsisLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>('top');

  const [draft, setDraft] = useState('');
  const [draftSpoiler, setDraftSpoiler] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const [requestBusy, setRequestBusy] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const reveal = useCallback((id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const bookId = book?.id ?? null;
  const volumeId = book?.open_library_key ?? null;

  // --- Synopsis fetch ---
  useEffect(() => {
    if (!isOpen || !volumeId) return;
    let cancelled = false;
    setSynopsis(null);
    setExpanded(false);
    setSynopsisLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/synopsis?volumeId=${encodeURIComponent(volumeId)}`
        );
        if (!res.ok) {
          if (!cancelled) setSynopsis(null);
          return;
        }
        const json: BookSynopsis = await res.json();
        if (!cancelled) setSynopsis(json);
      } catch {
        if (!cancelled) setSynopsis(null);
      } finally {
        if (!cancelled) setSynopsisLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, volumeId]);

  // --- Comments fetch ---
  const fetchComments = useCallback(async () => {
    if (!bookId) return;
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const res = await fetch(
        `/api/comments?bookId=${encodeURIComponent(
          bookId
        )}&viewer=${encodeURIComponent(currentUsername)}&sort=${encodeURIComponent(
          sort
        )}`
      );
      if (!res.ok) {
        setCommentsError('Could not load comments right now.');
        setComments([]);
        return;
      }
      const json: { comments: Comment[] } = await res.json();
      setComments(Array.isArray(json.comments) ? json.comments : []);
    } catch {
      setCommentsError('Could not load comments right now.');
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [bookId, currentUsername, sort]);

  useEffect(() => {
    if (!isOpen || !bookId) return;
    fetchComments();
  }, [isOpen, bookId, fetchComments]);

  // Reset transient input state on (re)open / book change.
  useEffect(() => {
    if (isOpen) {
      setDraft('');
      setDraftSpoiler(false);
      setPostError(null);
      setPosting(false);
      setRevealed(new Set());
      setRequestError(null);
      setRequestBusy(false);
    }
  }, [isOpen, bookId]);

  // --- Request / retract this book from its owner ---
  const canBorrow = !!ownerUsername && ownerUsername !== currentUsername;

  const toggleRequest = useCallback(async () => {
    if (!bookId || requestBusy) return;
    setRequestBusy(true);
    setRequestError(null);
    try {
      const res = await fetch('/api/requests', {
        method: isRequested ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, requesterUsername: currentUsername }),
      });
      if (!res.ok) {
        let msg = isRequested
          ? 'Could not retract that request.'
          : 'Could not send that request.';
        try {
          const err = await res.json();
          if (err?.error) msg = err.error;
        } catch {
          /* ignore parse error */
        }
        setRequestError(msg);
        return;
      }
      onRequestChange?.();
    } catch {
      setRequestError('Something went wrong. Try again.');
    } finally {
      setRequestBusy(false);
    }
  }, [bookId, isRequested, requestBusy, currentUsername, onRequestChange]);

  // --- Post a comment ---
  const handlePost = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const body = draft.trim();
      if (!bookId || !body || posting) return;
      setPosting(true);
      setPostError(null);
      try {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId,
            username: currentUsername,
            body,
            isSpoiler: draftSpoiler,
          }),
        });
        if (!res.ok) {
          let msg = 'Could not post comment.';
          try {
            const err = await res.json();
            if (err?.error) msg = err.error;
          } catch {
            /* ignore parse error */
          }
          setPostError(msg);
          return;
        }
        setDraft('');
        setDraftSpoiler(false);
        await fetchComments();
      } catch {
        setPostError('Could not post comment. Try again.');
      } finally {
        setPosting(false);
      }
    },
    [draft, draftSpoiler, bookId, posting, currentUsername, fetchComments]
  );

  // --- Toggle like ---
  const handleLike = useCallback(
    async (comment: Comment) => {
      try {
        const res = await fetch(
          `/api/comments/${encodeURIComponent(comment.id)}/like`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUsername }),
          }
        );
        if (!res.ok) return;
        const json: { liked: boolean; like_count: number } = await res.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.id
              ? { ...c, liked: json.liked, like_count: json.like_count }
              : c
          )
        );
      } catch {
        /* ignore network error, leave state unchanged */
      }
    },
    [currentUsername]
  );

  // --- Delete own comment ---
  const handleDelete = useCallback(
    async (comment: Comment) => {
      try {
        const res = await fetch(
          `/api/comments/${encodeURIComponent(comment.id)}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUsername }),
          }
        );
        if (!res.ok && res.status !== 404) return;
        setComments((prev) => prev.filter((c) => c.id !== comment.id));
      } catch {
        /* ignore network error */
      }
    },
    [currentUsername]
  );

  const description = useMemo(
    () => (synopsis?.description ? stripHtml(synopsis.description) : ''),
    [synopsis]
  );
  const isLong = description.length > READ_MORE_THRESHOLD;
  const shownDescription =
    isLong && !expanded
      ? description.slice(0, READ_MORE_THRESHOLD).trimEnd() + '…'
      : description;

  const chips = useMemo(() => {
    if (!synopsis) return [] as string[];
    const out: string[] = [];
    if (synopsis.pageCount) out.push(`📄 ${synopsis.pageCount} pages`);
    if (synopsis.publishedDate) {
      const year = synopsis.publishedDate.slice(0, 4);
      if (/^\d{4}$/.test(year)) out.push(`📅 ${year}`);
    }
    if (synopsis.publisher) out.push(`🏢 ${synopsis.publisher}`);
    (synopsis.categories || []).slice(0, 2).forEach((cat) => {
      if (cat) out.push(`🏷️ ${cat}`);
    });
    if (synopsis.averageRating != null) {
      const count = synopsis.ratingsCount
        ? ` (${synopsis.ratingsCount.toLocaleString()})`
        : '';
      out.push(`⭐ ${synopsis.averageRating}${count}`);
    }
    return out;
  }, [synopsis]);

  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden pixel-pattern bg-[#fdf6e3]">
      {/* Header */}
      <header className="border-b-4 border-[#2d2d2d] bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="pixel-btn text-sm whitespace-nowrap"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl">📖</span>
              <h1
                className="text-lg sm:text-2xl truncate"
                style={{ fontFamily: 'Silkscreen, cursive' }}
              >
                {book.title}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        className={`max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 ${
          canBorrow && available ? 'pb-28 sm:pb-8' : ''
        }`}
      >
        {/* Hero */}
        <section className="flex flex-col sm:flex-row gap-5 sm:gap-6">
          <div className="w-40 sm:w-48 shrink-0 mx-auto sm:mx-0">
            <div className="relative aspect-[2/3] w-full overflow-hidden pixel-card">
              {book.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#ff6b9d]/20 to-[#7c5cff]/20">
                  <div className="text-center px-3">
                    <div className="text-4xl mb-2">📖</div>
                    <p className="text-xs text-[#666] leading-tight line-clamp-4">
                      {book.title}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
            <h2
              className="text-2xl sm:text-3xl leading-tight"
              style={{ fontFamily: 'Silkscreen, cursive' }}
            >
              {book.title}
            </h2>
            <p
              className="text-xl text-[#7c5cff]"
              style={{ fontFamily: 'VT323, monospace' }}
            >
              by {book.author}
            </p>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                {chips.map((chip, i) => (
                  <span
                    key={i}
                    className="pixel-card px-3 py-1 text-sm bg-[#ffd700]/20"
                    style={{ fontFamily: 'VT323, monospace' }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Borrow this book — the request lives here, not on the shelf grid */}
        {canBorrow && (
          <section
            className={`pixel-card p-4 sm:p-5 ${
              !available
                ? 'bg-[#888]/10'
                : isRequested
                  ? 'bg-[#4ade80]/15'
                  : 'bg-[#ff6b9d]/10'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p
                  className="text-lg"
                  style={{ fontFamily: 'VT323, monospace' }}
                >
                  {!available ? (
                    <>📕 Currently lent out by </>
                  ) : isRequested ? (
                    <>⏳ Waiting on </>
                  ) : (
                    <>📗 On the shelf of </>
                  )}
                  <span
                    className="text-[#7c5cff]"
                    style={{ fontFamily: 'Silkscreen, cursive' }}
                  >
                    {ownerUsername}
                  </span>
                </p>
                <p className="text-sm text-[#888] mt-1">
                  {!available
                    ? 'Check back once it makes its way home.'
                    : isRequested
                      ? `${ownerUsername} has been emailed — you'll hear back soon.`
                      : `Ask ${ownerUsername} to lend it to you. They'll get an email.`}
                </p>
              </div>

              {available && (
                <button
                  type="button"
                  onClick={toggleRequest}
                  disabled={requestBusy}
                  className={`w-full sm:w-auto shrink-0 min-h-[48px] px-6 text-sm disabled:opacity-50 ${
                    isRequested ? 'pixel-btn bg-[#4ade80]/40' : 'pixel-btn pixel-btn-pink'
                  }`}
                >
                  {requestBusy
                    ? '...'
                    : isRequested
                      ? '↩ Retract request'
                      : '🙋 Request to borrow'}
                </button>
              )}
            </div>

            {requestError && (
              <p
                className="mt-3 text-base text-[#ef4444] text-center sm:text-left"
                style={{ fontFamily: 'VT323, monospace' }}
              >
                {requestError}
              </p>
            )}
          </section>
        )}

        {/* Synopsis */}
        <section className="pixel-card p-4 sm:p-6">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-2xl">📝</span>
            <h3 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
              Synopsis
            </h3>
            <div className="flex-1 pixel-divider" />
          </div>

          {synopsisLoading ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3 float-animation">📖</div>
              <p className="text-lg text-[#666]">Loading synopsis...</p>
            </div>
          ) : description ? (
            <div>
              <p
                className="text-lg leading-relaxed text-[#555] whitespace-pre-wrap"
                style={{ fontFamily: 'VT323, monospace' }}
              >
                {shownDescription}
              </p>
              {isLong && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-3 text-base text-[#ff6b9d] underline underline-offset-2"
                  style={{ fontFamily: 'VT323, monospace' }}
                >
                  {expanded ? 'Read less ▲' : 'Read more ▼'}
                </button>
              )}
            </div>
          ) : (
            <p
              className="text-lg text-[#888]"
              style={{ fontFamily: 'VT323, monospace' }}
            >
              No synopsis available for this book.
            </p>
          )}
        </section>

        {/* Comments */}
        <section className="pixel-card p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <span className="text-2xl">💬</span>
            <h3 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
              Comments
            </h3>
            <span className="pixel-card px-3 py-1 text-sm bg-[#7c5cff]/20">
              {comments.length}
            </span>
            <div className="flex-1" />
            <div className="flex gap-2">
              <button
                onClick={() => setSort('top')}
                className={`pixel-btn text-xs ${
                  sort === 'top' ? 'pixel-btn-pink' : ''
                }`}
              >
                🔥 Top
              </button>
              <button
                onClick={() => setSort('new')}
                className={`pixel-btn text-xs ${
                  sort === 'new' ? 'pixel-btn-pink' : ''
                }`}
              >
                🆕 Newest
              </button>
            </div>
          </div>

          {/* Add comment */}
          <form onSubmit={handlePost} className="mb-6 space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Share your thoughts on this book..."
              rows={2}
              className="pixel-input w-full"
            />
            {postError && (
              <p className="text-sm text-[#ef4444]">{postError}</p>
            )}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setDraftSpoiler((v) => !v)}
                aria-pressed={draftSpoiler}
                className={`text-sm px-3 py-2 border-2 border-[#2d2d2d] transition-colors ${
                  draftSpoiler ? 'bg-[#ffd700] text-[#2d2d2d]' : 'bg-white text-[#888]'
                }`}
                style={{ fontFamily: 'Silkscreen, cursive' }}
                title="Mark this comment as a spoiler"
              >
                {draftSpoiler ? '⚠️ Spoiler ✓' : '⚠️ Mark as spoiler'}
              </button>
              <button
                type="submit"
                disabled={posting || !draft.trim()}
                className="pixel-btn pixel-btn-pink text-sm disabled:opacity-50"
              >
                {posting ? 'Posting...' : '💬 Post'}
              </button>
            </div>
          </form>

          {/* List */}
          {commentsLoading ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3 float-animation">💬</div>
              <p className="text-lg text-[#666]">Loading comments...</p>
            </div>
          ) : commentsError ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">😢</div>
              <p className="text-lg text-[#666]">{commentsError}</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p
                className="text-lg text-[#888]"
                style={{ fontFamily: 'VT323, monospace' }}
              >
                💬 No comments yet — be the first!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="pixel-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span
                        className="text-sm truncate"
                        style={{
                          fontFamily: 'Silkscreen, cursive',
                          color: usernameColor(c.username),
                        }}
                      >
                        {c.username}
                      </span>
                      {c.is_spoiler && (
                        <span
                          className="text-[10px] px-2 py-0.5 border-2 border-[#2d2d2d] bg-[#ffd700]/40 text-[#8a6d00] whitespace-nowrap"
                          style={{ fontFamily: 'Silkscreen, cursive' }}
                        >
                          ⚠️ Spoiler
                        </span>
                      )}
                      <span className="text-xs text-[#aaa] whitespace-nowrap">
                        {timeAgo(c.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleLike(c)}
                        className="text-sm whitespace-nowrap active:scale-95 transition-transform"
                        style={{ fontFamily: 'VT323, monospace' }}
                        aria-label={c.liked ? 'Unlike' : 'Like'}
                      >
                        {c.liked ? '❤️' : '🤍'} {c.like_count}
                      </button>
                      {c.username === currentUsername && (
                        <button
                          onClick={() => handleDelete(c)}
                          className="text-sm text-[#ef4444] leading-none px-1"
                          aria-label="Delete comment"
                          title="Delete"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  {c.is_spoiler &&
                  c.username !== currentUsername &&
                  !revealed.has(c.id) ? (
                    <button
                      type="button"
                      onClick={() => reveal(c.id)}
                      className="mt-2 w-full text-left px-3 py-3 border-2 border-dashed border-[#2d2d2d] bg-[#2d2d2d]/5 hover:bg-[#ffd700]/15 transition-colors"
                      style={{ fontFamily: 'VT323, monospace' }}
                      title="Click to reveal spoiler"
                    >
                      <span className="text-base text-[#888]">
                        ⚠️ Spoiler hidden — tap to reveal
                      </span>
                    </button>
                  ) : (
                    <p
                      className="mt-2 text-lg text-[#444] whitespace-pre-wrap break-words"
                      style={{ fontFamily: 'VT323, monospace' }}
                    >
                      {c.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bottom back */}
        <div className="text-center">
          <button onClick={onClose} className="pixel-btn">
            ← Back
          </button>
        </div>
      </main>

      {/* Sticky request bar (mobile only) so the CTA is always in reach */}
      {canBorrow && available && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 border-t-4 border-[#2d2d2d] bg-white/95 backdrop-blur-sm px-4 py-3">
          <button
            type="button"
            onClick={toggleRequest}
            disabled={requestBusy}
            className={`w-full min-h-[48px] text-sm disabled:opacity-50 ${
              isRequested ? 'pixel-btn bg-[#4ade80]/40' : 'pixel-btn pixel-btn-pink'
            }`}
          >
            {requestBusy
              ? '...'
              : isRequested
                ? '↩ Retract request'
                : `🙋 Request from ${ownerUsername}`}
          </button>
        </div>
      )}
    </div>
  );
}
