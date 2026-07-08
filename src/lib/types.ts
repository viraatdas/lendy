export interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  open_library_key: string;
  owner_username: string;
  borrower_username: string | null;
  lent_to_name: string | null;
  borrowed_from_name: string | null;
  created_at: string;
}

export interface User {
  username: string;
  email: string | null;
  contact_message: string | null;
  created_at: string;
}

// A user's profile as returned from GET /api/user
export interface UserProfile {
  username: string;
  email: string | null;
  contact_message: string | null;
}

// One entry in the "Readers" directory (GET /api/readers)
export interface ReaderSummary {
  username: string;
  book_count: number;
  last_activity: string | null;
  last_action: string;
}

// A book request (borrow request) between two users
export interface BookRequest {
  id: string;
  book_id: string;
  requester_username: string;
  owner_username: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

// An incoming request joined with its book info (GET /api/requests)
export interface RequestItem extends BookRequest {
  title: string;
  author: string;
  cover_url: string | null;
}

// A book in a public library view, with whether the viewer has requested it
export interface PublicBook extends Book {
  requested: boolean;
}

// Google Books API types
export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

export interface GoogleBooksResponse {
  items?: GoogleBook[];
  totalItems: number;
}

// Legacy Open Library types (keeping for reference)
export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
}

export interface SearchResult {
  docs: OpenLibraryBook[];
  numFound: number;
}
