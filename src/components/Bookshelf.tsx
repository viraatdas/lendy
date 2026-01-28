'use client';

import { useState, useEffect, useCallback } from 'react';
import { Book } from '@/lib/types';
import BookCard from './BookCard';
import BookSearch from './BookSearch';
import AddBookModal from './AddBookModal';
import LendModal from './LendModal';
import ConfirmModal from './ConfirmModal';

interface BookshelfProps {
  username: string;
  onLogout: () => void;
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

export default function Bookshelf({ username, onLogout }: BookshelfProps) {
  const [books, setBooks] = useState<BooksState>({ owned: [], lending: [], borrowed: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
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

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

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
          const response = await fetch(`/api/books/${bookId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
          });

          if (response.ok) {
            fetchBooks();
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
    <div className="min-h-screen pixel-pattern">
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
              <div className="pixel-card px-3 py-1 text-sm">
                👤 {username}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="pixel-btn pixel-btn-pink text-sm"
              >
                📖 Add Book
              </button>
              <button
                onClick={onLogout}
                className="pixel-btn text-sm"
              >
                🚪 Switch
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
            {/* My Books Section */}
            {books.owned.length > 0 && (
              <section className="pixel-card p-4 sm:p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-2xl">📚</span>
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
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Lending Section */}
            {books.lending.length > 0 && (
              <section className="pixel-card p-4 sm:p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-2xl">🤝</span>
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
    </div>
  );
}
