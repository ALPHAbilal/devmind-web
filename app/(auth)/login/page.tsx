"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "../auth.css";

/**
 * Wrapping LoginForm in Suspense is required by Next.js 15: useSearchParams()
 * suspends during prerendering. Without the boundary, `next build` aborts
 * with "useSearchParams() should be wrapped in a suspense boundary". The
 * skeleton is the static fallback shown during prerender + initial CSR.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <main className="theme-wizard auth-page">
      <div className="auth-card" aria-hidden="true">
        <div className="auth-header">
          <span className="auth-greeting">Welcome back</span>
          <h1 className="auth-title">Sign in to DevMind</h1>
        </div>
        <div className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              disabled
              placeholder="you@example.com"
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              disabled
              placeholder="••••••••"
            />
          </div>
          <button type="button" className="auth-submit" disabled>
            Loading…
          </button>
        </div>
      </div>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/notebooks/new";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <main className="theme-wizard auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-greeting">Welcome back</span>
          <h1 className="auth-title">Sign in to DevMind</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="auth-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              placeholder="you@example.com"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="auth-input"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting || !email || !password}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
