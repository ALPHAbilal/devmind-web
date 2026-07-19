/** Instant skeleton while the branch workspace SSR loads — ghost hub grid. */
export default function BranchesLoading() {
  return (
    <div className="route-skel-br">
      <style>{`
        .route-skel-br { max-width: 980px; margin: 0 auto; padding: 72px 32px; }
        .route-skel-br .sk { border-radius: 12px; background: rgba(127,127,127,0.07); animation: skel-pulse 1.2s ease-in-out infinite; }
        .route-skel-br .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-top: 22px; }
        @keyframes skel-pulse { 50% { opacity: 0.45; } }
      `}</style>
      <div className="sk" style={{ height: 26, width: 260 }} />
      <div className="grid">
        <div className="sk" style={{ height: 130 }} />
        <div className="sk" style={{ height: 130 }} />
        <div className="sk" style={{ height: 130 }} />
        <div className="sk" style={{ height: 130 }} />
      </div>
    </div>
  );
}
