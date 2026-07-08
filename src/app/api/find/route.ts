import { NextRequest, NextResponse } from 'next/server';
import { findBooks, initializeDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const searchParams = request.nextUrl.searchParams;
    const q = (searchParams.get('q') || '').trim();
    const viewer = searchParams.get('viewer') || '';

    if (q.length < 2) {
      return NextResponse.json({ books: [] });
    }

    const books = await findBooks(q, viewer);
    return NextResponse.json({ books });
  } catch (error) {
    console.error('Error finding books:', error);
    return NextResponse.json({ error: 'Failed to search books' }, { status: 500 });
  }
}
