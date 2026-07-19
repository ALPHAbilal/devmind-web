"use client";

import Link from "next/link";
import { useState } from "react";
import { useRealtimeChannel } from "@/lib/realtime";
import type { Tables } from "@/lib/supabase/types";
import { NotebookCard } from "./NotebookCard";

type NotebookRow = Tables<"notebooks">;
type NotebookStatus = NotebookRow["status"];

interface NotebookListProps {
  userId: string;
  initialNotebooks: NotebookRow[];
}

// Active work on top; finished/dead at the bottom.
const STATUS_ORDER: Record<NotebookStatus, number> = {
  in_progress: 0,
  draft: 1,
  generating: 2,
  completed: 3,
  abandoned: 4,
  failed: 5,
};

function sortNotebooks(rows: NotebookRow[]): NotebookRow[] {
  return [...rows].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    // Newest activity first within a status group.
    return (
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  });
}

export function NotebookList({ userId, initialNotebooks }: NotebookListProps) {
  const [notebooks, setNotebooks] = useState<NotebookRow[]>(() =>
    sortNotebooks(initialNotebooks),
  );

  useRealtimeChannel<NotebookRow>(
    "notebooks",
    { filter: { column: "user_id", value: userId } },
    (payload) => {
      setNotebooks((prev) => {
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
        return sortNotebooks(next);
      });
    },
    [userId],
  );

  if (notebooks.length === 0) {
    return (
      <div className="dashboard-empty">
        <p className="dashboard-empty-title">No notebooks yet</p>
        <p className="dashboard-empty-text">
          Pick a topic and DevMind will build you a custom coding notebook.
        </p>
        <Link href="/notebooks/new" className="dashboard-primary-btn">
          Start your first notebook
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-actions">
        <Link href="/notebooks/new" className="dashboard-primary-btn">
          + New notebook
        </Link>
      </div>
      <div className="dashboard-grid">
        {notebooks.map((notebook) => (
          <NotebookCard key={notebook.id} notebook={notebook} />
        ))}
      </div>
    </>
  );
}
