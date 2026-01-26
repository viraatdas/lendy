'use client';

import { useState, useEffect, useCallback } from 'react';
import { Book } from '@/lib/types';
import BookCard from './BookCard';
import BookSearch from './BookSearch';
import LendModal from './LendModal';

interface BookshelfProps {
  username: string;
  onLogout: () => void;
}

interface BooksState {
  owned: Book[];
  lending: Book[];
  borrowed: Book[];
}

export default function Bookshelf({ username, onLogout }: BookshelfProps) {
  const [books, setBooks] = useState<BooksState>({ owned: [], lending: [], borrowed: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [lendModal, setLendModal] = useState<{ isOpen: boolean; bookId: string; bookTitle: string }>({
    isOpen: false,
    bookId: '',
    bookTitle: '',
  });

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

  const handleAddBook = async (book: {
    title: string;
    author: string;
    coverUrl: string | null;
    openLibraryKey: string;
  }) => {
    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          openLibraryKey: book.openLibraryKey,
        }),
      });

      if (response.ok) {
        fetchBooks();
      }
    } catch (error) {
      console.error('Error adding book:', error);
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

  const handleDelete = async (bookId: string) => {
    if (!confirm('Are you sure you want to remove this book?')) return;

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
  };

  const totalBooks = books.owned.length + books.lending.length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extralight tracking-tight text-black">
                Lendy
              </h1>
              <p className="text-xs font-light text-gray-400 mt-1">
                {username}&apos;s library
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="px-4 py-2 text-sm font-light text-white bg-black hover:bg-gray-800 transition-colors"
              >
                + Add Book
              </button>
              <button
                onClick={onLogout}
                className="text-xs font-light text-gray-400 hover:text-black transition-colors"
              >
                Switch User
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="text-center py-24">
            <p className="text-sm font-light text-gray-400">Loading your library...</p>
          </div>
        ) : totalBooks === 0 && books.borrowed.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-sm font-light text-gray-400 mb-4">
              Your library is empty
            </p>
            <button
              onClick={() => setIsSearchOpen(true)}
              className="text-sm font-light text-black underline underline-offset-4 hover:no-underline transition-all"
            >
              Add your first book
            </button>
          </div>
        ) : (
          <div className="space-y-16">
            {/* My Books Section */}
            {books.owned.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-sm font-light text-black uppercase tracking-widest">
                    My Books
                  </h2>
                  <span className="text-xs font-light text-gray-300">
                    {books.owned.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
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
              <section>
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-sm font-light text-black uppercase tracking-widest">
                    Lending Out
                  </h2>
                  <span className="text-xs font-light text-gray-300">
                    {books.lending.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
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
              <section>
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-sm font-light text-black uppercase tracking-widest">
                    Borrowed
                  </h2>
                  <span className="text-xs font-light text-gray-300">
                    {books.borrowed.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {books.borrowed.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      type="borrowed"
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Search Modal */}
      <BookSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectBook={handleAddBook}
      />

      {/* Lend Modal */}
      <LendModal
        isOpen={lendModal.isOpen}
        bookTitle={lendModal.bookTitle}
        onClose={() => setLendModal({ isOpen: false, bookId: '', bookTitle: '' })}
        onConfirm={handleLendConfirm}
      />
    </div>
  );
}
