import { NextRequest, NextResponse } from 'next/server';
import { toggleCommentLike, initializeDatabase } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();

    const { id } = await params;
    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const result = await toggleCommentLike(id, username);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
}
