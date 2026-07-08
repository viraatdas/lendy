'use client';

import { useState, useCallback } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  toUsername: string;
  onClose: () => void;
}

export default function ContactModal({
  isOpen,
  toUsername,
  onClose,
}: ContactModalProps) {
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFromName('');
    setFromEmail('');
    setMessage('');
    setSending(false);
    setSent(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!fromName.trim() || !message.trim()) return;
      setSending(true);
      setError(null);
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUsername,
            fromName: fromName.trim(),
            fromEmail: fromEmail.trim() || undefined,
            message: message.trim(),
          }),
        });
        if (!res.ok) {
          let msg = 'Could not send message. Try again.';
          try {
            const err = await res.json();
            if (err?.error) msg = err.error;
          } catch {
            /* ignore */
          }
          setError(msg);
          return;
        }
        setSent(true);
      } catch {
        setError('Could not send message. Try again.');
      } finally {
        setSending(false);
      }
    },
    [toUsername, fromName, fromEmail, message]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#2d2d2d]/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md pixel-card max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b-4 border-[#2d2d2d] bg-[#ff6b9d]/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✉️</span>
            <h2
              className="text-xl break-words"
              style={{ fontFamily: 'Silkscreen, cursive' }}
            >
              Message {toUsername}
            </h2>
          </div>
        </div>

        {sent ? (
          <div className="p-8 text-center space-y-4">
            <div className="text-4xl float-animation">✅</div>
            <p
              className="text-lg text-[#555]"
              style={{ fontFamily: 'VT323, monospace' }}
            >
              Sent! They&apos;ll get an email.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="pixel-btn pixel-btn-pink w-full"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <label
                className="block text-sm"
                style={{ fontFamily: 'Silkscreen, cursive' }}
              >
                Your name: *
              </label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Enter your name..."
                className="pixel-input w-full"
                autoFocus
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label
                className="block text-sm"
                style={{ fontFamily: 'Silkscreen, cursive' }}
              >
                Your email: <span className="text-[#888]">(optional)</span>
              </label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="So they can reply..."
                className="pixel-input w-full"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label
                className="block text-sm"
                style={{ fontFamily: 'Silkscreen, cursive' }}
              >
                Message: *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message..."
                rows={4}
                className="pixel-input w-full"
              />
            </div>

            {error && (
              <p
                className="text-sm text-[#ef4444]"
                style={{ fontFamily: 'VT323, monospace' }}
              >
                {error}
              </p>
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
                disabled={sending || !fromName.trim() || !message.trim()}
                className="pixel-btn pixel-btn-pink flex-1 disabled:opacity-50"
              >
                {sending ? 'Sending...' : '✉️ Send'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
