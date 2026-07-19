"use client";

/**
 * InteractiveCell — agent-generated HTML/CSS(+tiny JS) demo, rendered in a
 * sandboxed iframe so its markup can never touch the notebook's DOM, styles,
 * or the user's session. `cell.content` is the raw HTML fragment; theme
 * tokens are injected into the srcdoc head so demos follow light/dark.
 * meta: { height?: px (default 320), title?: string }.
 */
import { useMemo } from "react";
import type { Cell } from "./types";

const FRAME_BASE = `
  <style>
    :root { color-scheme: light dark; }
    html, body { margin: 0; padding: 12px; box-sizing: border-box;
      font-family: system-ui, sans-serif; font-size: 14px; }
    * { box-sizing: inherit; }
  </style>
`;

export function InteractiveCell({ cell }: { cell: Cell }) {
  const height = cell.meta?.height ?? 320;
  const title = cell.meta?.title ?? null;

  const srcDoc = useMemo(
    () => `<!doctype html><html><head>${FRAME_BASE}</head><body>${cell.content}</body></html>`,
    [cell.content],
  );

  return (
    <div className="cell cell-interactive">
      {title ? <div className="cell-interactive-title">{title}</div> : null}
      <iframe
        className="cell-interactive-frame"
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        style={{ height }}
        title={title ?? "Interactive demo"}
        loading="lazy"
      />
    </div>
  );
}
