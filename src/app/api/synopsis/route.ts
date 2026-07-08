import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — synopses don't change
const cache = new Map<string, { data: unknown; ts: number }>();

export async function GET(request: NextRequest) {
  const volumeId = request.nextUrl.searchParams.get('volumeId');
  if (!volumeId) {
    return NextResponse.json({ error: 'volumeId is required' }, { status: 400 });
  }

  const cached = cache.get(volumeId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const params = new URLSearchParams({ country: 'US' });
  if (GOOGLE_BOOKS_API_KEY) params.set('key', GOOGLE_BOOKS_API_KEY);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(volumeId)}?${params.toString()}`,
      { headers: { Accept: 'application/json' }, signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      // Don't fail the UI — just return an empty synopsis.
      return NextResponse.json(empty());
    }

    const data = await res.json();
    const vi = data.volumeInfo || {};
    const result = {
      description: typeof vi.description === 'string' ? vi.description : null,
      pageCount: vi.pageCount ?? null,
      categories: Array.isArray(vi.categories) ? vi.categories : [],
      publishedDate: vi.publishedDate ?? null,
      averageRating: vi.averageRating ?? null,
      ratingsCount: vi.ratingsCount ?? null,
      publisher: vi.publisher ?? null,
    };
    cache.set(volumeId, { data: result, ts: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    clearTimeout(timeout);
    console.error('Error fetching synopsis:', error);
    return NextResponse.json(empty());
  }
}

function empty() {
  return {
    description: null,
    pageCount: null,
    categories: [],
    publishedDate: null,
    averageRating: null,
    ratingsCount: null,
    publisher: null,
  };
}
