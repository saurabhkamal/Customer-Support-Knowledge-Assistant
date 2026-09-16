import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./app/lib/auth";

// Proxy always runs on the Node.js runtime, so this can use Node's crypto
// module directly, sharing the exact same verify logic as the login route.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Must stay open: this is the endpoint that establishes the session.
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const username = verifySessionToken(token);

  if (pathname === "/login") {
    if (username) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!username) {
    // /api/[...path] is the backend proxy, called via fetch rather than
    // navigation — it needs a JSON 401, not an HTML redirect the caller
    // can't parse as data.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
