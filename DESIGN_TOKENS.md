# DevMind — Design Tokens

> Precise extraction from `demo-mission-creation.html` and `demo-notebook.html`. Every value here is the source of truth — do **not** round, approximate, or "normalize". When React-ifying, these tokens become CSS variables in plain `.css` files (no Tailwind).

The two demos use **two distinct palettes**:
- **Mission Creation** — warm forest dark, minimal, ceremonial (`bg-base: #1a1d18`).
- **Notebook** — slightly lighter forest, IDE-like (`bg-app: #303F2D`).

Tokens are namespaced below so both surfaces can coexist in one app.

---

## 1. Color Tokens

### 1.1 Mission Creation palette (`demo-mission-creation.html`, lines 11–42)

| Token | Value |
|---|---|
| `--bg-base` | `#1a1d18` |
| `--bg-subtle` | `#22261f` |
| `--bg-elevated` | `#2a2f26` |
| `--bg-interactive` | `#353b30` |
| `--bg-interactive-hover` | `#3f4639` |
| `--text-primary` | `#f4f5f2` |
| `--text-secondary` | `#b8bdb2` |
| `--text-tertiary` | `#7d8477` |
| `--text-quaternary` | `#565b51` |
| `--accent-green` | `#9cd594` |
| `--accent-green-soft` | `rgba(156, 213, 148, 0.12)` |
| `--accent-green-border` | `rgba(156, 213, 148, 0.25)` |
| `--accent-green-glow` | `rgba(156, 213, 148, 0.08)` |
| `--border-subtle` | `rgba(255,255,255,0.06)` |
| `--border-medium` | `rgba(255,255,255,0.1)` |

Additional hex values used inline (not in `:root`):
- Logo gradient stops: `#7bc474`, `#4a8a44`
- `btn-primary:hover` background: `#a8dda1`
- Selection background: `rgba(156,213,148,0.25)` with color `#fff`
- Tag-remove hover: `#de3730`
- Logo SVG stroke (inline): `#e8f5e0`

### 1.2 Notebook palette (`demo-notebook.html`, lines 8–41)

| Token | Value |
|---|---|
| `--bg-deepest` | `#1a2418` |
| `--bg-app` | `#303F2D` |
| `--bg-surface` | `#3b4b38` |
| `--bg-card` | `#424940` |
| `--bg-elevated` | `#52634f` |
| `--bg-hover` | `#5a6b56` |
| `--text-primary` | `#e8eaed` |
| `--text-secondary` | `#baccb3` |
| `--text-muted` | `#84967f` |
| `--text-disabled` | `#6b7c66` |
| `--accent-green` | `#9cd594` |
| `--accent-green-bright` | `#b7f1ae` |
| `--accent-green-dim` | `#679e62` |
| `--accent-teal` | `#a0cfd4` |
| `--accent-teal-dim` | `#6b989d` |
| `--accent-yellow` | `#fbbf24` |
| `--accent-pink` | `#f472b6` |
| `--accent-red` | `#de3730` |
| `--accent-purple` | `#a78bfa` |
| `--border-subtle` | `rgba(255,255,255,0.08)` |
| `--border-medium` | `rgba(255,255,255,0.14)` |
| `--border-strong` | `rgba(255,255,255,0.22)` |

Additional hex values used inline:
- Sidebar rail gradient: `#222e20 0%`, `#2a3928 30%`, `var(--bg-app) 60%`, `#263324 100%`
- Logo radial gradient: `#83cc7c`, `#4e924a 55%`, `#3a7136`
- Logo SVG stroke: `#e8f5e0`
- Sidebar panel background: `rgba(32, 42, 30, 0.92)`
- Chat bar background: `rgba(30, 40, 28, 0.82)`
- Chat thread sheet background: `rgba(30, 40, 28, 0.95)`
- Sheet overlay: `rgba(17, 23, 16, 0.5)`
- Selection: `rgba(156,213,148,0.3)` on `#fff`
- Misc inline used in code/markdown cells: `#0a1309`, `#0f190e`, `#111`, `#141a13`, `#1a1a1a`, `#2e7d32`, `#333`, `#4ade80`, `#4e834b`, `#555`, `#67e8f9`, `#7dd3fc`, `#888`, `#b0bfab`, `#e0e0e0`, `#e8f5e9`, `#f8f9fa`

