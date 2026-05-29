"use client";

import Link from "next/link";
import { useState } from "react";
import { useRealtimeChannel } from "@/lib/realtime";
import type { Tables } from "@/lib/supabase/types";
import { MissionCard } from "./MissionCard";

type MissionRow = Tables<"missions">;
type MissionStatus = MissionRow["status"];

interface MissionListProps {
  userId: string;
  initialMissions: MissionRow[];
}

// Active work on top; finished/dead at the bottom.
const STATUS_ORDER: Record<MissionStatus, number> = {
  in_progress: 0,
  draft: 1,
  generating: 2,
  completed: 3,
  abandoned: 4,
  failed: 5,
};

function sortMissions(rows: MissionRow[]): MissionRow[] {
  return [...rows].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    // Newest activity first within a status group.
    return (
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  });
}

export function MissionList({ userId, initialMissions }: MissionListProps) {
  const [missions, setMissions] = useState<MissionRow[]>(() =>
    sortMissions(initialMissions),
  );

  useRealtimeChannel<MissionRow>(
    "missions",
    { filter: { column: "user_id", value: userId } },
    (payload) => {
      setMissions((prev) => {
        if (payload.eventType === "DELETE") {
          const goneId = payload.old?.id;
          return prev.filter((m) => m.id !== goneId);
        }
        const row = payload.new;
        if (!row?.id) return prev;
        const idx = prev.findIndex((m) => m.id === row.id);
        const next =
          idx === -1
            ? [...prev, row]
            : prev.map((m) => (m.id === row.id ? row : m));
        return sortMissions(next);
      });
    },
    [userId],
  );

  if (missions.length === 0) {
    return (
      <div className="dashboard-empty">
        <p className="dashboard-empty-title">No missions yet</p>
        <p className="dashboard-empty-text">
          Pick a topic and DevMind will build you a custom coding mission.
        </p>
        <Link href="/missions/new" className="dashboard-primary-btn">
          Start your first mission
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-actions">
        <Link href="/missions/new" className="dashboard-primary-btn">
          + New mission
        </Link>
      </div>
      <div className="dashboard-grid">
        {missions.map((mission) => (
          <MissionCard key={mission.id} mission={mission} />
        ))}
      </div>
    </>
  );
}
