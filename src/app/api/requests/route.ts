import { NextRequest, NextResponse } from 'next/server';
import { createRequest, getIncomingRequests, initializeDatabase } from '@/lib/db';
import { sendEmail, bookRequestEmail, getAppUrl } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const username = request.nextUrl.searchParams.get('username');
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const requests = await getIncomingRequests(username);
    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const { bookId, requesterUsername } = await request.json();
    if (!bookId || !requesterUsername) {
      return NextResponse.json(
        { error: 'bookId and requesterUsername are required' },
        { status: 400 }
      );
    }

    const result = await createRequest(bookId, requesterUsername);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Fire off notification email to the owner (non-blocking failures are fine)
    if (result.ownerEmail) {
      const { subject, html } = bookRequestEmail({
        ownerUsername: result.book.owner_username,
        requesterUsername: requesterUsername.toLowerCase().trim(),
        bookTitle: result.book.title,
        bookAuthor: result.book.author,
        coverUrl: result.book.cover_url,
        appUrl: getAppUrl(),
      });
      await sendEmail({ to: result.ownerEmail, subject, html });
    }

    return NextResponse.json({ request: result.request });
  } catch (error) {
    console.error('Error creating request:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
