import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ docs: [], numFound: 0 });
    }

    const encodedQuery = encodeURIComponent(query.trim());
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodedQuery}&limit=20&fields=key,title,author_name,cover_i,first_publish_year`,
      {
        headers: {
          'User-Agent': 'Lendy/1.0 (Book Lending App)',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from Open Library');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error searching books:', error);
    return NextResponse.json(
      { error: 'Failed to search books' },
      { status: 500 }
    );
  }
}
