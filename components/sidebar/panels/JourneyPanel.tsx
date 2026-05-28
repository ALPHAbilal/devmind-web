/* Mock content — replaced with real data in a later phase. */

export function JourneyPanel() {
  return (
    <>
      <div className="journey-card active-journey">
        <div className="journey-header">
          <span className="journey-emoji">🏃</span>
          <span className="journey-name">Python Web Dev</span>
        </div>
        <div className="journey-progress">
          <div className="journey-bar">
            <div className="journey-fill" style={{ width: "68%" }} />
          </div>
          <span className="journey-pct">68%</span>
        </div>
        <div className="journey-steps">
          <div className="journey-step j-done">
            <span className="journey-step-dot" /> Python Basics
          </div>
          <div className="journey-step j-done">
            <span className="journey-step-dot" /> Flask Intro
          </div>
          <div className="journey-step j-current">
            <span className="journey-step-dot" /> Flask App
          </div>
          <div className="journey-step j-upcoming">
            <span className="journey-step-dot" /> REST APIs
          </div>
          <div className="journey-step j-upcoming">
            <span className="journey-step-dot" /> Deployment
          </div>
        </div>
      </div>

      <div className="panel-section-label">Other Journeys</div>

      <div className="journey-card">
        <div className="journey-header">
          <span className="journey-emoji">🎨</span>
          <span className="journey-name">Frontend</span>
        </div>
        <div className="journey-progress">
          <div className="journey-bar">
            <div className="journey-fill" style={{ width: "30%" }} />
          </div>
          <span className="journey-pct">30%</span>
        </div>
      </div>

      <div className="journey-card">
        <div className="journey-header">
          <span className="journey-emoji">🗃</span>
          <span className="journey-name">Databases</span>
        </div>
        <div className="journey-progress">
          <div className="journey-bar">
            <div className="journey-fill" style={{ width: "0%" }} />
          </div>
          <span className="journey-pct">0%</span>
        </div>
      </div>
    </>
  );
}
