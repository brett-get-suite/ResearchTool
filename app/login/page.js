'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirect = (() => {
    const raw = searchParams.get('redirect') || '/';
    try {
      const url = new URL(raw, window.location.origin);
      if (url.origin !== window.location.origin) return '/';
      return url.pathname + url.search + url.hash;
    } catch { return '/'; }
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = redirect;
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid password.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* Subtle background glow */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--primary-container), transparent 70%)' }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/20 shadow-ambient">
          {/* Logo + Title */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-fab mb-4">
              <span className="material-symbols-outlined text-on-primary text-2xl">rocket_launch</span>
            </div>
            <h1 className="font-bold text-on-surface text-xl tracking-tight">AdPilot</h1>
            <p className="text-sm text-on-surface-variant mt-1">Enter your password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none placeholder:text-on-surface-variant/40 text-sm"
                placeholder="Enter admin password"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-error bg-error/10 rounded-xl px-3 py-2.5">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-on-primary text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  Signing in...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">login</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] text-on-surface-variant/60 text-center mt-6">
            Set via{' '}
            <code className="font-mono bg-surface-container-high px-1.5 py-0.5 rounded-lg text-primary/80">ADMIN_PASSWORD</code>{' '}
            env variable
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
