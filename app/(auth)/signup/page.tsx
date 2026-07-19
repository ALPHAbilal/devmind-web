"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "../auth.css";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    // If email confirmation is enabled, session is null until the user clicks
    // the link. Otherwise we get a session immediately.
    if (data.session) {
      router.push("/notebooks/new");
      router.refresh();
    } else {
      setInfo(
        "Check your email for a confirmation link to finish creating your account.",
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="theme-wizard auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-greeting">First time here?</span>
          <h1 className="auth-title">Create your DevMind account</h1>
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
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          {info && (
            <div
              className="auth-error"
              role="status"
              style={{
                background: "var(--accent-green-soft)",
                borderColor: "var(--accent-green-border)",
                color: "var(--accent-green)",
              }}
            >
              {info}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={submitting || !email || !password}
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