---

## 2. Typography

### 2.1 Font families

**Mission Creation** — loaded from Google Fonts:
- Preconnect: `https://fonts.googleapis.com`, `https://fonts.gstatic.com`
- Stylesheet: `family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700`

| Token | Value |
|---|---|
| `--font-display` | `'Instrument Serif', Georgia, serif` |
| `--font-body` | `'DM Sans', system-ui, sans-serif` |

**Notebook** — system stack only:

| Token | Value |
|---|---|
| `--font-ui` | `'Segoe UI', Tahoma, sans-serif` |
| `--font-code` | `'Cascadia Code', 'JetBrains Mono', 'SF Mono', 'Consolas', monospace` |

### 2.2 Type scale (observed in components)

**Mission Creation**
- Greeting: `14px` / weight `400` / color `--text-tertiary`
- Main title (display): `32px` / weight `400` / `letter-spacing: -0.02em` / `line-height: 1.2`
- Main input: `18px`
- Constraints title (display): `28px` / weight `400`
- Constraints subtitle: `14px` / color `--text-tertiary` / `line-height: 1.6`
- AI message: `16px` / `line-height: 1.7`
- AI question (display): `24px` / weight `400`
- AI name: `12px` / weight `600` / `text-transform: uppercase` / `letter-spacing: 0.05em`
- Step label: `11px` / weight `500` / `letter-spacing: 0.02em`
- Step dot: `11px` / weight `600`
- Path label: `13px` / weight `500`
- Path emoji: `24px` / `line-height: 1`
- Level title: `14px` / weight `600`
- Level desc: `12px` / `line-height: 1.5`
- Level emoji: `28px`
- Chip: `13px` / weight `500`
- Goal name: `13px` / weight `600`
- Goal desc: `11px` / `line-height: 1.4`
- Tag: `12px`
- Tag input: `13px`
- Tag suggestion: `11px`
- Custom textarea: `13px` / `line-height: 1.5`
- Constraint label: `11px` / weight `600` / uppercase / `letter-spacing: 0.08em`
- Mission badge: `11px` / weight `600` / uppercase / `letter-spacing: 0.05em`
- Mission title (display): `26px` / weight `400` / `line-height: 1.3`
- Constraint pill: `11px` / weight `500`
- Learn item: `14px` / `line-height: 1.6`
- Checkpoint item: `14px`
- Meta item: `13px`
- Btn primary / secondary: `14px` / weight `600` / `500`
- Skip link: `13px`
- Generating text: `16px`, sub `13px`
- Rail avatar: `11px` / weight `600`

**Notebook**
- Base body `font-size: 16px` / `line-height: 1.6`
- Panel title: `11px` / weight `600` / uppercase / `letter-spacing: 1.2px`
- Panel section label: `10px` / weight `600` / uppercase / `letter-spacing: 1px`
- Journey name: `12.5px` / weight `600`
- Journey pct: `10px` / weight `600`
- Journey step: `11.5px`
- Session title: `12.5px` / weight `500`
- Session meta: `10.5px`
- Session time: `10px`
- Fav item: `12px`
- Panel search input: `12.5px`
- Search hint: `11px` / `line-height: 1.6`
- Setting label: `12.5px`, value: `11px`
- Chat input: `13px` / `line-height: 1.5`
- Chat mode option: `12px`
- Code action button: `11px` / weight `500`
- Rail avatar: `10px` / weight `600`

---

## 3. Spacing — Border Radius

| Token (mission) | Value |
|---|---|
| `--radius-sm` | `8px` |
| `--radius-md` | `12px` |
| `--radius-lg` | `16px` |
| `--radius-full` | `9999px` |

| Token (notebook) | Value |
|---|---|
| `--radius-sm` | `8px` |
| `--radius-md` | `12px` |
| `--radius-lg` | `16px` |

Additional inline radii used in notebook components: `2px` (progress bar), `3px` (scrollbar thumb), `4px`, `5px`, `7px` (fav item), `10px` (journey card), `18px` (thread sheet), `22px` (chat bar pill), `50%` (avatars, circle buttons).

---

## 4. Motion — Transitions & Animations

### 4.1 Transition timing tokens

