'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY || posthog.__loaded) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      defaults: '2025-05-24',
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: 'identified_only',
    });
  }, []);

  // When no key is configured, render children untouched (analytics disabled).
  if (!POSTHOG_KEY) return <>{children}</>;

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
