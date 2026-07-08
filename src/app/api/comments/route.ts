import { NextRequest, NextResponse } from 'next/server';
import { getComments, addComment, initializeDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const searchParams = request.nextUrl.searchParams;
    const bookId = searchParams.get('bookId');
    const viewer = searchParams.get('viewer') || '';
    const sort = searchParams.get('sort') === 'top' ? 'top' : 'new';

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
    }

    const comments = await getComments(bookId, viewer, sort);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const { bookId, username, body } = await request.json();
    if (!bookId || !username || !body || !String(body).trim()) {
      return NextResponse.json(
        { error: 'bookId, username and body are required' },
        { status: 400 }
      );
    }

    const trimmed = String(body).trim().slice(0, 2000);
    const comment = await addComment(bookId, username, trimmed);
    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
