import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const cookieName = "promptswar_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "local-development-secret-change-me",
);

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.sub === "string" && payload.sub.length > 0;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const authenticated = await hasValidSession(request);
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(authenticated ? "/dashboard" : "/login", request.url),
    );
  }

  if (pathname === "/dashboard" && !authenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard"],
};
