"use client";

/**
 * Sidebar — sectioned rail. Brand row (+ new-topic), a "Threads" nav item, the
 * technology father-sections, a History section under them, and the gear pinned
 * to the bottom. Mirrors the demo's `renderSidebar()`. Collapse/expand is driven
 * by `.app.sb-collapsed` (width-only animation → no icon X-delta).
 */
import { secOf } from "@/lib/board/mock";
import { useBoard } from "./BoardContext";
import { SidebarSection } from "./SidebarSection";
import { Gear, Logo, Threads } from "./icons";

export function Sidebar() {
  const { state, dispatch, data, focusDock } = useBoard();
  const activeSec = secOf(state.tech);
  const navOn = state.nav === "threads" || state.nav === "thread";

  return (
    <aside className="sidebar">
      <div className="brandrow">
        <span className="ic">
          <Logo />
        </span>
        <span className="brand">
          dev<b>mind</b>
        </span>
        <button
          className="newx"
          title="New topic"
          onClick={() => {
            dispatch({ type: "newTopic" });
            focusDock();
          }}
        >
          +
        </button>
      </div>

      <div className="scrollarea">
        <button
          className={`navitem ${navOn ? "on" : ""}`}
          onClick={() => dispatch({ type: "setNav", nav: "threads" })}
        >
          <span className="ic">
            <Threads />
          </span>
          <span className="sname">Threads</span>
        </button>

        <div className="divz" />

        {data.sections.map((s) => (
          <SidebarSection
            key={s.id}
            id={s.id}
            name={s.name}
            icon={s.icon}
            open={state.openSec === s.id}
            active={s.id === activeSec}
          >
            {s.kids.map((tk) => (
              <button
                key={tk}
                className={`tech ${tk === state.tech ? "on" : ""}`}
                onClick={() => dispatch({ type: "setTech", tech: tk })}
              >
                <span className="dot" />
                <span className="tnm">{data.techs[tk].label}</span>
              </button>
            ))}
          </SidebarSection>
        ))}

        <div className="divz" />

        <SidebarSection
          key={data.history.id}
          id={data.history.id}
          name={data.history.name}
          icon={data.history.icon}
          open={state.openSec === data.history.id}
          active={false}
        >
          {data.history.items.map((t) => (
            <button
              key={t}
              className="tech"
              onClick={() => dispatch({ type: "openSheet", cfg: { mode: "open", title: t } })}
            >
              <span className="dot" />
              <span className="tnm">{t}</span>
            </button>
          ))}
        </SidebarSection>
      </div>

      <button className="side-set" title="Settings">
        <Gear />
      </button>
    </aside>
  );
}
