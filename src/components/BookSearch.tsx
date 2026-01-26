'use client';

import { useState, useCallback } from 'react';
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
  const [hasSearched, setHasSearched] = useState(false);

  const searchBooks = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data.docs || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchBooks();
    }
  };

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
    setHasSearched(false);
    onClose();
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
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
      <div className="relative w-full max-w-2xl bg-white shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-light text-black">Add a Book</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-black transition-colors"
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

          {/* Search Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by title or author..."
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 text-sm font-light text-black placeholder-gray-400 focus:outline-none focus:border-gray-300 transition-colors"
              autoFocus
            />
            <button
              onClick={searchBooks}
              disabled={!query.trim() || isLoading}
              className="px-6 py-3 text-sm font-light text-white bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-sm font-light text-gray-400">Searching...</p>
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm font-light text-gray-400">No books found</p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="space-y-4">
              {results.map((book) => (
                <button
                  key={book.key}
                  onClick={() => handleSelect(book)}
                  className="w-full flex gap-4 p-4 text-left hover:bg-gray-50 transition-colors group"
                >
                  {/* Cover Thumbnail */}
                  <div className="w-12 h-18 flex-shrink-0 bg-gray-100">
                    {book.cover_i ? (
                      <img
                        src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-gray-300"
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
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-light text-black group-hover:text-gray-600 transition-colors line-clamp-1">
                      {book.title}
                    </h3>
                    <p className="text-xs font-light text-gray-400 mt-0.5">
                      {book.author_name?.[0] || 'Unknown Author'}
                    </p>
                    {book.first_publish_year && (
                      <p className="text-xs font-light text-gray-300 mt-0.5">
                        {book.first_publish_year}
                      </p>
                    )}
                  </div>

                  {/* Add indicator */}
                  <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && !hasSearched && (
            <div className="text-center py-12">
              <p className="text-sm font-light text-gray-400">
                Search for a book to add to your library
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
