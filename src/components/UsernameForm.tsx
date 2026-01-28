'use client';

import { useState } from 'react';

interface UsernameFormProps {
  onSubmit: (username: string) => void;
  isLoading: boolean;
}

export default function UsernameForm({ onSubmit, isLoading }: UsernameFormProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pixel-pattern">
      {/* Decorative floating books */}
      <div className="hidden sm:fixed sm:block top-20 left-10 text-4xl float-animation opacity-50">📚</div>
      <div className="hidden sm:fixed sm:block top-40 right-20 text-3xl float-animation opacity-50" style={{ animationDelay: '1s' }}>📖</div>
      <div className="hidden sm:fixed sm:block bottom-32 left-20 text-3xl float-animation opacity-50" style={{ animationDelay: '0.5s' }}>📕</div>
      <div className="hidden sm:fixed sm:block bottom-20 right-10 text-4xl float-animation opacity-50" style={{ animationDelay: '1.5s' }}>📗</div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-block pixel-card p-6 mb-6">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: 'Silkscreen, cursive' }}>
              <span className="text-[#ff6b9d]">L</span>
              <span className="text-[#7c5cff]">e</span>
              <span className="text-[#ffd700]">n</span>
              <span className="text-[#4ade80]">d</span>
              <span className="text-[#60a5fa]">y</span>
            </h1>
          </div>
          <p className="text-xl text-[#666]">
            ✨ Your cozy book lending library ✨
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="pixel-card p-6">
            <label
              htmlFor="username"
              className="block text-sm mb-3 uppercase tracking-widest"
              style={{ fontFamily: 'Silkscreen, cursive' }}
            >
              Enter your name
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Type here..."
              className="pixel-input w-full text-xl"
              maxLength={50}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!username.trim() || isLoading}
            className="pixel-btn pixel-btn-pink w-full text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ Loading...' : '🎮 Start Reading!'}
          </button>
        </form>

        <p className="mt-8 text-center text-lg text-[#888]">
          📌 Use the same name to find your books anywhere!
        </p>

        {/* Decorative sparkles */}
        <div className="flex justify-center gap-4 mt-6">
          <span className="sparkle">⭐</span>
          <span className="sparkle" style={{ animationDelay: '0.3s' }}>✨</span>
          <span className="sparkle" style={{ animationDelay: '0.6s' }}>⭐</span>
        </div>
      </div>
    </div>
  );
}
