"use client";

import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * The tables we subscribe to. All are in the `supabase_realtime` publication
 * (see spec/db/001_initial_schema.sql + 005_board_concepts_threads.sql) so no
 * DB-side setup is required at the call site. The board subscribes to
 * `concepts` (column moves).
 */
export type RealtimeTable =
  | "cells"
  | "thread_messages"
  | "puzzles"
  | "notebooks"
  | "concepts";

export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE";

export interface RealtimeChangePayload<Row> {
  eventType: RealtimeEventType;
  new: Row;
  old: Row;
}

interface UseRealtimeChannelOptions {
  /** Column-equality filter, e.g. { column: 'notebook_id', value: m_42 } */
  filter: { column: string; value: string };
}

/**
 * Subscribe to postgres_changes on a single table, filtered by one column.
 *
 * Channel naming convention: `${table}:${column}=${value}` — readable in the
 * Supabase Realtime inspector, and unique per (table, filter) pair.
 *
 * The `onChange` callback is stored in a ref so callers can pass inline
 * arrow functions without re-subscribing on every render. Re-subscription
 * only happens when `deps` change (treat it like the dep array of useEffect).
 */
export function useRealtimeChannel<Row>(
  table: RealtimeTable,
  options: UseRealtimeChannelOptions,
  onChange: (payload: RealtimeChangePayload<Row>) => void,
  deps: ReadonlyArray<unknown>,
): void {
  const callbackRef = useRef(onChange);
  useEffect(() => {
    callbackRef.current = onChange;
  }, [onChange]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const supabase = createClient();
    const { column, value } = options.filter;
    const channelName = `${table}:${column}=${value}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as never, // typing in @supabase/supabase-js is overly narrow here
        {
          event: "*",
          schema: "public",
          table,
          filter: `${column}=eq.${value}`,
        },
        (raw: RealtimePostgresChangesPayload<Row & Record<string, unknown>>) => {
          callbackRef.current({
            eventType: raw.eventType as RealtimeEventType,
            new: raw.new as Row,
            old: raw.old as Row,
          });
        },
      )
      .subscribe();

    return () => {
      // removeChannel() also unsubscribes — preferred over channel.unsubscribe()
      // because it frees the client-side registration.
      void supabase.removeChannel(channel);
    };
    // The caller-controlled deps array decides when to re-subscribe. We do
    // not include `options.filter.*` or `table` here on purpose — those
    // values should already be reflected in `deps` when they really change.
  }, deps);
}
