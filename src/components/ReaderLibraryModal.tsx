'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  onOpenBook: (book: Book) => void;
}

export default function ReaderLibraryModal({
  isOpen,
  readerUsername,
  currentUsername,
  onClose,
  onOpenBook,
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

  const contactRef = useRef<HTMLDivElement | null>(null);

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

  const openContact = useCallback(() => {
    setShowContact(true);
    // Let the form render, then scroll it into view
    requestAnimationFrame(() => {
      contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

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

  const handleRetract = useCallback(
    async (book: PublicBook) => {
      setRequestingId(book.id);
      try {
        await fetch('/api/requests', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.id, requesterUsername: currentUsername }),
        });
        setRequestedIds((prev) => {
          const next = new Set(prev);
          next.delete(book.id);
          return next;
        });
        setRequestSuccess(null);
      } catch {
        /* ignore — leave as requested */
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
    <button
      type="button"
      onClick={() => onOpenBook(book)}
      title="View details & comments"
      className={`relative block w-full aspect-[2/3] overflow-hidden pixel-card cursor-pointer ${
        dimmed ? 'opacity-70' : ''
      }`}
    >
      {book.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
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
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden pixel-pattern bg-[#fdf6e3]">
      {/* Header */}
      <header className="border-b-4 border-[#2d2d2d] bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <button onClick={onClose} className="pixel-btn text-sm whitespace-nowrap">
              ← Back
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl">📚</span>
              <h1
                className="text-lg sm:text-2xl truncate"
                style={{ fontFamily: 'Silkscreen, cursive' }}
              >
                {readerUsername}
              </h1>
            </div>
            {data?.hasContact && !contactSent ? (
              <button
                onClick={openContact}
                className="pixel-btn pixel-btn-pink text-sm whitespace-nowrap"
              >
                ✉️ Message
              </button>
            ) : (
              <div className="w-[64px]" aria-hidden />
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading && (
          <div className="text-center py-24">
            <div className="text-6xl mb-4 float-animation">📚</div>
            <p className="text-xl text-[#666]">Loading library...</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-24">
            <div className="pixel-card inline-block p-8">
              <div className="text-5xl mb-4">😢</div>
              <p className="text-xl text-[#666]">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-8">
            {/* Contact message quote */}
            {data.contact_message && (
              <div className="pixel-card p-4 bg-[#ffd700]/15">
                <p
                  className="text-lg italic text-[#555]"
                  style={{ fontFamily: 'VT323, monospace' }}
                >
                  &ldquo;{data.contact_message}&rdquo;
                </p>
              </div>
            )}

            {/* Inline contact form */}
            {data.hasContact && showContact && !contactSent && (
              <div ref={contactRef} className="pixel-card p-4 sm:p-6 max-w-md">
                <form onSubmit={handleSendContact} className="space-y-3">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">✉️</span>
                    <h2 className="text-lg" style={{ fontFamily: 'Silkscreen, cursive' }}>
                      Message {readerUsername}
                    </h2>
                  </div>
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
                    <p className="text-sm text-[#ef4444]">{contactError}</p>
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
                      disabled={sending || !contactName.trim() || !contactMessage.trim()}
                      className="pixel-btn pixel-btn-pink flex-1 text-sm disabled:opacity-50"
                    >
                      {sending ? 'Sending...' : '✉️ Send'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {data.hasContact && contactSent && (
              <div className="pixel-card p-4 bg-[#4ade80]/20 text-center max-w-md">
                <p className="text-lg" style={{ fontFamily: 'VT323, monospace' }}>
                  ✅ Sent! They&apos;ll get an email.
                </p>
              </div>
            )}

            {/* Request feedback */}
            {requestSuccess && (
              <div className="pixel-card p-3 bg-[#4ade80]/20 text-center">
                <p className="text-base" style={{ fontFamily: 'VT323, monospace' }}>
                  {requestSuccess}
                </p>
              </div>
            )}
            {requestError && (
              <div className="pixel-card p-3 bg-[#ef4444]/15 text-center">
                <p
                  className="text-base text-[#ef4444]"
                  style={{ fontFamily: 'VT323, monospace' }}
                >
                  {requestError}
                </p>
              </div>
            )}

            {/* Empty library */}
            {data.owned.length === 0 && data.lending.length === 0 && (
              <div className="text-center py-16">
                <div className="pixel-card inline-block p-8">
                  <div className="text-5xl mb-4">🗄️</div>
                  <p className="text-xl text-[#666]">
                    {readerUsername} has no books yet
                  </p>
                </div>
              </div>
            )}

            {/* Available to borrow */}
            {data.owned.length > 0 && (
              <section className="pixel-card p-4 sm:p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-2xl">📗</span>
                  <h2 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
                    Available to borrow
                  </h2>
                  <div className="flex-1 pixel-divider" />
                  <span className="pixel-card px-3 py-1 text-sm bg-[#4ade80]/20">
                    {data.owned.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {data.owned.map((book) => {
                    const isRequested = requestedIds.has(book.id);
                    return (
                      <div key={book.id} className="flex flex-col h-full">
                        {renderCover(book)}
                        <div className="mt-2 space-y-1 flex-1">
                          <h4
                            className="text-sm leading-tight line-clamp-2"
                            style={{ fontFamily: 'VT323, monospace' }}
                          >
                            {book.title}
                          </h4>
                          <p className="text-xs text-[#888] line-clamp-1">{book.author}</p>
                        </div>
                        <div className="mt-2">
                          {isRequested ? (
                            <button
                              type="button"
                              onClick={() => handleRetract(book)}
                              disabled={requestingId === book.id}
                              title="Click to retract your request"
                              className="pixel-btn w-full text-xs bg-[#4ade80]/40 disabled:opacity-50 group/req"
                            >
                              <span className="group-hover/req:hidden">✓ Requested</span>
                              <span className="hidden group-hover/req:inline">↩ Retract</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRequest(book)}
                              disabled={requestingId === book.id}
                              className="pixel-btn pixel-btn-pink w-full text-xs disabled:opacity-50"
                            >
                              {requestingId === book.id ? '...' : '🙋 Request'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Lending out (view-only) */}
            {data.lending.length > 0 && (
              <section className="pixel-card p-4 sm:p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-2xl">🤝</span>
                  <h2 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
                    Lending out
                  </h2>
                  <div className="flex-1 pixel-divider" />
                  <span className="pixel-card px-3 py-1 text-sm bg-[#ff6b9d]/20">
                    {data.lending.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                        <p className="text-xs text-[#aaa] line-clamp-1">{book.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Bottom back button for long libraries */}
        {!loading && (
          <div className="mt-8 text-center">
            <button onClick={onClose} className="pixel-btn">
              ← Back to Readers
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
