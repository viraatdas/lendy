'use client';

import { useState } from 'react';
import { Book } from '@/lib/types';

interface BookCardProps {
  book: Book;
  type: 'owned' | 'lending' | 'borrowed';
  onLend?: (bookId: string) => void;
  onReturn?: (bookId: string) => void;
  onDelete?: (bookId: string) => void;
}

export default function BookCard({ book, type, onLend, onReturn, onDelete }: BookCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const coverUrl = book.cover_url || '/book-placeholder.svg';

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowActions(false);
      }}
    >
      {/* Book Cover */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-50 shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
        {book.cover_url ? (
          <img
            src={coverUrl}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="text-center px-3">
              <p className="text-xs font-light text-gray-500 leading-tight">
                {book.title}
              </p>
            </div>
          </div>
        )}

        {/* Lending Overlay - Shows borrower name */}
        {type === 'lending' && book.lent_to_name && (
          <div
            className={`absolute inset-0 bg-black/80 flex items-center justify-center transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="text-center px-4">
              <p className="text-xs font-light text-gray-400 uppercase tracking-widest mb-1">
                Lent to
              </p>
              <p className="text-lg font-light text-white">
                {book.lent_to_name}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons overlay */}
        {isHovered && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 transition-opacity duration-300">
            <div className="flex gap-2 justify-center">
              {type === 'owned' && onLend && (
                <button
                  onClick={() => onLend(book.id)}
                  className="px-3 py-1.5 text-xs font-light text-white bg-black/50 hover:bg-black/80 transition-colors border border-white/20"
                >
                  Lend
                </button>
              )}
              {type === 'lending' && onReturn && (
                <button
                  onClick={() => onReturn(book.id)}
                  className="px-3 py-1.5 text-xs font-light text-white bg-black/50 hover:bg-black/80 transition-colors border border-white/20"
                >
                  Return
                </button>
              )}
              {type === 'owned' && onDelete && (
                <button
                  onClick={() => onDelete(book.id)}
                  className="px-3 py-1.5 text-xs font-light text-red-300 bg-black/50 hover:bg-red-900/80 transition-colors border border-white/20"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="mt-3 space-y-0.5">
        <h3 className="text-sm font-light text-black leading-tight line-clamp-2">
          {book.title}
        </h3>
        <p className="text-xs font-light text-gray-400">
          {book.author}
        </p>
      </div>

      {/* Status badge for borrowed books */}
      {type === 'borrowed' && (
        <div className="mt-2">
          <span className="text-xs font-light text-gray-400 uppercase tracking-wider">
            From: {book.owner_username}
          </span>
        </div>
      )}
    </div>
  );
}
