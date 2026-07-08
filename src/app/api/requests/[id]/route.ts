import { NextRequest, NextResponse } from 'next/server';
import { updateRequestStatus, initializeDatabase } from '@/lib/db';
import { sendEmail, requestStatusEmail, getAppUrl } from '@/lib/email';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initializeDatabase();

    const { id } = await params;
    const { action, username } = await request.json();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const status = action === 'accept' ? 'accepted' : 'declined';
    const result = await updateRequestStatus(id, status, username);

    if (!result) {
      return NextResponse.json(
        { error: 'Request not found or you are not the owner' },
        { status: 404 }
      );
    }

    // Notify the requester of the decision
    if (result.requesterEmail) {
      const { subject, html } = requestStatusEmail({
        requesterUsername: result.request.requester_username,
        ownerUsername: result.request.owner_username,
        bookTitle: result.request.title,
        status,
        appUrl: getAppUrl(),
      });
      await sendEmail({ to: result.requesterEmail, subject, html });
    }

    return NextResponse.json({ request: result.request });
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
