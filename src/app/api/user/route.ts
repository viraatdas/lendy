import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, initializeDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();

    const { username } = await request.json();

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    if (username.length > 50) {
      return NextResponse.json(
        { error: 'Username must be 50 characters or less' },
        { status: 400 }
      );
    }

    const user = await getOrCreateUser(username);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error creating/getting user:', error);
    return NextResponse.json(
      { error: 'Failed to process user' },
      { status: 500 }
    );
  }
}
