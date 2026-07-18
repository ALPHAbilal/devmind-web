/** Find a live Range for `needle` inside `root`'s text nodes. Single-node
 * matches only — text that can't be re-found simply doesn't tint. Same
 * anchoring model as BranchController. */
export function findTextRange(root: HTMLElement, needle: string): Range | null {
  const target = needle.trim();
  if (!target) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const idx = node.textContent?.indexOf(target) ?? -1;
    if (idx >= 0) {
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + target.length);
      return range;
    }
  }
  return null;
}

/* Minimal typings for the CSS Custom Highlight API (not yet in TS lib.dom). */
interface HighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): boolean;
}
declare const Highlight: { new (...ranges: Range[]): unknown };

export function highlightRegistry(): HighlightRegistry | null {
  const css = globalThis.CSS as unknown as
    | { highlights?: HighlightRegistry }
    | undefined;
  return css?.highlights ?? null;
}

export function setHighlight(name: string, ranges: Range[]): void {
  const reg = highlightRegistry();
  if (!reg) return;
  if (ranges.length === 0) {
    reg.delete(name);
    return;
  }
  reg.set(name, new Highlight(...ranges));
}

export function clearHighlight(name: string): void {
  highlightRegistry()?.delete(name);
}
