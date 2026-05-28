import Link from "next/link";

export default function LandingPage() {
  return (
    <main
      className="theme-mission"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "48px 32px",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 32,
          fontWeight: 400,
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
        }}
      >
        DevMind
      </h1>
      <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>
        Scaffold up. Visit{" "}
        <Link
          href="/design-test"
          style={{ color: "var(--accent-green)", textDecoration: "underline" }}
        >
          /design-test
        </Link>{" "}
        to verify the tokens.
      </p>
    </main>
  );
}
