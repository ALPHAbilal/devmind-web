"use client";

/**
 * NotebookCells — the demo's `nbCells(title)` preview content, shared by the
 * MorphSheet "open" preview and the FullView. Ported verbatim (the code cell
 * carries syntax spans + entities, so it's rendered as HTML). Only the heading
 * is parameterized; the body is the fixed sample lesson, exactly as the demo.
 */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cells(title: string): string {
  return `
    <div class="nb-cell"><div class="nb-sec">Step 1 · the idea</div><div class="nb-hd">${esc(title)}</div></div>
    <div class="nb-cell nb-p">A <b>component</b> is a function that returns markup. React calls it, gets a description of the UI, and paints it — then you compose small components into bigger ones.</div>
    <div class="nb-cell nb-call">Think of a component like a <b>recipe card</b>: same inputs (props) → same dish (UI), every time.</div>
    <div class="nb-cell nb-code"><div class="ch"><span class="dot"></span> Greeting.jsx · React</div><pre><span class="kw">function</span> <span class="fn">Greeting</span>({ name }) {
  <span class="kw">return</span> <span class="st">&lt;h1&gt;</span>Hello, {name}!<span class="st">&lt;/h1&gt;</span>;
}</pre><div class="nb-out">▸ &lt;Greeting name="Bilal" /&gt;  →  <b style="color:var(--ink)">Hello, Bilal!</b></div></div>
    <div class="nb-cell nb-p">The <code>{name}</code> drops you back into JavaScript inside the markup — that's <b>JSX</b>.</div>
    <div class="nb-cell nb-chal"><div class="nb-sec">Your turn</div><h4>Build a &lt;Profile /&gt; component</h4><ul><li>takes <code>name</code> and <code>role</code> props</li><li>renders them in an &lt;h2&gt; and a &lt;p&gt;</li></ul></div>`;
}

export function NotebookCells({ title }: { title: string }) {
  return <div className="nb" dangerouslySetInnerHTML={{ __html: cells(title) }} />;
}
