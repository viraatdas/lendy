'use client';

import { useState, useEffect } from 'react';
import posthog from 'posthog-js';
import UsernameForm from '@/components/UsernameForm';
import Bookshelf from '@/components/Bookshelf';

const STORAGE_KEY = 'lendy_username';

// Associate analytics events with the Lendy username (no-op if PostHog is disabled).
function identifyUser(username: string) {
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.identify(username);
  }
}

export default function Home() {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check for saved username on mount
    const savedUsername = localStorage.getItem(STORAGE_KEY);
    if (savedUsername) {
      setUsername(savedUsername);
      identifyUser(savedUsername);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (newUsername: string) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername }),
      });

      if (response.ok) {
        const data = await response.json();
        const normalizedUsername = data.user.username;
        localStorage.setItem(STORAGE_KEY, normalizedUsername);
        setUsername(normalizedUsername);
        identifyUser(normalizedUsername);
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking for saved username
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-extralight tracking-tight text-black mb-2">
            Lendy
          </h1>
          <p className="text-sm font-light text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show username form if not logged in
  if (!username) {
    return <UsernameForm onSubmit={handleLogin} isLoading={isSubmitting} />;
  }

  // Show bookshelf if logged in
  return <Bookshelf username={username} />;
}
