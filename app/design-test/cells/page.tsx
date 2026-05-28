import { CellRenderer } from "@/components/notebook/cells";
import type { Cell } from "@/components/notebook/cells";
import "@/components/notebook/cells/cells.css";

/* ============================================================================
 * /design-test/cells
 *
 * Visual verifier for the notebook cell renderers — see demo-notebook.html
 * (lines ~2465–2600). Pure mock data, no Realtime, no Supabase.
 *
 * Open this side-by-side with the demo. The five cell kinds plus an error
 * output should match the demo's `.cell-*` styling.
 * ========================================================================== */

const MOCK_MISSION = "00000000-0000-0000-0000-000000000000";
const baseMeta = {
  mission_id: MOCK_MISSION,
  source: "agent" as const,
  created_at: "2026-05-28T00:00:00Z",
  updated_at: "2026-05-28T00:00:00Z",
  language: null,
  attached_file: null,
  attached_to: null,
};

const CELLS: Cell[] = [
  {
    ...baseMeta,
    id: "s1",
    ord: 1,
    kind: "section",
    content: "Step 1\nWhat is Flask?",
  },
  {
    ...baseMeta,
    id: "m1",
    ord: 2,
    kind: "markdown",
    content:
      "**Flask** is a lightweight Python web framework. It gives you just enough to build a web app — routes, templates, and a development server — without imposing structure.\n\n> Think of Flask as a food truck vs a full restaurant. You get exactly what you need, set up fast, and can customize everything.",
  },
  {
    ...baseMeta,
    id: "c1",
    ord: 3,
    kind: "code",
    language: "python",
    attached_file: "app.py",
    content: `from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello, World!'
`,
  },
  {
    ...baseMeta,
    id: "o1",
    ord: 4,
    kind: "output",
    attached_to: "c1",
    content: " * Running on http://127.0.0.1:5000\n * Debug mode: on",
    exit_code: 0,
  },
  {
    ...baseMeta,
    id: "d1",
    ord: 5,
    kind: "divider",
    content: "",
  },
  {
    ...baseMeta,
    id: "s2",
    ord: 6,
    kind: "section",
    content: "Step 2\nTemplates & HTML",
  },
  {
    ...baseMeta,
    id: "m2",
    ord: 7,
    kind: "markdown",
    content:
      "Returning raw strings gets old fast. `render_template()` lets you use **HTML files** with dynamic data.",
  },
  {
    ...baseMeta,
    id: "c2",
    ord: 8,
    kind: "code",
    language: "html",
    attached_file: "templates/index.html",
    content: `<!DOCTYPE html>
<html>
<body>
  <h1>Welcome to {{ title }}</h1>
  <p>Built with Flask & Jinja2</p>
</body>
</html>
`,
  },
  {
    ...baseMeta,
    id: "c3",
    ord: 9,
    kind: "code",
    language: "sql",
    attached_file: null,
    content: `SELECT * FROM user
ORDER BY username;
`,
  },
  {
    ...baseMeta,
    id: "o2",
    ord: 10,
    kind: "output",
    attached_to: "c3",
    content:
      "Traceback (most recent call last):\n  File \"app.py\", line 6, in <module>\n    return render_templat(...)\nNameError: name 'render_templat' is not defined",
    exit_code: 1,
  },
];

export default function CellsDesignTestPage() {
  return (
    <div className="theme-notebook" style={{ minHeight: "100vh" }}>
      <div
        style={{
          maxWidth: 780,
          margin: "0 auto",
          padding: "32px 24px 80px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: 1.5,
            marginBottom: 4,
          }}
        >
          /design-test/cells
        </div>
        <div
          style={{
            fontSize: 22,
            color: "var(--text-primary)",
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          Notebook cell renderers
        </div>
        {CELLS.map((cell) => (
          <CellRenderer key={cell.id} cell={cell} />
        ))}
      </div>
    </div>
  );
}
