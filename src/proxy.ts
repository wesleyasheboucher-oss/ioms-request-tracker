import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: send visitors without a session cookie to the login
// page. Pages and actions still verify the session themselves.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("tracker_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
