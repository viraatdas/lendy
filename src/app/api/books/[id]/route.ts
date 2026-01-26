import { NextRequest, NextResponse } from 'next/server';
import { lendBook, returnBook, deleteBook, initializeDatabase } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();

    const { id } = await params;
    const { action, lentToName, borrowerUsername } = await request.json();

    if (action === 'lend') {
      if (!lentToName) {
        return NextResponse.json(
          { error: 'Recipient name is required' },
          { status: 400 }
        );
      }
      const book = await lendBook(id, lentToName, borrowerUsername);
      return NextResponse.json({ book });
    }

    if (action === 'return') {
      const book = await returnBook(id);
      return NextResponse.json({ book });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Failed to update book' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();

    const { id } = await params;
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const book = await deleteBook(id, username);

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found or you do not own it' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Failed to delete book' },
      { status: 500 }
    );
  }
}
