export function SettingsPanel({ userEmail }: { userEmail: string }) {
  return (
    <>
      <div className="panel-section-label">Preferences</div>
      <div className="setting-item">
        <span className="setting-label">Theme</span>
        <span className="setting-value">Forest Dark</span>
      </div>
      <div className="setting-item">
        <span className="setting-label">Code Font</span>
        <span className="setting-value">Cascadia Code</span>
      </div>
      <div className="setting-item">
        <span className="setting-label">AI Voice</span>
        <span className="setting-value">Concise</span>
      </div>

      <div className="setting-divider" />

      <div className="panel-section-label">Account</div>
      <div className="setting-item">
        <span className="setting-label">{userEmail}</span>
        <span className="setting-value">Pro</span>
      </div>
      <form action="/api/auth/signout" method="POST">
        <button
          type="submit"
          className="setting-item"
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            font: "inherit",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span className="setting-label">Sign out</span>
          <span className="setting-value">→</span>
        </button>
      </form>
    </>
  );
}
