import { NextRequest, NextResponse } from 'next/server';
import { getUserBooks, addBook, initializeDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const books = await getUserBooks(username);
    return NextResponse.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const { username, title, author, coverUrl, openLibraryKey } = await request.json();

    if (!username || !title) {
      return NextResponse.json(
        { error: 'Username and title are required' },
        { status: 400 }
      );
    }

    const book = await addBook(username, title, author || 'Unknown Author', coverUrl, openLibraryKey);
    return NextResponse.json({ book });
  } catch (error) {
    console.error('Error adding book:', error);
    return NextResponse.json(
      { error: 'Failed to add book' },
      { status: 500 }
    );
  }
}
