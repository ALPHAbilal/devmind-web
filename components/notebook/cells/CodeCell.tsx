"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { createClient } from "@/lib/supabase/client";
import {
  buildMonacoTheme,
  DEVMIND_MONACO_THEME,
  readThemeColors,
} from "@/lib/monaco-theme";
import { useNotebookOptional } from "../NotebookProvider";
import type { Cell } from "./types";

const LANG_LABEL: Record<string, string> = {
  python: "Python",
  py: "Python",
  html: "HTML",
  markup: "HTML",
  sql: "SQL",
  bash: "Bash",
  sh: "Bash",
  json: "JSON",
  ts: "TypeScript",
  typescript: "TypeScript",
  js: "JavaScript",
  javascript: "JavaScript",
};

const LANG_DOT: Record<string, string> = {
  python: "py",
  py: "py",
  html: "html",
  markup: "html",
  sql: "sql",
};

// CSS-language → Monaco-language. Monaco understands these IDs.
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

const MAX_HEIGHT = 600;
const MIN_HEIGHT = 48;
const SAVE_DEBOUNCE_MS = 500;

function isCodeAction(language: string | null): string {
  if (language === "html" || language === "markup") return "Preview";
  return "Run";
}

export function CodeCell({ cell }: { cell: Cell }) {
  // Canvas renders cells outside <NotebookProvider>; fall back to the cell's
  // own notebook_id and treat the notebook as read-only there.
  const nb = useNotebookOptional();
  const notebookId = nb?.notebookId ?? cell.notebook_id;
  const sessionActive = nb?.sessionActive ?? false;
  const langKey = cell.language ?? "python";
  const monacoLang = MONACO_LANG[langKey] ?? "plaintext";
  const label = LANG_LABEL[langKey] ?? cell.language ?? "Code";
  const dotClass = LANG_DOT[langKey] ?? "py";
  const action = isCodeAction(cell.language);

  // Cells the agent authored (including those it dropped inside a thread) are
  // examples, not learner workspace — keep them read-only. Paused notebooks are
  // read-only across the board.
  const readOnly = !sessionActive || cell.source === "agent";

  const [content, setContent] = useState(cell.content);
  const [height, setHeight] = useState(MIN_HEIGHT);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(cell.content);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  // Pull in updates that arrive via Realtime when we aren't the editor.
  useEffect(() => {
    if (cell.content !== lastSavedRef.current && cell.content !== content) {
      setContent(cell.content);
      lastSavedRef.current = cell.content;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell.content]);

  const persist = useCallback(
    async (next: string) => {
      if (next === lastSavedRef.current) return;
      lastSavedRef.current = next;
      const supabase = createClient();
      await supabase
        .from("cells")
        .update({ content: next } as never)
        .eq("id", cell.id);
    },
    [cell.id],
  );

  const onChange = useCallback(
    (value: string | undefined) => {
      const next = value ?? "";
      setContent(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(next);
      }, SAVE_DEBOUNCE_MS);
    },
    [persist],
  );

  // Flush a pending save on unmount.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        void persist(content);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const measure = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const contentH = editor.getContentHeight();
    const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, contentH));
    setHeight(next);
  }, []);

  const handleMount = useCallback<OnMount>(
    (editor, monaco: Monaco) => {
      editorRef.current = editor;
      const colors = readThemeColors();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      monaco.editor.defineTheme(DEVMIND_MONACO_THEME, buildMonacoTheme(colors) as any);
      monaco.editor.setTheme(DEVMIND_MONACO_THEME);
      editor.onDidContentSizeChange(measure);
      measure();
    },
    [measure],
  );

  const runDisabled = readOnly || running;

  const handleRun = useCallback(async () => {
    if (runDisabled) return;
    setRunning(true);
    setRunError(null);
    try {
      // Flush any in-flight debounce before running so Fly sees current code.
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        await persist(content);
      }
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebook_id: notebookId,
          cell_id: cell.id,
          file_path: cell.attached_file ?? "",
          code: content,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setRunError(body?.error?.message || `Failed (${res.status})`);
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Network error");
    } finally {
      // The output cell arrives via Realtime; the spinner can clear immediately
      // after the POST resolves — OutputCell handles its own pending state.
      setRunning(false);
    }
  }, [cell.attached_file, cell.id, content, notebookId, persist, runDisabled]);

  const editorOptions = useMemo(
    () => ({
      readOnly,
      fontFamily: "var(--font-code)",
      fontSize: 13,
      lineHeight: 22,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      padding: { top: 10, bottom: 10 },
      renderLineHighlight: "none" as const,
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      scrollbar: {
        verticalScrollbarSize: 6,
        horizontalScrollbarSize: 6,
        alwaysConsumeMouseWheel: false,
      },
      smoothScrolling: true,
      wordWrap: "on" as const,
      tabSize: monacoLang === "python" ? 4 : 2,
    }),
    [readOnly, monacoLang],
  );

  return (
    <div className="cell cell-code" data-cell-id={cell.id}>
      <div className="code-header">
        <div className="code-lang">
          <span className={`code-lang-dot ${dotClass}`} />
          <span>
            {label}
            {cell.attached_file ? ` — ${cell.attached_file}` : ""}
          </span>
        </div>
        <div className="code-actions">
          {runError ? <span className="code-run-error">{runError}</span> : null}
          <button
            type="button"
            className="code-action-btn run-btn"
            disabled={runDisabled}
            onClick={() => void handleRun()}
          >
            {running ? "Running…" : `▶ ${action}`}
          </button>
        </div>
      </div>
      <div className="code-body code-body-monaco" style={{ height }}>
        <Editor
          value={content}
          language={monacoLang}
          onChange={onChange}
          onMount={handleMount}
          theme={DEVMIND_MONACO_THEME}
          options={editorOptions}
          loading={null}
        />
      </div>
    </div>
  );
}
