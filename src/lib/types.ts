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
  created_at: string;
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
