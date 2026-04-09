'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function InvitePage() {
  const { token } = useParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tenantName, setTenantName] = useState('');
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    fetch(`/api/auth/register?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setTenantName(data.tenantName);
        } else {
          setInvalid(true);
        }
      })
      .catch(() => setInvalid(true))
      .finally(() => setChecking(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password, name }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = '/';
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined text-2xl animate-spin text-primary">progress_activity</span>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/20 shadow-ambient max-w-sm text-center">
          <span className="material-symbols-outlined text-4xl text-error mb-4">link_off</span>
          <h1 className="font-bold text-on-surface text-lg mb-2">Invalid Invite</h1>
          <p className="text-sm text-on-surface-variant">This invite link is expired or has already been used.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--primary-container), transparent 70%)' }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/20 shadow-ambient">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-fab mb-4">
              <span className="material-symbols-outlined text-on-primary text-2xl">person_add</span>
            </div>
            <h1 className="font-bold text-on-surface text-xl tracking-tight">Join AdPilot</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              You&apos;ve been invited to <span className="font-semibold text-on-surface">{tenantName}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none placeholder:text-on-surface-variant/40 text-sm"
                placeholder="Your name"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none placeholder:text-on-surface-variant/40 text-sm"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-high text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none placeholder:text-on-surface-variant/40 text-sm"
                placeholder="At least 8 characters"
                minLength={8}
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
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-on-primary text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  Creating account...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">how_to_reg</span>
                  Create Account
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
