export interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  open_library_key: string;
  owner_username: string;
  borrower_username: string | null;
  lent_to_name: string | null;
  created_at: string;
}

export interface User {
  username: string;
  created_at: string;
}

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
