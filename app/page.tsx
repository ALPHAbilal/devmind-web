import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      redirect("/board");
    }
  } catch {
    // Fall through to the unauthenticated landing.
  }

  return (
    <main
      className="theme-notebook"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: "48px 32px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 24 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 64,
            fontWeight: 400,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            margin: 0,
            lineHeight: 1,
          }}
        >
          DevMind
        </h1>

        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontStyle: "italic",
            color: "var(--text-secondary)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          An AI tutor that learns alongside you.
        </p>

        <p
          style={{
            fontSize: 15,
            color: "var(--text-tertiary)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Pick a topic you want to learn. DevMind builds you a custom coding
          notebook, drops you into a real sandbox, and stays nearby — answering
          questions, giving hints, and running a structured debugger when you
          get stuck.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            marginTop: 16,
          }}
        >
          <Link
            href="/signup"
            style={{
              display: "inline-block",
              padding: "14px 28px",
              borderRadius: "var(--radius-md)",
              background: "var(--accent-green)",
              color: "var(--bg-base)",
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
              letterSpacing: "-0.01em",
              transition: "var(--transition-fast)",
            }}
          >
            Start your first notebook
          </Link>

          <Link
            href="/login"
            style={{
              color: "var(--text-tertiary)",
              fontSize: 13,
              textDecoration: "underline",
              textDecorationColor: "var(--border-medium)",
              textUnderlineOffset: 4,
            }}
          >
            I already have an account
          </Link>
        </div>
      </div>

      <p
        style={{
          position: "absolute",
          bottom: 24,
          color: "var(--text-quaternary)",
          fontSize: 12,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        MVP — single learner mode
      </p>
    </main>
  );
}
