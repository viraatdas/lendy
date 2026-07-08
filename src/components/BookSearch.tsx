'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleBook } from '@/lib/types';

interface BookSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBook: (book: {
    title: string;
    author: string;
    coverUrl: string | null;
    openLibraryKey: string;
  }) => void;
}

// Google Books returns http:// cover URLs; upgrade so they aren't blocked as
// mixed content on our https site.
const httpsCover = (url?: string | null): string | null =>
  url ? url.replace(/^http:\/\//i, 'https://') : null;

export default function BookSearch({ isOpen, onClose, onSelectBook }: BookSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (raw: string) => {
    const term = raw.trim();
    if (term.length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Cancel any in-flight request so only the latest one matters.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const myReqId = ++reqIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({ items: [] }));

      // Ignore stale responses (a newer keystroke already fired).
      if (myReqId !== reqIdRef.current) return;

      if (!res.ok) {
        setResults([]);
        setError(data?.error || 'Search is busy right now. Try again in a moment.');
      } else {
        setResults(Array.isArray(data.items) ? data.items : []);
        setError(null);
      }
    } catch {
      if (controller.signal.aborted || myReqId !== reqIdRef.current) return;
      setResults([]);
      setError('Could not reach search. Check your connection and try again.');
    } finally {
      if (myReqId === reqIdRef.current) setIsLoading(false);
    }
  }, []);

  // Debounced search as the user types.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => runSearch(query), 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  // Focus the input when opened; reset everything when closed.
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setQuery('');
      setResults([]);
      setError(null);
      setIsLoading(false);
      abortRef.current?.abort();
    }
  }, [isOpen]);

  const handleSelect = (book: GoogleBook) => {
    const coverUrl = httpsCover(
      book.volumeInfo.imageLinks?.thumbnail || book.volumeInfo.imageLinks?.smallThumbnail || null
    );

    onSelectBook({
      title: book.volumeInfo.title,
      author: book.volumeInfo.authors?.[0] || 'Unknown Author',
      coverUrl,
      openLibraryKey: book.id, // Using Google Books ID
    });

    setQuery('');
    setResults([]);
    onClose();
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const term = query.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-20 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#2d2d2d]/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl pixel-card">
        {/* Header */}
        <div className="p-4 border-b-4 border-[#2d2d2d] bg-[#ff6b9d]/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a book..."
              className="pixel-input flex-1 text-lg min-w-0"
            />
            {isLoading && <div className="text-xl float-animation">📚</div>}
            <button onClick={handleClose} className="pixel-btn text-sm">
              ✕
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {error ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-3">🛠️</div>
              <p className="text-[#888] mb-4">{error}</p>
              <button
                onClick={() => runSearch(query)}
                className="pixel-btn pixel-btn-pink text-sm"
              >
                🔄 Retry
              </button>
            </div>
          ) : results.length > 0 ? (
            <div>
              {results.map((book) => {
                const cover = httpsCover(book.volumeInfo.imageLinks?.smallThumbnail);
                return (
                  <button
                    key={book.id}
                    onClick={() => handleSelect(book)}
                    className="w-full flex gap-4 p-4 text-left hover:bg-[#ff6b9d]/10 transition-colors group border-b-2 border-[#eee] last:border-0"
                  >
                    {/* Cover */}
                    <div className="w-14 h-20 sm:w-12 sm:h-16 flex-shrink-0 bg-[#eee] border-2 border-[#2d2d2d] overflow-hidden">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt={book.volumeInfo.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          📖
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-base group-hover:text-[#ff6b9d] transition-colors line-clamp-1"
                        style={{ fontFamily: 'VT323, monospace' }}
                      >
                        {book.volumeInfo.title}
                      </h3>
                      <p className="text-sm text-[#888] line-clamp-1">
                        {book.volumeInfo.authors?.[0] || 'Unknown Author'}
                        {book.volumeInfo.publishedDate && (
                          <span className="text-[#aaa]">
                            {' '}
                            · {book.volumeInfo.publishedDate.substring(0, 4)}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Add indicator */}
                    <div className="flex-shrink-0 self-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-[#ff6b9d]">
                      ➕
                    </div>
                  </button>
                );
              })}
            </div>
          ) : term.length >= 2 && !isLoading ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">😢</div>
              <p className="text-[#888]">No books found for &ldquo;{term}&rdquo;</p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2 float-animation">📚</div>
              <p className="text-[#888]">Start typing to search...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
