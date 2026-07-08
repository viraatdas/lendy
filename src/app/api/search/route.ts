import { NextRequest, NextResponse } from 'next/server';
import type { GoogleBook } from '@/lib/types';

const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

// Simple in-memory cache to cut down on Google Books quota usage. On Vercel
// Fluid Compute the instance is reused across requests, so repeat searches
// (very common while typing) are served without hitting the API again.
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map<string, { items: GoogleBook[]; ts: number }>();

function upgradeToHttps(url?: string): string | undefined {
  if (!url) return url;
  return url.replace(/^http:\/\//i, 'https://');
}

// Normalize a raw Google Books item: keep the shape the client expects, but
// force all cover image URLs to https so they aren't blocked as mixed content.
function normalize(item: GoogleBook): GoogleBook {
  const links = item.volumeInfo?.imageLinks;
  return {
    ...item,
    volumeInfo: {
      ...item.volumeInfo,
      imageLinks: links
        ? {
            thumbnail: upgradeToHttps(links.thumbnail),
            smallThumbnail: upgradeToHttps(links.smallThumbnail),
          }
        : undefined,
    },
  };
}

async function fetchFromGoogle(query: string, signal: AbortSignal): Promise<GoogleBook[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: '12',
    printType: 'books',
    country: 'US', // Google Books now requires a country param for some regions
  });
  if (GOOGLE_BOOKS_API_KEY) params.set('key', GOOGLE_BOOKS_API_KEY);

  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Google Books ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const items: GoogleBook[] = Array.isArray(data.items) ? data.items : [];
  return items.map(normalize);
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('q') || '';
  const query = raw.trim();

  if (query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ items: cached.items, cached: true });
  }

  // Try up to 2 times with a timeout, to ride out transient rate-limit blips.
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const items = await fetchFromGoogle(query, controller.signal);
      clearTimeout(timeout);
      cache.set(key, { items, ts: Date.now() });
      return NextResponse.json({ items });
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 300)); // brief backoff
    }
  }

  console.error('Error searching books:', lastError);
  // Serve a stale cached result if we have one, rather than failing the user.
  if (cached) {
    return NextResponse.json({ items: cached.items, stale: true });
  }
  return NextResponse.json(
    { error: 'Book search is busy right now. Please try again in a moment.', items: [] },
    { status: 503 }
  );
}