**Mission Creation**
| Token | Value |
|---|---|
| `--transition-fast` | `150ms ease` |
| `--transition-normal` | `250ms cubic-bezier(0.4, 0, 0.2, 1)` |

**Notebook**
| Token | Value |
|---|---|
| `--transition-fast` | `150ms ease` |
| `--transition-normal` | `250ms ease` |

### 4.2 Notable inline durations & easings

- Sidebar rail logo: `transform 200ms ease, box-shadow 200ms ease`
- Rail icon: `all 180ms ease`
- Sidebar panel (mission): `transform 280ms cubic-bezier(0.25,0.46,0.45,0.94), opacity 220ms ease`
- Journey progress bar fill: `width 600ms cubic-bezier(0.4,0,0.2,1)`
- Layout flex swap (build/learn surfaces): `flex 500ms cubic-bezier(0.4,0,0.2,1)`
- Surface transform: `transform 500ms cubic-bezier(0.25,0.46,0.45,0.94)`
- Chat bar border/box-shadow: `border-color 250ms ease, box-shadow 250ms ease`
- Thread sheet transform: `280ms cubic-bezier(0.25,0.46,0.45,0.94)`
- Chip / button hover: `150ms ease`

### 4.3 Keyframes

**Mission Creation**
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* Applied: .step-container — animation: fadeUp 600ms cubic-bezier(0.16, 1, 0.3, 1) */

@keyframes spin { to { transform: rotate(360deg); } }
/* Applied: .gen-spinner — animation: spin 800ms linear infinite */
```

**Notebook**
```css
@keyframes cellIn   { to { opacity: 1; transform: translateY(0); } }
/* .cell — animation: cellIn 400ms ease-out forwards */

@keyframes rowSlide { from { opacity: 0; transform: translateX(-8px); }
                      to   { opacity: 1; transform: translateX(0); } }

@keyframes insertFlash { 0%   { background: rgba(156,213,148,0.3); }
                         100% { background: rgba(156,213,148,0.1); } }

@keyframes typeDot { 0%, 60%, 100% { transform: translateY(0);  opacity: 0.4; }
                     30%           { transform: translateY(-5px); opacity: 1;  } }

@keyframes reveal  { from { opacity: 0; transform: translateY(10px); }
                     to   { opacity: 1; transform: translateY(0); } }

@keyframes runPulse { 0%  { box-shadow: 0 0 0 0  rgba(156,213,148,0.4); }
                      70% { box-shadow: 0 0 0 6px rgba(156,213,148,0);   } }

@keyframes tabSlide { /* see lines 1272+ in source */ }

@keyframes spin    { to { transform: rotate(360deg); } }

@keyframes ahaIn   { from { opacity: 0; } to { opacity: 1; } }

