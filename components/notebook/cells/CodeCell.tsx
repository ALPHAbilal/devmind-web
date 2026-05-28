import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-typescript";
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

function resolveLang(lang: string | null): string {
  if (!lang) return "markup";
  if (lang === "py") return "python";
  if (lang === "html") return "markup";
  return lang;
}

function isCodeAction(language: string | null): string {
  // HTML/markup cells get a "Preview" button, everything else "Run".
  if (language === "html" || language === "markup") return "Preview";
  return "Run";
}

export function CodeCell({ cell }: { cell: Cell }) {
  const lang = resolveLang(cell.language);
  const grammar = Prism.languages[lang] ?? Prism.languages.markup;
  const highlighted = Prism.highlight(cell.content, grammar, lang);
  const label = LANG_LABEL[cell.language ?? ""] ?? cell.language ?? "Code";
  const dotClass = LANG_DOT[cell.language ?? ""] ?? "py";
  const action = isCodeAction(cell.language);

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
          <button type="button" className="code-action-btn run-btn" disabled>
            ▶ {action}
          </button>
        </div>
      </div>
      <pre className={`code-body language-${lang}`}>
        <code
          className={`language-${lang}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}
