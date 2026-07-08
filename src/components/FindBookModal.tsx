'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface FoundBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  open_library_key: string;
  owner_username: string;
  lent_to_name: string | null;
  requested: boolean;
}

interface FindBookModalProps {
  isOpen: boolean;
  currentUsername: string;
  onClose: () => void;
  onOpenBook: (book: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
    open_library_key: string;
  }) => void;
  onOpenReader: (username: string) => void;
}

export default function FindBookModal({
  isOpen,
  currentUsername,
  onClose,
  onOpenBook,
  onOpenReader,
}: FindBookModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const reqIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(
    async (raw: string) => {
      const term = raw.trim();
      if (term.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      const myReqId = ++reqIdRef.current;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/find?q=${encodeURIComponent(term)}&viewer=${encodeURIComponent(currentUsername)}`
        );
        const data = await res.json().catch(() => ({ books: [] }));
        if (myReqId !== reqIdRef.current) return;
        setResults(Array.isArray(data.books) ? data.books : []);
      } catch {
        if (myReqId === reqIdRef.current) setResults([]);
      } finally {
        if (myReqId === reqIdRef.current) setLoading(false);
      }
    },
    [currentUsername]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setQuery('');
      setResults([]);
      setLoading(false);
    }
  }, [isOpen]);

  const setRequested = (id: string, value: boolean) =>
    setResults((prev) => prev.map((b) => (b.id === id ? { ...b, requested: value } : b)));

  const handleRequest = async (book: FoundBook) => {
    setBusyId(book.id);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id, requesterUsername: currentUsername }),
      });
      if (res.ok) setRequested(book.id, true);
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  };

  const handleRetract = async (book: FoundBook) => {
    setBusyId(book.id);
    try {
      await fetch('/api/requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id, requesterUsername: currentUsername }),
      });
      setRequested(book.id, false);
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  };

  if (!isOpen) return null;

  const term = query.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-20 px-4">
      <div className="absolute inset-0 bg-[#2d2d2d]/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl pixel-card max-h-[85vh] flex flex-col">
        {/* Header / search */}
        <div className="p-4 border-b-4 border-[#2d2d2d] bg-[#60a5fa]/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔎</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a book across all readers..."
              className="pixel-input flex-1 text-lg min-w-0"
            />
            {loading && <div className="text-xl float-animation">📚</div>}
            <button onClick={onClose} className="pixel-btn text-sm">
              ✕
            </button>
          </div>
          <p className="text-base text-[#555] mt-2" style={{ fontFamily: 'VT323, monospace' }}>
            Search everyone&apos;s shelves and request what you find.
          </p>
        </div>

        {/* Results */}
        <div className="overflow-y-auto">
          {results.length > 0 ? (
            <div>
              {results.map((book) => {
                const available = !book.lent_to_name;
                return (
                  <div
                    key={book.id}
                    className="flex gap-4 p-4 border-b-2 border-[#eee] last:border-0"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenBook(book)}
                      title="View details & comments"
                      className="w-14 h-20 flex-shrink-0 bg-[#eee] border-2 border-[#2d2d2d] overflow-hidden"
                    >
                      {book.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          📖
                        </div>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenBook(book)}
                        className="text-left w-full"
                      >
                        <h3
                          className="text-base line-clamp-1 hover:text-[#7c5cff] transition-colors"
                          style={{ fontFamily: 'VT323, monospace' }}
                        >
                          {book.title}
                        </h3>
                      </button>
                      <p className="text-sm text-[#888] line-clamp-1">{book.author}</p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onOpenReader(book.owner_username)}
                          title={`Open ${book.owner_username}'s library`}
                          className="text-base text-[#7c5cff] hover:text-[#ff6b9d] underline underline-offset-2 decoration-2 transition-colors"
                          style={{ fontFamily: 'Silkscreen, cursive' }}
                        >
                          👤 {book.owner_username}
                        </button>
                        {available ? (
                          <span
                            className="text-[10px] px-2 py-0.5 border-2 border-[#2d2d2d] bg-[#4ade80]/25 text-[#2d7d46]"
                            style={{ fontFamily: 'Silkscreen, cursive' }}
                          >
                            Available
                          </span>
                        ) : (
                          <span
                            className="text-[10px] px-2 py-0.5 border-2 border-[#2d2d2d] bg-[#888]/20 text-[#666]"
                            style={{ fontFamily: 'Silkscreen, cursive' }}
                          >
                            Lent out
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 self-center">
                      {!available ? (
                        <span className="text-xs text-[#aaa]">—</span>
                      ) : book.requested ? (
                        <button
                          type="button"
                          onClick={() => handleRetract(book)}
                          disabled={busyId === book.id}
                          className="pixel-btn text-xs bg-[#4ade80]/40 disabled:opacity-50 group/r"
                          title="Retract request"
                        >
                          <span className="group-hover/r:hidden">✓ Requested</span>
                          <span className="hidden group-hover/r:inline">↩ Retract</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRequest(book)}
                          disabled={busyId === book.id}
                          className="pixel-btn pixel-btn-pink text-xs disabled:opacity-50"
                        >
                          {busyId === book.id ? '...' : '🙋 Request'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : term.length >= 2 && !loading ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">🕵️</div>
              <p className="text-[#888]">
                No reader has &ldquo;{term}&rdquo; yet.
              </p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2 float-animation">🔎</div>
              <p className="text-[#888]">Type a title or author to find who has it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
