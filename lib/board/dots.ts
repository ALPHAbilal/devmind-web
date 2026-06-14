/**
 * Dot-ledger helpers — the demo's `tdots()` / `tstat()`. A thread's progress is
 * a row of dots: filled (known) · pulsing (learning) · hollow (gap), ordered by
 * TORDER. Pure functions over the notes array so any adapter can feed them.
 */
import type { DotClass, ThreadNote } from "./types";
import { TDOTC, TORDER } from "./mock";

export { TORDER, TDOTC, TCSTAT } from "./mock";

export interface ThreadStat {
  total: number;
  learned: number;
}

/** Tally: how many of this thread's concepts are already learned. */
export function tstat(notes: ThreadNote[], id: string): ThreadStat {
  const ns = notes.filter((n) => n.q === id);
  const c = (k: ThreadNote["col"]) => ns.filter((n) => n.col === k).length;
  return { total: ns.length, learned: c("you") + c("agent") + c("review") };
}

/** Ordered dot classes for one thread (← drives the ledger render). */
export function tdots(notes: ThreadNote[], id: string): DotClass[] {
  return notes
    .filter((n) => n.q === id)
    .slice()
    .sort((a, b) => TORDER.indexOf(a.col) - TORDER.indexOf(b.col))
    .map((n) => TDOTC[n.col]);
}
