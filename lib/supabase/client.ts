"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser-side Supabase client. Use from "use client" components / hooks.
 *
 * Reads creds from NEXT_PUBLIC_* env vars (safe to ship to the browser —
 * the anon key is RLS-protected per spec/db/001_initial_schema.sql).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
