import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateUser,
  getUserProfile,
  updateUserProfile,
  initializeDatabase,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const username = request.nextUrl.searchParams.get('username');
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Ensure the user row exists, then return the profile
    await getOrCreateUser(username);
    const user = await getUserProfile(username);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const { username, email, contactMessage } = await request.json();

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    if (username.length > 50) {
      return NextResponse.json(
        { error: 'Username must be 50 characters or less' },
        { status: 400 }
      );
    }

    // If profile fields are provided, update them; otherwise just get/create.
    if (email !== undefined || contactMessage !== undefined) {
      const normalizedEmail =
        typeof email === 'string' && email.trim().length > 0 ? email.trim() : null;
      const normalizedMessage =
        typeof contactMessage === 'string' && contactMessage.trim().length > 0
          ? contactMessage.trim()
          : null;
      const user = await updateUserProfile(username, normalizedEmail, normalizedMessage);
      return NextResponse.json({ user });
    }

    const user = await getOrCreateUser(username);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error creating/getting user:', error);
    return NextResponse.json({ error: 'Failed to process user' }, { status: 500 });
  }
}
