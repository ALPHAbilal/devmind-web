/** Instant skeleton while a notebook SSR loads — ghost reading column. */
export default function NotebookLoading() {
  return (
    <div className="route-skel-nb">
      <style>{`
        .route-skel-nb { max-width: 780px; margin: 0 auto; padding: 48px 32px; display: flex; flex-direction: column; gap: 18px; }
        .route-skel-nb .sk { border-radius: 8px; background: rgba(127,127,127,0.08); animation: skel-pulse 1.2s ease-in-out infinite; }
        @keyframes skel-pulse { 50% { opacity: 0.45; } }
      `}</style>
      <div className="sk" style={{ height: 28, width: "55%" }} />
      <div className="sk" style={{ height: 14, width: "90%" }} />
      <div className="sk" style={{ height: 14, width: "84%" }} />
      <div className="sk" style={{ height: 120 }} />
      <div className="sk" style={{ height: 14, width: "88%" }} />
      <div className="sk" style={{ height: 14, width: "70%" }} />
      <div className="sk" style={{ height: 120 }} />
    </div>
  );
}
