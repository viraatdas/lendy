'use client';

import { useState, useEffect, useRef } from 'react';
import { OpenLibraryBook } from '@/lib/types';

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

export default function BookSearch({ isOpen, onClose, onSelectBook }: BookSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpenLibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search as user types
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        // Limit to 5 results for typeahead
        setResults((data.docs || []).slice(0, 5));
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (book: OpenLibraryBook) => {
    const coverUrl = book.cover_i
      ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
      : null;

    onSelectBook({
      title: book.title,
      author: book.author_name?.[0] || 'Unknown Author',
      coverUrl,
      openLibraryKey: book.key,
    });

    setQuery('');
    setResults([]);
    onClose();
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white shadow-2xl">
        {/* Search Input */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-gray-300 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a book..."
              className="flex-1 text-base font-light text-black placeholder-gray-300 focus:outline-none bg-transparent"
            />
            {isLoading && (
              <div className="w-4 h-4 border border-gray-300 border-t-transparent rounded-full animate-spin" />
            )}
            <button
              onClick={handleClose}
              className="text-gray-300 hover:text-black transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Results */}
        {(results.length > 0 || (query.trim().length >= 2 && !isLoading)) && (
          <div className="max-h-80 overflow-y-auto">
            {results.length > 0 ? (
              <div>
                {results.map((book) => (
                  <button
                    key={book.key}
                    onClick={() => handleSelect(book)}
                    className="w-full flex gap-4 p-4 text-left hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0"
                  >
                    {/* Cover Thumbnail */}
                    <div className="w-10 h-14 flex-shrink-0 bg-gray-100 overflow-hidden">
                      {book.cover_i ? (
                        <img
                          src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-gray-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Book Info */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <h3 className="text-sm font-light text-black group-hover:text-gray-600 transition-colors line-clamp-1">
                        {book.title}
                      </h3>
                      <p className="text-xs font-light text-gray-400 mt-0.5 line-clamp-1">
                        {book.author_name?.[0] || 'Unknown Author'}
                        {book.first_publish_year && (
                          <span className="text-gray-300"> · {book.first_publish_year}</span>
                        )}
                      </p>
                    </div>

                    {/* Add indicator */}
                    <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-sm font-light text-gray-400">No books found</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {query.trim().length < 2 && !isLoading && results.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-sm font-light text-gray-300">
              Start typing to search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
