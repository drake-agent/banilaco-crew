'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Sign in logic would go here
      // Example: await supabaseClient.auth.signInWithPassword({ email, password })
      console.log('Sign in:', { email, password });
    } catch (err) {
      setError('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-linear-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
            banilaco crew
          </h1>
        </div>

        {/* Card */}
        <div className="border border-gray-200 rounded-lg shadow-sm p-8">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-8">
            <button
              onClick={() => setActiveTab('signin')}
              className={`flex-1 pb-4 font-medium transition-colors ${
                activeTab === 'signin'
                  ? 'text-gray-900 border-b-2 border-amber-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 pb-4 font-medium transition-colors ${
                activeTab === 'signup'
                  ? 'text-gray-900 border-b-2 border-amber-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Sign In Tab */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <Link href="/forgot-password" className="text-amber-600 hover:text-amber-700">
                  Forgot password?
                </Link>
              </div>

              <div className="pt-4 text-sm text-center">
                <span className="text-gray-600">Don't have an account? </span>
                <Link href="/join" className="text-amber-600 hover:text-amber-700 font-medium">
                  Apply here
                </Link>
              </div>
            </form>
          )}

          {/* Sign Up Tab */}
          {activeTab === 'signup' && (
            <div className="space-y-6">
              <p className="text-gray-700 text-center">
                Want to join the Banilaco Crew? Apply through our creator program.
              </p>
              <Link
                href="/join"
                className="block w-full py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition text-center"
              >
                Go to Creator Application
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
