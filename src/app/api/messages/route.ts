import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, initializeDatabase } from '@/lib/db';
import { sendEmail, contactMessageEmail, getAppUrl } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const { toUsername, fromName, fromEmail, message } = await request.json();

    if (!toUsername || !fromName || !message) {
      return NextResponse.json(
        { error: 'toUsername, fromName and message are required' },
        { status: 400 }
      );
    }

    const profile = await getUserProfile(toUsername);
    if (!profile || !profile.email) {
      return NextResponse.json(
        { error: 'This reader has not set up an email to receive messages' },
        { status: 400 }
      );
    }

    const { subject, html } = contactMessageEmail({
      toUsername: profile.username,
      fromName: String(fromName).trim(),
      fromEmail: typeof fromEmail === 'string' && fromEmail.trim() ? fromEmail.trim() : null,
      message: String(message).trim(),
      appUrl: getAppUrl(),
    });

    const result = await sendEmail({ to: profile.email, subject, html });

    if (result && 'error' in result) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
