import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  userExists,
  initializeDatabase,
} from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Non-creating existence check (used by the sign-in form).
    if (searchParams.get('exists') !== null) {
      const exists = await userExists(username);
      return NextResponse.json({ exists });
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
      const result = await updateUserProfile(username, normalizedEmail, normalizedMessage);
      if ('error' in result) {
        return NextResponse.json(
          { error: 'That email is already used by another reader.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ user: result.user });
    }

    const user = await getOrCreateUser(username);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error creating/getting user:', error);
    return NextResponse.json({ error: 'Failed to process user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await initializeDatabase();

    const { username } = await request.json();
    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    await deleteUser(username);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
  }
}
