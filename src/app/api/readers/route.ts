import { NextRequest, NextResponse } from 'next/server';
import { getReaders, initializeDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();

    const exclude = request.nextUrl.searchParams.get('exclude') || undefined;
    const readers = await getReaders(exclude);
    return NextResponse.json({ readers });
  } catch (error) {
    console.error('Error fetching readers:', error);
    return NextResponse.json({ error: 'Failed to fetch readers' }, { status: 500 });
  }
}
