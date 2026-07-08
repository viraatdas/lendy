import { NextRequest, NextResponse } from 'next/server';
import { getPublicLibrary, initializeDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');
    const viewer = searchParams.get('viewer') || undefined;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const library = await getPublicLibrary(username, viewer);
    return NextResponse.json(library);
  } catch (error) {
    console.error('Error fetching library:', error);
    return NextResponse.json({ error: 'Failed to fetch library' }, { status: 500 });
  }
}
