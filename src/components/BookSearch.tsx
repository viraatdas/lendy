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
              className="pixel-input flex-1 text-lg"
            />
            {isLoading && (
              <div className="text-xl float-animation">📚</div>
            )}
            <button
              onClick={handleClose}
              className="pixel-btn text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            <div>
              {results.map((book, index) => (
                <button
                  key={book.key}
                  onClick={() => handleSelect(book)}
                  className="w-full flex gap-4 p-4 text-left hover:bg-[#ff6b9d]/10 transition-colors group border-b-2 border-[#eee] last:border-0"
                >
                  {/* Cover */}
                  <div className="w-12 h-16 flex-shrink-0 bg-[#eee] border-2 border-[#2d2d2d] overflow-hidden">
                    {book.cover_i ? (
                      <img
                        src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`}
                        alt={book.title}
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
                    <h3 className="text-base group-hover:text-[#ff6b9d] transition-colors line-clamp-1" style={{ fontFamily: 'VT323, monospace' }}>
                      {book.title}
                    </h3>
                    <p className="text-sm text-[#888] line-clamp-1">
                      {book.author_name?.[0] || 'Unknown Author'}
                      {book.first_publish_year && (
                        <span className="text-[#aaa]"> · {book.first_publish_year}</span>
                      )}
                    </p>
                  </div>

                  {/* Add indicator */}
                  <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity text-[#ff6b9d]">
                    ➕
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim().length >= 2 && !isLoading ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">😢</div>
              <p className="text-[#888]">No books found</p>
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
