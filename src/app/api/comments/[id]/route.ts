import { NextRequest, NextResponse } from 'next/server';
import { deleteComment, initializeDatabase } from '@/lib/db';

export async function DELETE(
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

    const deleted = await deleteComment(id, username);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Comment not found or not yours' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
