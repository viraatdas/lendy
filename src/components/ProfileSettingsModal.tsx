'use client';

import { useState, useEffect, useCallback } from 'react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  username: string;
  onClose: () => void;
  onSaved?: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProfileSettingsModal({
  isOpen,
  username,
  onClose,
  onSaved,
}: ProfileSettingsModalProps) {
  const [email, setEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/user?username=${encodeURIComponent(username)}`);
      if (!res.ok) {
        setError('Could not load your profile.');
        return;
      }
      const data = await res.json();
      setEmail(data?.user?.email ?? '');
      setContactMessage(data?.user?.contact_message ?? '');
    } catch {
      setError('Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setDeleteConfirm(false);
      fetchProfile();
    }
  }, [isOpen, fetchProfile]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        setError('Could not delete profile. Try again.');
        setDeleting(false);
        return;
      }
      // Wipe local identity and start fresh at the sign-in screen.
      localStorage.removeItem('lendy_username');
      window.location.href = '/';
    } catch {
      setError('Could not delete profile. Try again.');
      setDeleting(false);
    }
  }, [username]);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedEmail = email.trim();
      if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
        setError('That email looks off — check it?');
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const res = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            email: trimmedEmail,
            contactMessage: contactMessage.trim(),
          }),
        });
        if (!res.ok) {
          let msg = 'Could not save. Try again.';
          try {
            const err = await res.json();
            if (err?.error) msg = err.error;
          } catch {
            /* ignore */
          }
          setError(msg);
          return;
        }
        onSaved?.();
        onClose();
      } catch {
        setError('Could not save. Try again.');
      } finally {
        setSaving(false);
      }
    },
    [username, email, contactMessage, onSaved, onClose]
  );

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
        <div className="p-4 border-b-4 border-[#2d2d2d] bg-[#7c5cff]/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <h2 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
              Your profile
            </h2>
          </div>
          <div className="mt-3">
            <span className="pixel-card px-3 py-1 text-sm bg-[#7c5cff]/15 inline-block">
              👤 {username}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-2 float-animation">⚙️</div>
            <p className="text-[#888]" style={{ fontFamily: 'VT323, monospace' }}>
              Loading...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-3 sm:p-4 space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <label
                className="block text-sm"
                style={{ fontFamily: 'Silkscreen, cursive' }}
              >
                Email for notifications{' '}
                <span className="text-[#888] lowercase">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pixel-input w-full"
              />
              <p className="text-xs text-[#888]">
                We&apos;ll email you here when someone requests a book or
                messages you.
              </p>
            </div>

            {/* Note to readers */}
            <div className="space-y-2">
              <label
                className="block text-sm"
                style={{ fontFamily: 'Silkscreen, cursive' }}
              >
                Note to readers
              </label>
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="e.g. DM me on Instagram @books!"
                rows={3}
                className="pixel-input w-full"
              />
              <p className="text-xs text-[#888]">
                Shown on your library so people know how to reach you
                (optional).
              </p>
            </div>

            {error && (
              <p className="text-sm text-[#ef4444]" style={{ fontFamily: 'VT323, monospace' }}>
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="pixel-btn flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="pixel-btn pixel-btn-pink flex-1 disabled:opacity-50"
              >
                {saving ? 'Saving...' : '💾 Save'}
              </button>
            </div>

            {/* Danger zone */}
            <div className="pt-4 mt-2 border-t-2 border-[#eee]">
              {!deleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="text-sm text-[#ef4444] underline"
                  style={{ fontFamily: 'VT323, monospace' }}
                >
                  🗑️ Delete my profile
                </button>
              ) : (
                <div className="space-y-3 border-2 border-[#ef4444] bg-[#ef4444]/5 p-3">
                  <p className="text-sm text-[#b91c1c]" style={{ fontFamily: 'VT323, monospace' }}>
                    This removes your profile and library from Lendy. Your data
                    is kept safe and can be <strong>restored</strong> — signing
                    in again with the same name brings it all back.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      className="pixel-btn flex-1 text-sm"
                    >
                      Keep it
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 text-white border-2 border-[#2d2d2d] bg-[#ef4444] active:bg-[#f87171] sm:hover:bg-[#f87171] px-3 py-2 text-xs disabled:opacity-50"
                      style={{ fontFamily: 'Silkscreen, cursive' }}
                    >
                      {deleting ? 'Deleting...' : 'Yes, delete everything'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
