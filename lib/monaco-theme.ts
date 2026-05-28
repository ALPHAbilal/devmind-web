/**
 * Builds a Monaco theme object from the notebook CSS variables so the editor
 * blends into the surrounding cell chrome. Pure on inputs, memoized per
 * resolved-color-fingerprint.
 *
 * Read CSS variables off `document.documentElement` (or any provided host) at
 * the moment the editor mounts — Monaco snapshots colors and won't re-read.
 */

export interface MonacoThemeColors {
  background: string;
  foreground: string;
  selection: string;
  lineHighlight: string;
  cursor: string;
  comment: string;
  keyword: string;
  string: string;
  number: string;
  function: string;
}

const cache = new Map<string, unknown>();

function readVar(host: Element, name: string, fallback: string): string {
  const v = getComputedStyle(host).getPropertyValue(name).trim();
  return v || fallback;
}

function toHex(color: string, fallback: string): string {
  if (!color) return fallback;
  if (color.startsWith("#")) return color;
  const m = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!m) return fallback;
  const r = Number(m[1]).toString(16).padStart(2, "0");
  const g = Number(m[2]).toString(16).padStart(2, "0");
  const b = Number(m[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

export function readThemeColors(host: Element = document.documentElement): MonacoThemeColors {
  const bg = toHex(readVar(host, "--bg-card", "#424940"), "#424940");
  const fg = toHex(readVar(host, "--text-primary", "#e8eaed"), "#e8eaed");
  const accent = toHex(readVar(host, "--accent-green", "#9cd594"), "#9cd594");
  return {
    background: bg,
    foreground: fg,
    selection: accent,
    lineHighlight: bg,
    cursor: accent,
    comment: "#6b7c66",
    keyword: "#7dd3fc",
    string: "#b7f1ae",
    number: "#fbbf24",
    function: "#67e8f9",
  };
}

/**
 * Build Monaco IStandaloneThemeData. Typed loosely to avoid pulling the full
 * `monaco-editor` types into this module — the consumer hands it to
 * `monaco.editor.defineTheme` directly.
 */
export function buildMonacoTheme(colors: MonacoThemeColors): unknown {
  const key = JSON.stringify(colors);
  const cached = cache.get(key);
  if (cached) return cached;

  const theme = {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: colors.comment.slice(1), fontStyle: "italic" },
      { token: "keyword", foreground: colors.keyword.slice(1) },
      { token: "string", foreground: colors.string.slice(1) },
      { token: "number", foreground: colors.number.slice(1) },
      { token: "type", foreground: colors.function.slice(1) },
      { token: "function", foreground: colors.function.slice(1) },
      { token: "tag", foreground: colors.keyword.slice(1) },
    ],
    colors: {
      "editor.background": colors.background,
      "editor.foreground": colors.foreground,
      "editorCursor.foreground": colors.cursor,
      "editor.lineHighlightBackground": colors.lineHighlight,
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": colors.selection + "40",
      "editor.inactiveSelectionBackground": colors.selection + "20",
      "editorLineNumber.foreground": "#6b7c66",
      "editorLineNumber.activeForeground": "#baccb3",
      "editorGutter.background": colors.background,
      "editorIndentGuide.background1": "#ffffff14",
      "editorIndentGuide.activeBackground1": "#ffffff2a",
      "scrollbarSlider.background": "#ffffff14",
      "scrollbarSlider.hoverBackground": "#ffffff22",
      "scrollbarSlider.activeBackground": "#ffffff33",
    },
  };

  cache.set(key, theme);
  return theme;
}

export const DEVMIND_MONACO_THEME = "devmind-notebook";
