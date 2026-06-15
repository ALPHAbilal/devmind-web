import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // The live /board reads owner-scoped data, so it's gated like /dashboard.
  // The only exception is the mock escape hatch `/board?mock=true` (the typed
  // Phase-0 board, no auth/data deps — same convention the Wizard uses).
  if (
    request.nextUrl.pathname === "/board" &&
    request.nextUrl.searchParams.get("mock") === "true"
  ) {
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image-optimization
     * results. Auth gating logic lives in updateSession().
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
