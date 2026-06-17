"use client";

/**
 * Sidebar — Claude-style flat rail. Serif "devmind" wordmark (click → Home/board)
 * + a search icon (the conversation / Threads search). One "New topic" action
 * row, then two quiet, always-open groups — Technologies (every section's techs,
 * flattened into one text-only list) and History (text-only) — with the gear
 * pinned at the bottom. Collapse (`.app.sb-collapsed`, driven by the floating
 * EdgeTab) animates width only; the rail keeps just the brand glyph, the search
 * icon and the gear (New topic + both lists are hidden).
 */
import { useBoard } from "./BoardContext";
import { Gear, Logo, Plus, Search } from "./icons";

export function Sidebar() {
  const { state, dispatch, data, focusDock, openHistory } = useBoard();
  const techs = data.sections.flatMap((s) => s.kids); // single flat "Technologies" list

  return (
    <aside className="sidebar">
      <div className="brandrow">
        <button
          className="brand"
          title="Home"
          onClick={() => dispatch({ type: "setNav", nav: "board" })}
        >
          <span className="ic brand-ic">
            <Logo />
          </span>
          <span className="brandword">
            dev<b>mind</b>
          </span>
        </button>
        <button
          className="sbtn"
          title="Search conversations"
          onClick={() => dispatch({ type: "setNav", nav: "threads" })}
        >
          <Search />
        </button>
      </div>

      <div className="scrollarea">
        <button
          className="navitem"
          title="New topic"
          onClick={() => {
            dispatch({ type: "newTopic" });
            focusDock();
          }}
        >
          <span className="ic">
            <Plus />
          </span>
          <span className="sname">New topic</span>
        </button>

        <div className="slabel">Technologies</div>
        {techs.map((tk) => (
          <button
            key={tk}
            className={`litem ${tk === state.tech ? "on" : ""}`}
            onClick={() => dispatch({ type: "setTech", tech: tk })}
          >
            {data.techs[tk].label}
          </button>
        ))}

        <div className="slabel">{data.history.name}</div>
        {data.history.items.map((t) => (
          <button key={t} className="litem hist" onClick={() => openHistory(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="divz" />
      <button className="side-set" title="Settings">
        <Gear />
      </button>
    </aside>
  );
}
