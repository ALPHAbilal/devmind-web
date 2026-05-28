export function HistoryPanel() {
  return (
    <>
      <div className="panel-section-label">Today</div>

      <div className="session-item active-session">
        <div className="session-dot s-active" />
        <div className="session-info">
          <div className="session-title">Flask App</div>
          <div className="session-meta">Step 3 · Database</div>
        </div>
        <span className="session-time">2h</span>
      </div>

      <div className="session-item">
        <div className="session-dot s-done" />
        <div className="session-info">
          <div className="session-title">Flask Intro</div>
          <div className="session-meta">Completed</div>
        </div>
        <span className="session-time">4h</span>
      </div>

      <div className="panel-section-label">Yesterday</div>

      <div className="session-item">
        <div className="session-dot s-done" />
        <div className="session-info">
          <div className="session-title">Python Basics</div>
          <div className="session-meta">Completed</div>
        </div>
        <span className="session-time">Tue</span>
      </div>

      <div className="session-item">
        <div className="session-dot s-paused" />
        <div className="session-info">
          <div className="session-title">Git Fundamentals</div>
          <div className="session-meta">Step 5 · Branching</div>
        </div>
        <span className="session-time">Mon</span>
      </div>

      <div className="panel-section-label">Earlier</div>

      <div className="session-item">
        <div className="session-dot s-done" />
        <div className="session-info">
          <div className="session-title">HTML &amp; CSS</div>
          <div className="session-meta">Completed</div>
        </div>
        <span className="session-time">Jan 28</span>
      </div>
    </>
  );
}
