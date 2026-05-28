import "./step-indicator.css";

const LABELS = ["Topic", "Level", "Shape", "Mission"] as const;

interface StepIndicatorProps {
  current: 1 | 2 | 3 | 4;
}

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="step-indicator">
      {LABELS.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4;
        const state =
          n < current ? "is-done" : n === current ? "is-active" : "";
        return (
          <div key={label} className={`step-item ${state}`}>
            <div className="step-dot">{n < current ? "✓" : n}</div>
            <span className="step-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
