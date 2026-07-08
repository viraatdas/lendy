'use client';

import { useState, useEffect, useCallback } from 'react';
import { Book } from '@/lib/types';

interface PublicBook extends Book {
  requested: boolean;
}

interface LibraryData {
  username: string;
  contact_message: string | null;
  hasContact: boolean;
  owned: PublicBook[];
  lending: Book[];
}

interface ReaderLibraryModalProps {
  isOpen: boolean;
  readerUsername: string | null;
  currentUsername: string;
  onClose: () => void;
}

export default function ReaderLibraryModal({
  isOpen,
  readerUsername,
  currentUsername,
  onClose,
}: ReaderLibraryModalProps) {
  const [data, setData] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-book request state
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  // Inline contact form
  const [showContact, setShowContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const fetchLibrary = useCallback(async () => {
    if (!readerUsername) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/library?username=${encodeURIComponent(
          readerUsername
        )}&viewer=${encodeURIComponent(currentUsername)}`
      );
      if (!res.ok) {
        setError('Could not load this library right now.');
        setData(null);
        return;
      }
      const json: LibraryData = await res.json();
      setData(json);
      const initial = new Set<string>(
        (json.owned || []).filter((b) => b.requested).map((b) => b.id)
      );
      setRequestedIds(initial);
    } catch {
      setError('Could not load this library right now.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [readerUsername, currentUsername]);

  useEffect(() => {
    if (isOpen && readerUsername) {
      // Reset transient state on (re)open / reader change
      setShowContact(false);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setContactSent(false);
      setContactError(null);
      setRequestError(null);
      setRequestSuccess(null);
      fetchLibrary();
    }
  }, [isOpen, readerUsername, fetchLibrary]);

  const handleRequest = useCallback(
    async (book: PublicBook) => {
      setRequestingId(book.id);
      setRequestError(null);
      setRequestSuccess(null);
      try {
        const res = await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId: book.id,
            requesterUsername: currentUsername,
          }),
        });
        if (!res.ok) {
          let msg = 'Could not send request.';
          try {
            const err = await res.json();
            if (err?.error) msg = err.error;
          } catch {
            /* ignore parse error */
          }
          setRequestError(msg);
          return;
        }
        setRequestedIds((prev) => {
          const next = new Set(prev);
          next.add(book.id);
          return next;
        });
        setRequestSuccess(`Requested "${book.title}"! 🎉`);
      } catch {
        setRequestError('Could not send request. Try again.');
      } finally {
        setRequestingId(null);
      }
    },
    [currentUsername]
  );

  const handleSendContact = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!readerUsername || !contactName.trim() || !contactMessage.trim()) return;
      setSending(true);
      setContactError(null);
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toUsername: readerUsername,
            fromName: contactName.trim(),
            fromEmail: contactEmail.trim() || undefined,
            message: contactMessage.trim(),
          }),
        });
        if (!res.ok) {
          let msg = 'Could not send message.';
          try {
            const err = await res.json();
            if (err?.error) msg = err.error;
          } catch {
            /* ignore */
          }
          setContactError(msg);
          return;
        }
        setContactSent(true);
      } catch {
        setContactError('Could not send message. Try again.');
      } finally {
        setSending(false);
      }
    },
    [readerUsername, contactName, contactEmail, contactMessage]
  );

  if (!isOpen || !readerUsername) return null;

  const renderCover = (book: Book, dimmed = false) => (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden pixel-card ${
        dimmed ? 'opacity-60' : ''
      }`}
    >
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
      {dimmed && book.lent_to_name && (
        <div className="absolute inset-0 bg-[#ff6b9d]/85 flex items-center justify-center">
          <div className="text-center px-3">
            <p className="text-xs text-white/80 uppercase tracking-widest mb-1">
              Lent to
            </p>
            <p
              className="text-sm text-white font-bold"
              style={{ fontFamily: 'Silkscreen, cursive' }}
            >
              {book.lent_to_name}
            </p>
          </div>
        </div>
      )}
    </div>
  );

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
            <span className="text-2xl">📚</span>
            <h2
              className="text-xl break-words"
              style={{ fontFamily: 'Silkscreen, cursive' }}
            >
              {readerUsername}&apos;s library
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-4 space-y-4">
          {loading && (
            <div className="py-10 text-center">
              <div className="text-3xl mb-2 float-animation">📚</div>
              <p className="text-[#888]" style={{ fontFamily: 'VT323, monospace' }}>
                Loading library...
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

          {!loading && !error && data && (
            <>
              {/* Contact message quote */}
              {data.contact_message && (
                <div className="pixel-card p-3 bg-[#ffd700]/15">
                  <p
                    className="text-base italic text-[#555]"
                    style={{ fontFamily: 'VT323, monospace' }}
                  >
                    &ldquo;{data.contact_message}&rdquo;
                  </p>
                </div>
              )}

              {/* Message button / inline form */}
              {data.hasContact && !contactSent && (
                <div>
                  {!showContact ? (
                    <button
                      type="button"
                      onClick={() => setShowContact(true)}
                      className="pixel-btn w-full text-sm"
                    >
                      ✉️ Message {readerUsername}
                    </button>
                  ) : (
                    <form
                      onSubmit={handleSendContact}
                      className="pixel-card p-3 space-y-3"
                    >
                      <p
                        className="text-sm"
                        style={{ fontFamily: 'Silkscreen, cursive' }}
                      >
                        Message {readerUsername}
                      </p>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Your name *"
                        className="pixel-input w-full"
                      />
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="Your email (optional)"
                        className="pixel-input w-full"
                      />
                      <textarea
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Your message *"
                        rows={3}
                        className="pixel-input w-full"
                      />
                      {contactError && (
                        <p className="text-xs text-[#ef4444]">{contactError}</p>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setShowContact(false)}
                          className="pixel-btn flex-1 text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={
                            sending ||
                            !contactName.trim() ||
                            !contactMessage.trim()
                          }
                          className="pixel-btn pixel-btn-pink flex-1 text-sm disabled:opacity-50"
                        >
                          {sending ? 'Sending...' : '✉️ Send'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {data.hasContact && contactSent && (
                <div className="pixel-card p-3 bg-[#4ade80]/20 text-center">
                  <p
                    className="text-base"
                    style={{ fontFamily: 'VT323, monospace' }}
                  >
                    ✅ Sent! They&apos;ll get an email.
                  </p>
                </div>
              )}

              {/* Request feedback */}
              {requestSuccess && (
                <div className="pixel-card p-2 bg-[#4ade80]/20 text-center">
                  <p
                    className="text-sm"
                    style={{ fontFamily: 'VT323, monospace' }}
                  >
                    {requestSuccess}
                  </p>
                </div>
              )}
              {requestError && (
                <div className="pixel-card p-2 bg-[#ef4444]/15 text-center">
                  <p
                    className="text-sm text-[#ef4444]"
                    style={{ fontFamily: 'VT323, monospace' }}
                  >
                    {requestError}
                  </p>
                </div>
              )}

              {/* Available to borrow */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3
                    className="text-sm"
                    style={{ fontFamily: 'Silkscreen, cursive' }}
                  >
                    Available to borrow
                  </h3>
                  <span className="pixel-card px-3 py-1 text-sm bg-[#4ade80]/20">
                    {data.owned.length}
                  </span>
                </div>

                {data.owned.length === 0 ? (
                  <p
                    className="text-sm text-[#888] py-4 text-center"
                    style={{ fontFamily: 'VT323, monospace' }}
                  >
                    No books available right now
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {data.owned.map((book) => {
                      const isRequested = requestedIds.has(book.id);
                      return (
                        <div key={book.id} className="space-y-2">
                          {renderCover(book)}
                          <div className="space-y-1">
                            <h4
                              className="text-sm leading-tight line-clamp-2"
                              style={{ fontFamily: 'VT323, monospace' }}
                            >
                              {book.title}
                            </h4>
                            <p className="text-xs text-[#888] line-clamp-1">
                              {book.author}
                            </p>
                          </div>
                          {isRequested ? (
                            <button
                              type="button"
                              disabled
                              className="pixel-btn w-full text-xs bg-[#4ade80]/30 disabled:opacity-70"
                            >
                              ✓ Requested
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRequest(book)}
                              disabled={requestingId === book.id}
                              className="pixel-btn pixel-btn-pink w-full text-xs disabled:opacity-50"
                            >
                              {requestingId === book.id
                                ? '...'
                                : '🙋 Request'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Lending out */}
              {data.lending.length > 0 && (
                <div className="space-y-3">
                  <div className="pixel-divider" />
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-sm"
                      style={{ fontFamily: 'Silkscreen, cursive' }}
                    >
                      Lending out
                    </h3>
                    <span className="pixel-card px-3 py-1 text-sm bg-[#ff6b9d]/20">
                      {data.lending.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {data.lending.map((book) => (
                      <div key={book.id} className="space-y-2">
                        {renderCover(book, true)}
                        <div className="space-y-1">
                          <h4
                            className="text-sm leading-tight line-clamp-2 text-[#888]"
                            style={{ fontFamily: 'VT323, monospace' }}
                          >
                            {book.title}
                          </h4>
                          <p className="text-xs text-[#aaa] line-clamp-1">
                            {book.author}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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
