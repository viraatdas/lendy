'use client';

import { useState, useCallback } from 'react';
import { Book } from '@/lib/types';

interface BookCardProps {
  book: Book;
  type: 'owned' | 'lending' | 'borrowed';
  onLend?: (bookId: string) => void;
  onReturn?: (bookId: string) => void;
  onReturnBorrowed?: (bookId: string) => void;
  onDelete?: (bookId: string) => void;
}

export default function BookCard({ book, type, onLend, onReturn, onReturnBorrowed, onDelete }: BookCardProps) {
  const [showActions, setShowActions] = useState(false);

  const handleMouseEnter = useCallback(() => setShowActions(true), []);
  const handleMouseLeave = useCallback(() => setShowActions(false), []);

  const handleTap = useCallback((e: React.MouseEvent) => {
    // On touch devices, toggle actions on tap
    if (window.matchMedia('(hover: none)').matches) {
      e.preventDefault();
      setShowActions(prev => !prev);
    }
  }, []);

  return (
    <div
      className="group relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleTap}
    >
      {/* Book Cover */}
      <div className="relative aspect-[2/3] w-full overflow-hidden pixel-card transition-all duration-200">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#ff6b9d]/20 to-[#7c5cff]/20">
            <div className="text-center px-3">
              <div className="text-3xl mb-2">📖</div>
              <p className="text-xs text-[#666] leading-tight line-clamp-3">
                {book.title}
              </p>
            </div>
          </div>
        )}

        {/* Lending Overlay - Shows borrower name */}
        {type === 'lending' && book.lent_to_name && (
          <div
            className={`absolute inset-0 bg-[#ff6b9d]/90 flex items-center justify-center transition-opacity duration-300 ${
              showActions ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="text-center px-4">
              <p className="text-xs text-white/80 uppercase tracking-widest mb-1">
                Lent to
              </p>
              <p className="text-lg text-white font-bold" style={{ fontFamily: 'Silkscreen, cursive' }}>
                {book.lent_to_name}
              </p>
            </div>
          </div>
        )}

        {/* Borrowed Overlay - Shows who you borrowed from */}
        {type === 'borrowed' && book.borrowed_from_name && (
          <div
            className={`absolute inset-0 bg-[#7c5cff]/90 flex items-center justify-center transition-opacity duration-300 ${
              showActions ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="text-center px-4">
              <p className="text-xs text-white/80 uppercase tracking-widest mb-1">
                From
              </p>
              <p className="text-lg text-white font-bold" style={{ fontFamily: 'Silkscreen, cursive' }}>
                {book.borrowed_from_name}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons overlay */}
        {showActions && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#2d2d2d] to-transparent p-3 transition-opacity duration-300">
            <div className="flex gap-2 justify-center">
              {type === 'owned' && onLend && (
                <button
                  onClick={(e) => { e.stopPropagation(); onLend(book.id); }}
                  className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs text-white bg-[#ff6b9d] border-2 border-[#2d2d2d] active:bg-[#ff8fb5] sm:hover:bg-[#ff8fb5] transition-colors"
                  style={{ fontFamily: 'Silkscreen, cursive' }}
                >
                  Lend
                </button>
              )}
              {type === 'lending' && onReturn && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReturn(book.id); }}
                  className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs text-white bg-[#4ade80] border-2 border-[#2d2d2d] active:bg-[#6ee7a0] sm:hover:bg-[#6ee7a0] transition-colors"
                  style={{ fontFamily: 'Silkscreen, cursive' }}
                >
                  Got it!
                </button>
              )}
              {type === 'borrowed' && onReturnBorrowed && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReturnBorrowed(book.id); }}
                  className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs text-white bg-[#4ade80] border-2 border-[#2d2d2d] active:bg-[#6ee7a0] sm:hover:bg-[#6ee7a0] transition-colors"
                  style={{ fontFamily: 'Silkscreen, cursive' }}
                >
                  Return
                </button>
              )}
              {type === 'owned' && onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(book.id); }}
                  className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs text-white bg-[#ef4444] border-2 border-[#2d2d2d] active:bg-[#f87171] sm:hover:bg-[#f87171] transition-colors"
                  style={{ fontFamily: 'Silkscreen, cursive' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Type badge */}
        {type === 'lending' && (
          <div className="absolute top-2 right-2 px-2 py-1 text-xs bg-[#ff6b9d] text-white border-2 border-[#2d2d2d]">
            🤝
          </div>
        )}
        {type === 'borrowed' && (
          <div className="absolute top-2 right-2 px-2 py-1 text-xs bg-[#7c5cff] text-white border-2 border-[#2d2d2d]">
            📖
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="mt-3 space-y-1">
        <h3 className="text-sm leading-tight line-clamp-2" style={{ fontFamily: 'VT323, monospace' }}>
          {book.title}
        </h3>
        <p className="text-xs text-[#888]">
          {book.author}
        </p>
      </div>
    </div>
  );
}
