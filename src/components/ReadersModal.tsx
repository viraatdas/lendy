'use client';

import { useState, useEffect, useCallback } from 'react';

interface Reader {
  username: string;
  book_count: number;
  last_activity: string | null;
  last_action: string;
}

interface ReadersModalProps {
  isOpen: boolean;
  currentUsername: string;
  onClose: () => void;
  onSelectReader: (username: string) => void;
}

export default function ReadersModal({
  isOpen,
  currentUsername,
  onClose,
  onSelectReader,
}: ReadersModalProps) {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReaders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/readers?exclude=${encodeURIComponent(currentUsername)}`
      );
      if (!res.ok) {
        setError('Could not load readers right now.');
        setReaders([]);
        return;
      }
      const data = await res.json();
      setReaders(Array.isArray(data.readers) ? data.readers : []);
    } catch {
      setError('Could not load readers right now.');
      setReaders([]);
    } finally {
      setLoading(false);
    }
  }, [currentUsername]);

  useEffect(() => {
    if (isOpen) {
      fetchReaders();
    }
  }, [isOpen, fetchReaders]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#2d2d2d]/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md pixel-card max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b-4 border-[#2d2d2d] bg-[#ff6b9d]/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <h2 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
              Readers
            </h2>
          </div>
          <p className="text-sm text-[#888] mt-2" style={{ fontFamily: 'VT323, monospace' }}>
            Sorted by recent activity
          </p>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4 space-y-3">
          {loading && (
            <div className="py-10 text-center">
              <div className="text-3xl mb-2 float-animation">📚</div>
              <p className="text-[#888]" style={{ fontFamily: 'VT323, monospace' }}>
                Loading readers...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="py-10 text-center">
              <div className="text-3xl mb-2">😢</div>
              <p className="text-[#888]" style={{ fontFamily: 'VT323, monospace' }}>
                {error}
              </p>
            </div>
          )}

          {!loading && !error && readers.length === 0 && (
            <div className="py-10 text-center">
              <div className="text-3xl mb-2">🫥</div>
              <p className="text-[#888]" style={{ fontFamily: 'VT323, monospace' }}>
                No other readers yet. Check back soon!
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            readers.map((r) => (
              <button
                key={r.username}
                type="button"
                onClick={() => onSelectReader(r.username)}
                className="pixel-card w-full text-left p-3 flex items-center gap-3 transition-transform active:translate-y-0.5"
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="text-base truncate"
                    style={{ fontFamily: 'Silkscreen, cursive' }}
                  >
                    {r.username}
                  </p>
                  <p
                    className="text-sm text-[#888] truncate mt-1"
                    style={{ fontFamily: 'VT323, monospace' }}
                  >
                    {r.last_action}
                  </p>
                </div>
                <span className="pixel-card px-3 py-1 text-sm bg-[#4ade80]/20 flex-shrink-0 whitespace-nowrap">
                  📚 {r.book_count}
                </span>
              </button>
            ))}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t-2 border-[#eee]">
          <button type="button" onClick={onClose} className="pixel-btn w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