@keyframes ahaPop  { /* see lines 2050+ in source */ }
```

### 4.4 Reduced-motion override (mission)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. Shadows

**Notebook tokens**
| Token | Value |
|---|---|
| `--shadow-card` | `0 1px 6px rgba(0,0,0,0.2)` |
| `--shadow-elevated` | `0 4px 16px rgba(0,0,0,0.3)` |
| `--shadow-glow-green` | `0 0 20px rgba(156,213,148,0.15)` |

**Inline mission shadows**
- Logo: `0 2px 8px rgba(74, 138, 68, 0.3)` → hover `0 4px 12px rgba(74, 138, 68, 0.4)`
- Active step dot: `0 0 0 4px var(--accent-green-glow), 0 0 20px var(--accent-green-glow)`
- Btn primary hover: `0 4px 20px rgba(156, 213, 148, 0.3)`

**Inline notebook shadows**
- Logo: `0 1px 4px rgba(58,113,54,0.35), 0 3px 10px rgba(58,113,54,0.15), inset 0 1px 0 rgba(255,255,255,0.12)`
- Logo hover: `0 1px 4px rgba(58,113,54,0.35), 0 4px 14px rgba(58,113,54,0.25), inset 0 1px 0 rgba(255,255,255,0.12)`
- Sidebar panel: `6px 0 28px rgba(0,0,0,0.45)`
- Chat bar: `0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)`
- Chat bar focus: `0 4px 20px rgba(0,0,0,0.35), 0 0 24px rgba(156,213,148,0.06), inset 0 1px 0 rgba(255,255,255,0.04)`
- Chat send hover background: `rgba(156,213,148,0.1)` (no extra shadow)
- Journey current dot: `0 0 5px rgba(156,213,148,0.3)`
- Session active dot: `0 0 5px rgba(156,213,148,0.3)`
- Panel search focus: `0 0 0 2px rgba(156,213,148,0.06)`
- Mode toggle (chat): `inset 0 0 0 1px rgba(156,213,148,0.12)`
- Mode toggle (error): `inset 0 0 0 1px rgba(222,55,48,0.22)`

---

## 6. Borders

### 6.1 Border tokens (see §1)
Mission: `--border-subtle: rgba(255,255,255,0.06)`, `--border-medium: rgba(255,255,255,0.1)`
Notebook: `--border-subtle: rgba(255,255,255,0.08)`, `--border-medium: rgba(255,255,255,0.14)`, `--border-strong: rgba(255,255,255,0.22)`

### 6.2 Inline border accents
- Rail avatar (mission): `1.5px solid var(--border-medium)` → hover `var(--accent-green-border)`
- Rail avatar (notebook): `1.5px solid rgba(255,255,255,0.08)` → hover `rgba(156,213,148,0.25)`
- Checkpoint circle: `1.5px solid var(--border-medium)`; checked: solid `--accent-green`
- Tag suggestion: `1px dashed var(--border-medium)`
- Path/level/goal cards selected: `border-color: var(--accent-green-border)` (or full `--accent-green` for level)
- Active step dot ring: `box-shadow 0 0 0 4px var(--accent-green-glow)`

---

## 7. Layout Constants

### 7.1 Mission Creation
- Sidebar rail width: `52px`
- Step container max-width: `540px`
- Step indicator max-width: `400px`
- Path grid: `repeat(3, 1fr)`, gap `12px`
- Level grid: flex row, gap `16px`
- Goal grid: `1fr 1fr`, gap `10px`
- Main padding: `48px 32px` (mobile `32px 20px`)
- Step container vertical margin from indicator: `56px`
- Main title bottom margin: `40px`
- Input wrap bottom margin: `48px`
- AI section bottom margin: `32px`
- Action row top margin: `40px`
- User context pill top margin: `32px`; padding `12px 20px`

### 7.2 Notebook
- Sidebar rail width: `44px`
- Sidebar panel width: `244px` (absolute, `left: 44px`)
- Sidebar panel backdrop-filter: `blur(24px)`
- Chat bar: `bottom: 16px`, `width: calc(100% - 64px)`, `max-width: 480px`, `padding: 6px 6px 5px`, `border-radius: 22px`, `backdrop-filter: blur(20px)`
- Chat bar gap: `3px` between rows, `4px` in bottom-rail, `3px` in bottom-left
- Chat input: `min-height: 30px`, `max-height: 120px`, padding `6px 8px 4px`
- Chat send / mode toggle / thread btn: `32px × 32px` circles
- Chat mode menu offset: `bottom: 42px`, `left: -2px`, `min-width: 134px`, `border-radius: var(--radius-md)`
- Thread sheet: `max-width: 480px`, `max-height: min(52vh, 380px)`, `border-radius: 18px`, `margin-bottom: 74px`, transform `translateY(24px)` → `0`
- Logo: `28px × 28px`, radius `8px`
- Rail icon: `32px × 32px`, radius `8px`
- Rail avatar: `26px × 26px`
- Journey card padding: `12px`, radius `10px`
- Journey bar: height `3px`, radius `2px`
- Journey step dot: `5px × 5px`
- Session dot: `6px × 6px`

### 7.3 Breakpoints (mission)
- `@media (max-width: 640px)` — hides sidebar rail, collapses grids to 1–2 cols, reduces title to `26px`.

### 7.4 Breakpoints (notebook)
- Single rule at line 1181 (`/* RESPONSIVE */`) — confirm in source before implementing mobile.

---

## 8. Iconography

Both demos use inline SVG with `stroke="currentColor"`, `stroke-width: 1.5` or `2`, `stroke-linecap: round`, `stroke-linejoin: round`. Icon containers:
- Mission rail icon SVG: `18px × 18px`
- Mission rail logo SVG: `16px × 16px`
- Notebook rail icon SVG: `16px × 16px`
- Notebook rail logo SVG: `14px × 14px` with `filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2))`
- Chat send SVG: `15px × 15px`
- Chat thread btn SVG: `14px × 14px`
- Panel close SVG: `14px × 14px`

The DevMind brand mark (used in both rail logos and AI avatar) — verbatim path:
```svg
<svg viewBox="0 0 24 24" fill="none" stroke="#e8f5e0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M17 8c2.2 2 3 5.2 3 8-3 0-6-.8-8-3-2.2-2.4-3-5.5-3-8.5 3.2 0 6 1 8 3.5z"/>
  <path d="M9 12.5c-1.5 1.2-2 3-2.2 4.5"/>
