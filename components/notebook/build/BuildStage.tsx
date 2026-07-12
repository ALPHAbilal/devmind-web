"use client";

/**
 * BuildStage — the right-side workspace ("the Stage" in demo-notebook.html).
 * Same shape as PuzzlePane: a client <aside> driven by NotebookProvider state,
 * overlaid on the notebook. Code tab only for now — file drawer + Monaco editor
 * + terminal, all wired to the real run path (POST /api/runs → an `output`
 * notebook_cell arrives via Realtime, which we surface in the terminal).
 *
 * Preview/Database tabs from the demo are intentionally omitted until their
 * backends exist (file-serving / SQL-rows endpoints) — no faked logic here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import {
  buildMonacoTheme,
  DEVMIND_MONACO_THEME,
  readThemeColors,
} from "@/lib/monaco-theme";
import { useNotebook } from "../NotebookProvider";
import type { Cell } from "../cells";
import "./build-stage.css";

const MONACO_LANG: Record<string, string> = {
  python: "python",
  py: "python",
  html: "html",
  markup: "html",
  sql: "sql",
  bash: "shell",
  sh: "shell",
  json: "json",
  ts: "typescript",
  typescript: "typescript",
  js: "javascript",
  javascript: "javascript",
};

const FILE_ICON: Record<string, string> = {
  py: "🐍",
  html: "📄",
  sql: "🗄️",
  css: "🎨",
  json: "⚙️",
};

function iconFor(name: string): string {
  const ext = name.split(".").pop() ?? "";
  return FILE_ICON[ext] ?? "📄";
}

interface StageFile {
  cellId: string;
  name: string;
  language: string;
  content: string;
}

export function BuildStage({ cells }: { cells: Cell[] }) {
  const {
    missionId,
    sessionActive,
    stageExpanded,
    closeStage,
    toggleStageExpanded,
  } = useNotebook();

  // Files = the notebook's code cells that write to a workspace file.
  const files = useMemo<StageFile[]>(
    () =>
      cells
        .filter((c) => c.kind === "code" && c.attached_file)
        .map((c) => ({
          cellId: c.id,
          name: c.attached_file as string,
          language: c.language ?? "python",
          content: c.content,
        })),
    [cells],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeFile = useMemo(
    () => files.find((f) => f.cellId === activeId) ?? files[0] ?? null,
    [files, activeId],
  );

  // Editor buffer, keyed to the active file. Follows the file when it changes.
  const [buffer, setBuffer] = useState("");
  useEffect(() => {
    setBuffer(activeFile?.content ?? "");
  }, [activeFile?.cellId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [running, setRunning] = useState(false);
  const [runNote, setRunNote] = useState<string | null>(null);

  // Terminal output = the latest `output` cell attached to the active file's
  // code cell (arrives via Realtime through NotebookContent's `cells`).
  const outputForActive = useMemo(() => {
    if (!activeFile) return null;
    const outs = cells.filter(
      (c) => c.kind === "output" && c.attached_to === activeFile.cellId,
    );
    return outs.length ? outs[outs.length - 1].content : null;
  }, [cells, activeFile]);

  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const handleMount = useCallback<OnMount>((editor, monaco: Monaco) => {
    editorRef.current = editor;
    const colors = readThemeColors();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    monaco.editor.defineTheme(DEVMIND_MONACO_THEME, buildMonacoTheme(colors) as any);
    monaco.editor.setTheme(DEVMIND_MONACO_THEME);
  }, []);

  const handleRun = useCallback(async () => {
    if (!activeFile || running) return;
    setRunning(true);
    setRunNote(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission_id: missionId,
          cell_id: activeFile.cellId,
          file_path: activeFile.name,
          code: buffer,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setRunNote(body?.error?.message || `Run failed (${res.status})`);
      }
    } catch (err) {
      setRunNote(err instanceof Error ? err.message : "Network error");
    } finally {
      setRunning(false);
    }
  }, [activeFile, buffer, missionId, running]);

  const monacoLang = activeFile
    ? MONACO_LANG[activeFile.language] ?? "plaintext"
    : "plaintext";

  return (
    <aside
      className="build-stage"
      role="complementary"
      aria-label="Build workspace"
    >
      <div className="stage-bar">
        <span className="stage-tab active">▶ Code</span>
        <div className="stage-spacer" />
        <button
          type="button"
          className="stage-btn"
          onClick={toggleStageExpanded}
          title={stageExpanded ? "Collapse" : "Expand full"}
        >
          {stageExpanded ? "⤡" : "⤢"}
        </button>
        <button
          type="button"
          className="stage-btn"
          onClick={closeStage}
          title="Close"
        >
          ✕
        </button>
      </div>

      <div className="stage-body">
        <div className="file-drawer">
          <div className="files-header">Files</div>
          {files.length === 0 ? (
            <div className="files-empty">No code files yet.</div>
          ) : (
            files.map((f) => (
              <button
                key={f.cellId}
                type="button"
                className={`file-item${
                  activeFile?.cellId === f.cellId ? " active" : ""
                }`}
                onClick={() => setActiveId(f.cellId)}
              >
                <span className="file-icon" aria-hidden="true">
                  {iconFor(f.name)}
                </span>
                {f.name}
              </button>
            ))
          )}
        </div>

        <div className="stage-panel">
          <div className="editor-area">
            {activeFile ? (
              <Editor
                value={buffer}
                language={monacoLang}
                onChange={(v) => setBuffer(v ?? "")}
                onMount={handleMount}
                theme={DEVMIND_MONACO_THEME}
                loading={null}
                options={{
                  fontFamily: "var(--font-code)",
                  fontSize: 13,
                  lineHeight: 22,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 10, bottom: 10 },
                  tabSize: monacoLang === "python" ? 4 : 2,
                }}
              />
            ) : (
              <div className="editor-empty">Select a file to start.</div>
            )}
          </div>

          <div className="terminal-section">
            <div className="terminal-bar">
              <span className="terminal-title">Terminal</span>
              <button
                type="button"
                className="stage-run-btn"
                onClick={() => void handleRun()}
                disabled={!activeFile || running}
              >
                {running ? "Running…" : "▶ Run"}
              </button>
            </div>
            <pre className="terminal-body">
              {runNote ? (
                <span className="terminal-error">{runNote}</span>
              ) : outputForActive ? (
                outputForActive
              ) : (
                <span className="terminal-dim">
                  {activeFile
                    ? `~ $ python ${activeFile.name} — press Run`
                    : "~ $"}
                </span>
              )}
            </pre>
            {!sessionActive ? (
              <div className="terminal-hint">
                Start the mission to run code in the sandbox.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
