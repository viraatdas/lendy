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
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extralight tracking-tight text-black mb-3">
            Lendy
          </h1>
          <p className="text-sm font-light text-gray-500 tracking-wide">
            Your personal book lending library
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-light text-gray-400 uppercase tracking-widest mb-2"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-0 py-3 bg-transparent border-0 border-b border-gray-200 text-lg font-light text-black placeholder-gray-300 focus:outline-none focus:border-black transition-colors"
              maxLength={50}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!username.trim() || isLoading}
            className="w-full py-3 text-sm font-light tracking-widest uppercase text-white bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Loading...' : 'Enter Library'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-light text-gray-400">
          Use the same username to access your books from any device
        </p>
      </div>
    </div>
  );
}
