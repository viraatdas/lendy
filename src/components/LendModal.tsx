'use client';

import { useState } from 'react';

interface LendModalProps {
  isOpen: boolean;
  bookTitle: string;
  onClose: () => void;
  onConfirm: (lentToName: string, borrowerUsername?: string) => void;
}

export default function LendModal({ isOpen, bookTitle, onClose, onConfirm }: LendModalProps) {
  const [lentToName, setLentToName] = useState('');
  const [borrowerUsername, setBorrowerUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lentToName.trim()) {
      onConfirm(lentToName.trim(), borrowerUsername.trim() || undefined);
      setLentToName('');
      setBorrowerUsername('');
    }
  };

  const handleClose = () => {
    setLentToName('');
    setBorrowerUsername('');
    onClose();
  };

  if (!isOpen) return null;

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
        <div className="p-4 border-b-4 border-[#2d2d2d] bg-[#ff6b9d]/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤝</span>
            <h2 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
              Lend Book
            </h2>
          </div>
        </div>

        {/* Book Title */}
        <div className="p-4 border-b-2 border-[#eee]">
          <p className="text-lg line-clamp-1" style={{ fontFamily: 'VT323, monospace' }}>
            📖 {bookTitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm" style={{ fontFamily: 'Silkscreen, cursive' }}>
              Lending to: *
            </label>
            <input
              type="text"
              value={lentToName}
              onChange={(e) => setLentToName(e.target.value)}
              placeholder="Enter their name..."
              className="pixel-input w-full"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm" style={{ fontFamily: 'Silkscreen, cursive' }}>
              Their Lendy username: <span className="text-[#888]">(optional)</span>
            </label>
            <input
              type="text"
              value={borrowerUsername}
              onChange={(e) => setBorrowerUsername(e.target.value)}
              placeholder="If they use Lendy..."
              className="pixel-input w-full"
            />
            <p className="text-xs text-[#888]">
              💡 This will show the book in their borrowed section!
            </p>
          </div>

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
              disabled={!lentToName.trim()}
              className="pixel-btn pixel-btn-pink flex-1 disabled:opacity-50"
            >
              🤝 Lend It!
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
