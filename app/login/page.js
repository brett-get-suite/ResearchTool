'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirect = searchParams.get('redirect') || '/';

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
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-sm">
        <div className="card p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[22px]">lock</span>
            </div>
            <div>
              <p className="font-headline font-bold text-on-surface text-lg leading-tight">PPC Recon</p>
              <p className="text-xs text-secondary">Enter your password to continue</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-label font-semibold text-secondary mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-input w-full"
                placeholder="••••••••"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-[14px]">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="pill-btn-primary w-full justify-center disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  Signing in…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="text-[10px] text-secondary text-center mt-6">
            Set your password via the{' '}
            <code className="font-mono bg-surface-high px-1 rounded">ADMIN_PASSWORD</code>{' '}
            environment variable.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
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
