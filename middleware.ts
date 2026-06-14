import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // /board is the Phase-0 board on typed MOCK data — no auth/data deps, like the
  // existing /design-test and /realtime-test dev surfaces. Skip the session gate
  // so it renders standalone. (Phase 2 removes this when the board reads live,
  // owner-scoped data and should be gated like /dashboard.)
  if (request.nextUrl.pathname === "/board") return NextResponse.next();
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
