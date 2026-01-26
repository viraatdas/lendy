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
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white shadow-2xl p-8">
        <h2 className="text-lg font-light text-black mb-2">Lend Book</h2>
        <p className="text-sm font-light text-gray-400 mb-6 line-clamp-1">
          {bookTitle}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-light text-gray-400 uppercase tracking-widest mb-2">
              Lending to (Name) *
            </label>
            <input
              type="text"
              value={lentToName}
              onChange={(e) => setLentToName(e.target.value)}
              placeholder="Enter recipient's name"
              className="w-full px-0 py-3 bg-transparent border-0 border-b border-gray-200 text-sm font-light text-black placeholder-gray-300 focus:outline-none focus:border-black transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-light text-gray-400 uppercase tracking-widest mb-2">
              Their Lendy Username (Optional)
            </label>
            <input
              type="text"
              value={borrowerUsername}
              onChange={(e) => setBorrowerUsername(e.target.value)}
              placeholder="If they use Lendy, enter their username"
              className="w-full px-0 py-3 bg-transparent border-0 border-b border-gray-200 text-sm font-light text-black placeholder-gray-300 focus:outline-none focus:border-black transition-colors"
            />
            <p className="mt-2 text-xs font-light text-gray-300">
              This will show the book in their borrowed section
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 text-sm font-light text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!lentToName.trim()}
              className="flex-1 py-3 text-sm font-light text-white bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Confirm Lend
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
