'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Book, RequestItem } from '@/lib/types';
import BookCard from './BookCard';
import BookSearch from './BookSearch';
import AddBookModal from './AddBookModal';
import LendModal from './LendModal';
import ConfirmModal from './ConfirmModal';
import ReadersModal from './ReadersModal';
import ReaderLibraryModal from './ReaderLibraryModal';
import ProfileSettingsModal from './ProfileSettingsModal';
import BookDetailModal from './BookDetailModal';
import FindBookModal from './FindBookModal';

type DetailBook = Pick<Book, 'id' | 'title' | 'author' | 'cover_url' | 'open_library_key'> & {
  // Set when the book is being viewed on someone else's shelf — the detail page
  // is where borrowing happens, so it needs to know whose book this is.
  ownerUsername?: string | null;
  available?: boolean;
};

interface BookshelfProps {
  username: string;
}

interface BooksState {
  owned: Book[];
  lending: Book[];
  borrowed: Book[];
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  icon: string;
  variant: 'danger' | 'warning' | 'info';
  confirmText: string;
  onConfirm: () => void;
}

export default function Bookshelf({ username }: BookshelfProps) {
  const [books, setBooks] = useState<BooksState>({ owned: [], lending: [], borrowed: [] });
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [myRequests, setMyRequests] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isReadersOpen, setIsReadersOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewingReader, setViewingReader] = useState<string | null>(null);
  const [detailBook, setDetailBook] = useState<DetailBook | null>(null);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<{
    title: string;
    author: string;
    coverUrl: string | null;
    openLibraryKey: string;
  } | null>(null);
  const [lendModal, setLendModal] = useState<{ isOpen: boolean; bookId: string; bookTitle: string }>({
    isOpen: false,
    bookId: '',
    bookTitle: '',
  });
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    icon: '❓',
    variant: 'info',
    confirmText: 'Confirm',
    onConfirm: () => {},
  });

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const fetchBooks = useCallback(async () => {
    try {
      const response = await fetch(`/api/books?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      setBooks(data);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  const fetchRequests = useCallback(async () => {
    try {
      const [incomingRes, outgoingRes] = await Promise.all([
        fetch(`/api/requests?username=${encodeURIComponent(username)}`),
        fetch(`/api/requests?username=${encodeURIComponent(username)}&direction=outgoing`),
      ]);
      const incoming = await incomingRes.json();
      const outgoing = await outgoingRes.json();
      setRequests(incoming.requests || []);
      setMyRequests(outgoing.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  }, [username]);

  useEffect(() => {
    fetchBooks();
    fetchRequests();
  }, [fetchBooks, fetchRequests]);

  const handleRequestAction = async (requestId: string, action: 'accept' | 'decline') => {
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, username }),
      });
      if (response.ok) {
        await Promise.all([fetchRequests(), fetchBooks()]);
      }
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (response.ok) {
        await fetchRequests();
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  // Books I have a live request on — the single source of truth shared by the
  // reader library, Find, and the book detail page.
  const requestedBookIds = useMemo(
    () =>
      new Set(
        myRequests.filter((r) => r.status === 'pending').map((r) => r.book_id)
      ),
    [myRequests]
  );

  const handleSelectReader = (readerUsername: string) => {
    setIsReadersOpen(false);
    setViewingReader(readerUsername);
  };

  const handleSelectBook = (book: {
    title: string;
    author: string;
    coverUrl: string | null;
    openLibraryKey: string;
  }) => {
    setSelectedBook(book);
    setIsSearchOpen(false);
  };

  const handleAddBook = async (type: 'own' | 'borrowing', borrowedFrom?: string) => {
    if (!selectedBook) return;

    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          title: selectedBook.title,
          author: selectedBook.author,
          coverUrl: selectedBook.coverUrl,
          openLibraryKey: selectedBook.openLibraryKey,
          borrowedFromName: type === 'borrowing' ? borrowedFrom : undefined,
        }),
      });

      if (response.ok) {
        fetchBooks();
      }
    } catch (error) {
      console.error('Error adding book:', error);
    } finally {
      setSelectedBook(null);
    }
  };

  const handleLendClick = (bookId: string) => {
    const book = books.owned.find((b) => b.id === bookId);
    if (book) {
      setLendModal({ isOpen: true, bookId, bookTitle: book.title });
    }
  };

  const handleLendConfirm = async (lentToName: string, borrowerUsername?: string) => {
    try {
      const response = await fetch(`/api/books/${lendModal.bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lend',
          lentToName,
          borrowerUsername,
        }),
      });

      if (response.ok) {
        fetchBooks();
      }
    } catch (error) {
      console.error('Error lending book:', error);
    } finally {
      setLendModal({ isOpen: false, bookId: '', bookTitle: '' });
    }
  };

  const handleReturn = async (bookId: string) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'return' }),
      });

      if (response.ok) {
        fetchBooks();
      }
    } catch (error) {
      console.error('Error returning book:', error);
    }
  };

  const handleReturnBorrowed = (bookId: string) => {
    const book = books.borrowed.find((b) => b.id === bookId);
    // A book lent to me through Lendy is owned by someone else — returning it
    // hands it back to the owner (PATCH). A book I added manually as "borrowing"
    // is my own row and is simply removed (DELETE).
    const isLendyBorrowed = !!book && book.owner_username !== username;
    setConfirmModal({
      isOpen: true,
      title: 'Return Book',
      message: `Mark "${book?.title}" as returned to ${book?.borrowed_from_name}?`,
      icon: '📚',
      variant: 'info',
      confirmText: 'Yes, returned!',
      onConfirm: async () => {
        closeConfirmModal();
        try {
          const response = isLendyBorrowed
            ? await fetch(`/api/books/${bookId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'return' }),
              })
            : await fetch(`/api/books/${bookId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
              });

          if (response.ok) {
            await Promise.all([fetchBooks(), fetchRequests()]);
          }
        } catch (error) {
          console.error('Error returning borrowed book:', error);
        }
      },
    });
  };

  const handleDelete = (bookId: string) => {
    const book = books.owned.find((b) => b.id === bookId);
    setConfirmModal({
      isOpen: true,
      title: 'Remove Book',
      message: `Are you sure you want to remove "${book?.title}" from your library?`,
      icon: '🗑️',
      variant: 'danger',
      confirmText: 'Remove',
      onConfirm: async () => {
        closeConfirmModal();
        try {
          const response = await fetch(`/api/books/${bookId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
          });

          if (response.ok) {
            fetchBooks();
          }
        } catch (error) {
          console.error('Error deleting book:', error);
        }
      },
    });
  };

  const totalBooks = books.owned.length + books.lending.length + books.borrowed.length;

  return (
    <div className="min-h-screen pixel-pattern overflow-x-hidden">
      {/* Header */}
      <header className="border-b-4 border-[#2d2d2d] bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'Silkscreen, cursive' }}>
                <span className="text-[#ff6b9d]">L</span>
                <span className="text-[#7c5cff]">e</span>
                <span className="text-[#ffd700]">n</span>
                <span className="text-[#4ade80]">d</span>
                <span className="text-[#60a5fa]">y</span>
              </h1>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="pixel-card px-3 py-1 text-sm transition-transform hover:-translate-y-0.5 flex items-center gap-1 max-w-[48vw] sm:max-w-none"
                title="Edit your profile & notification email"
              >
                <span className="truncate">👤 {username}</span>
                <span className="text-[#888]">⚙️</span>
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="pixel-btn pixel-btn-pink text-sm"
              >
                📖 Add Book
              </button>
              <button
                onClick={() => setIsFindOpen(true)}
                className="pixel-btn text-sm"
              >
                🔎 Find
              </button>
              <button
                onClick={() => setIsReadersOpen(true)}
                className="pixel-btn text-sm"
              >
                👥 Readers
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isLoading ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4 float-animation">📚</div>
            <p className="text-xl text-[#666]">Loading your library...</p>
          </div>
        ) : totalBooks === 0 ? (
          <div className="text-center py-24">
            <div className="pixel-card inline-block p-8 mb-6">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-xl text-[#666] mb-4">
                Your shelf is empty!
              </p>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="pixel-btn pixel-btn-pink"
              >
                ✨ Add your first book
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Requests Section (incoming borrow requests) */}
            {requests.length > 0 && (
              <section className="pixel-card p-4 sm:p-6 bg-[#ffd700]/5">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-2xl">🙋</span>
                  <h2 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
                    Requested
                  </h2>
                  <div className="flex-1 pixel-divider" />
                  <span className="pixel-card px-3 py-1 text-sm bg-[#ffd700]/30">
                    {requests.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 sm:gap-4 border-2 border-[#2d2d2d] bg-white p-3"
                    >
                      <div className="w-12 h-[72px] flex-shrink-0 bg-[#eee] border-2 border-[#2d2d2d] overflow-hidden">
                        {req.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={req.cover_url} alt={req.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">📖</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-tight line-clamp-2" style={{ fontFamily: 'VT323, monospace' }}>
                          {req.title}
                        </p>
                        <p className="text-xs text-[#888] mt-1">
                          <span className="text-[#7c5cff] font-bold">{req.requester_username}</span> wants to borrow this
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleRequestAction(req.id, 'accept')}
                          className="min-h-[44px] px-3 py-2 text-xs text-white bg-[#4ade80] border-2 border-[#2d2d2d] active:bg-[#6ee7a0] sm:hover:bg-[#6ee7a0] transition-colors"
                          style={{ fontFamily: 'Silkscreen, cursive' }}
                        >
                          ✓ Lend
                        </button>
                        <button
                          onClick={() => handleRequestAction(req.id, 'decline')}
                          className="min-h-[44px] px-3 py-2 text-xs text-white bg-[#ef4444] border-2 border-[#2d2d2d] active:bg-[#f87171] sm:hover:bg-[#f87171] transition-colors"
                          style={{ fontFamily: 'Silkscreen, cursive' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* My Requests Section (outgoing — books I've asked to borrow) */}
            {myRequests.length > 0 && (
              <section className="pixel-card p-4 sm:p-6 bg-[#7c5cff]/5">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-2xl">📮</span>
                  <h2 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
                    My Requests
                  </h2>
                  <div className="flex-1 pixel-divider" />
                  <span className="pixel-card px-3 py-1 text-sm bg-[#7c5cff]/20">
                    {myRequests.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {myRequests.map((req) => {
                    const declined = req.status === 'declined';
                    return (
                      <div
                        key={req.id}
                        className="flex items-center gap-3 sm:gap-4 border-2 border-[#2d2d2d] bg-white p-3"
                      >
                        <div className="w-12 h-[72px] flex-shrink-0 bg-[#eee] border-2 border-[#2d2d2d] overflow-hidden">
                          {req.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={req.cover_url} alt={req.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">📖</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-tight line-clamp-2" style={{ fontFamily: 'VT323, monospace' }}>
                            {req.title}
                          </p>
                          <p className="text-xs text-[#888] mt-1">
                            Requested from{' '}
                            <span className="text-[#7c5cff] font-bold">{req.owner_username}</span>
                          </p>
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 text-[10px] border-2 border-[#2d2d2d] ${
                              declined ? 'bg-[#ef4444]/15 text-[#b91c1c]' : 'bg-[#ffd700]/25 text-[#8a6d00]'
                            }`}
                            style={{ fontFamily: 'Silkscreen, cursive' }}
                          >
                            {declined ? '✕ Declined' : '⏳ Pending'}
                          </span>
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="min-h-[44px] px-3 py-2 text-xs text-white bg-[#888] border-2 border-[#2d2d2d] active:bg-[#999] sm:hover:bg-[#999] transition-colors"
                            style={{ fontFamily: 'Silkscreen, cursive' }}
                            title={declined ? 'Dismiss' : 'Cancel request'}
                          >
                            {declined ? 'Dismiss' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* My Books Section */}
            {books.owned.length > 0 && (
              <section className="pixel-card p-4 sm:p-6">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
                    My Books
                  </h2>
                  <div className="flex-1 pixel-divider" />
                  <span className="pixel-card px-3 py-1 text-sm bg-[#4ade80]/20">
                    {books.owned.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {books.owned.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      type="owned"
                      onLend={handleLendClick}
                      onDelete={handleDelete}
                      onOpenDetail={setDetailBook}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Lending Section */}
            {books.lending.length > 0 && (
              <section className="pixel-card p-4 sm:p-6">
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
                    Lending Out
                  </h2>
                  <div className="flex-1 pixel-divider" />
                  <span className="pixel-card px-3 py-1 text-sm bg-[#ff6b9d]/20">
                    {books.lending.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {books.lending.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      type="lending"
                      onReturn={handleReturn}
                      onOpenDetail={setDetailBook}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Borrowed Section */}
            {books.borrowed.length > 0 && (
              <section className="pixel-card p-4 sm:p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-2xl">📖</span>
                  <h2 className="text-xl" style={{ fontFamily: 'Silkscreen, cursive' }}>
                    Borrowed
                  </h2>
                  <div className="flex-1 pixel-divider" />
                  <span className="pixel-card px-3 py-1 text-sm bg-[#7c5cff]/20">
                    {books.borrowed.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {books.borrowed.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      type="borrowed"
                      onReturnBorrowed={handleReturnBorrowed}
                      onOpenDetail={setDetailBook}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-[#2d2d2d] mt-8 bg-white/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-center text-[#888]">
            ✨ Track what you own, lend, and borrow ✨
          </p>
        </div>
      </footer>

      {/* Search Modal */}
      <BookSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectBook={handleSelectBook}
      />

      {/* Add Book Modal */}
      <AddBookModal
        isOpen={selectedBook !== null}
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onConfirm={handleAddBook}
      />

      {/* Lend Modal */}
      <LendModal
        isOpen={lendModal.isOpen}
        bookTitle={lendModal.bookTitle}
        onClose={() => setLendModal({ isOpen: false, bookId: '', bookTitle: '' })}
        onConfirm={handleLendConfirm}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        icon={confirmModal.icon}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
      />

      {/* Readers directory */}
      <ReadersModal
        isOpen={isReadersOpen}
        currentUsername={username}
        onClose={() => setIsReadersOpen(false)}
        onSelectReader={handleSelectReader}
      />

      {/* Viewing another reader's library — "Back" returns to the Readers list */}
      <ReaderLibraryModal
        isOpen={viewingReader !== null}
        readerUsername={viewingReader}
        currentUsername={username}
        requestedBookIds={requestedBookIds}
        onClose={() => {
          setViewingReader(null);
          setIsReadersOpen(true);
        }}
        onOpenBook={(book, ownerUsername, available) =>
          setDetailBook({ ...book, ownerUsername, available })
        }
      />

      {/* Find a book across all readers */}
      <FindBookModal
        isOpen={isFindOpen}
        currentUsername={username}
        requestedBookIds={requestedBookIds}
        onClose={() => setIsFindOpen(false)}
        onOpenBook={(book, ownerUsername, available) =>
          setDetailBook({ ...book, ownerUsername, available })
        }
        onOpenReader={(reader) => {
          setIsFindOpen(false);
          setViewingReader(reader);
        }}
        onRequestChange={fetchRequests}
      />

      {/* Book detail: synopsis + comments + likes, and where borrowing happens */}
      <BookDetailModal
        isOpen={detailBook !== null}
        book={detailBook}
        currentUsername={username}
        ownerUsername={detailBook?.ownerUsername ?? null}
        available={detailBook?.available ?? true}
        isRequested={detailBook ? requestedBookIds.has(detailBook.id) : false}
        onRequestChange={fetchRequests}
        onClose={() => setDetailBook(null)}
      />

      {/* Profile & notification email settings */}
      <ProfileSettingsModal
        isOpen={isProfileOpen}
        username={username}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}
