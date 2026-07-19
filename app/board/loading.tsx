/** Instant skeleton while the board SSR data loads — four ghost columns. */
export default function BoardLoading() {
  return (
    <div className="route-skel">
      <style>{`
        .route-skel { display: flex; gap: 18px; padding: 72px 22px 22px; height: 100vh; box-sizing: border-box; }
        .route-skel .sk-col { flex: 1; border-radius: 14px; background: rgba(127,127,127,0.06); }
        .route-skel .sk-col, .route-skel .sk-bar { animation: skel-pulse 1.2s ease-in-out infinite; }
        @keyframes skel-pulse { 50% { opacity: 0.45; } }
      `}</style>
      <div className="sk-col" />
      <div className="sk-col" />
      <div className="sk-col" />
      <div className="sk-col" />
    </div>
  );
}
