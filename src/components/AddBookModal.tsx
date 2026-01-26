'use client';

import { useState } from 'react';

interface AddBookModalProps {
  isOpen: boolean;
  book: {
    title: string;
    author: string;
    coverUrl: string | null;
    openLibraryKey: string;
  } | null;
  onClose: () => void;
  onConfirm: (type: 'own' | 'borrowing', borrowedFrom?: string) => void;
}

export default function AddBookModal({ isOpen, book, onClose, onConfirm }: AddBookModalProps) {
  const [type, setType] = useState<'own' | 'borrowing'>('own');
  const [borrowedFrom, setBorrowedFrom] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'borrowing' && !borrowedFrom.trim()) return;
    onConfirm(type, type === 'borrowing' ? borrowedFrom.trim() : undefined);
    setType('own');
    setBorrowedFrom('');
  };

  const handleClose = () => {
    setType('own');
    setBorrowedFrom('');
    onClose();
  };

  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#2d2d2d]/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md pixel-card">
        {/* Header */}
        <div className="p-4 border-b-4 border-[#2d2d2d] bg-[#4ade80]/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✨</span>
            <h2 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
              Add Book
            </h2>
          </div>
        </div>

        {/* Book Preview */}
        <div className="p-4 border-b-2 border-[#eee] flex gap-4">
          <div className="w-16 h-24 flex-shrink-0 bg-[#eee] border-2 border-[#2d2d2d] overflow-hidden">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                📖
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg line-clamp-2" style={{ fontFamily: 'VT323, monospace' }}>
              {book.title}
            </h3>
            <p className="text-sm text-[#888] mt-1">{book.author}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type Selection */}
          <div className="space-y-3">
            <label className="block text-sm" style={{ fontFamily: 'Silkscreen, cursive' }}>
              Adding as:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('own')}
                className={`p-4 text-center transition-all border-3 ${
                  type === 'own'
                    ? 'bg-[#4ade80]/20 border-[#4ade80]'
                    : 'bg-white border-[#ddd] hover:border-[#4ade80]'
                }`}
                style={{ borderWidth: '3px' }}
              >
                <span className="block text-2xl mb-2">📚</span>
                <span className="text-sm" style={{ fontFamily: 'Silkscreen, cursive' }}>I own this</span>
              </button>
              <button
                type="button"
                onClick={() => setType('borrowing')}
                className={`p-4 text-center transition-all ${
                  type === 'borrowing'
                    ? 'bg-[#7c5cff]/20 border-[#7c5cff]'
                    : 'bg-white border-[#ddd] hover:border-[#7c5cff]'
                }`}
                style={{ borderWidth: '3px' }}
              >
                <span className="block text-2xl mb-2">🤝</span>
                <span className="text-sm" style={{ fontFamily: 'Silkscreen, cursive' }}>Borrowing</span>
              </button>
            </div>
          </div>

          {/* Borrowed From Input */}
          {type === 'borrowing' && (
            <div className="space-y-2">
              <label className="block text-sm" style={{ fontFamily: 'Silkscreen, cursive' }}>
                Borrowed from:
              </label>
              <input
                type="text"
                value={borrowedFrom}
                onChange={(e) => setBorrowedFrom(e.target.value)}
                placeholder="Enter owner's name..."
                className="pixel-input w-full"
                autoFocus
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="pixel-btn flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={type === 'borrowing' && !borrowedFrom.trim()}
              className="pixel-btn pixel-btn-pink flex-1 disabled:opacity-50"
            >
              ✨ Add Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