</svg>
```

---

## 9. Surface-specific recipes

### 9.1 Mission — `:root` block (verbatim)
```css
:root {
  --bg-base: #1a1d18;
  --bg-subtle: #22261f;
  --bg-elevated: #2a2f26;
  --bg-interactive: #353b30;
  --bg-interactive-hover: #3f4639;

  --text-primary: #f4f5f2;
  --text-secondary: #b8bdb2;
  --text-tertiary: #7d8477;
  --text-quaternary: #565b51;

  --accent-green: #9cd594;
  --accent-green-soft: rgba(156, 213, 148, 0.12);
  --accent-green-border: rgba(156, 213, 148, 0.25);
  --accent-green-glow: rgba(156, 213, 148, 0.08);

  --border-subtle: rgba(255,255,255,0.06);
  --border-medium: rgba(255,255,255,0.1);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  --font-display: 'Instrument Serif', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;

  --transition-fast: 150ms ease;
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 9.2 Notebook — `:root` block (verbatim)
```css
:root {
  --bg-deepest: #1a2418;
  --bg-app: #303F2D;
  --bg-surface: #3b4b38;
  --bg-card: #424940;
  --bg-elevated: #52634f;
  --bg-hover: #5a6b56;
  --text-primary: #e8eaed;
  --text-secondary: #baccb3;
  --text-muted: #84967f;
  --text-disabled: #6b7c66;
  --accent-green: #9cd594;
  --accent-green-bright: #b7f1ae;
  --accent-green-dim: #679e62;
  --accent-teal: #a0cfd4;
  --accent-teal-dim: #6b989d;
  --accent-yellow: #fbbf24;
  --accent-pink: #f472b6;
  --accent-red: #de3730;
  --accent-purple: #a78bfa;
  --border-subtle: rgba(255,255,255,0.08);
  --border-medium: rgba(255,255,255,0.14);
  --border-strong: rgba(255,255,255,0.22);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --font-ui: 'Segoe UI', Tahoma, sans-serif;
  --font-code: 'Cascadia Code', 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --shadow-card: 0 1px 6px rgba(0,0,0,0.2);
  --shadow-elevated: 0 4px 16px rgba(0,0,0,0.3);
  --shadow-glow-green: 0 0 20px rgba(156,213,148,0.15);
}
```

---

## 10. Implementation rules (carry into React)

1. **Two CSS variable scopes.** Put mission tokens on `.theme-mission { … }`, notebook tokens on `.theme-notebook { … }`. Apply the class on the route-level wrapper. Do **not** merge — `--accent-green` is identical but `--bg-*` and text scales differ.
2. **No Tailwind.** All styles live in plain `.css` files (or CSS Modules). Token names must match the source verbatim so designers can search 1:1.
3. **Selection / scrollbar styles** are global and identical-in-spirit between both demos — implement once in `globals.css`, then let each theme override `::-webkit-scrollbar-thumb` color via the theme variables.
4. **Backdrop-filter** is critical to the notebook look (sidebar panel, chat bar, thread sheet) — never drop it.
5. **Keyframes** belong with the component that owns them, not the root stylesheet, except for `spin` (shared utility).
6. **Reduced motion** rule from §4.4 belongs in `globals.css` so it applies to both surfaces.
7. **Fonts**: import Instrument Serif + DM Sans via `next/font/google` in `app/layout.tsx`; expose them as the CSS variables in §2.1. The notebook fonts are system stacks — no import needed.
