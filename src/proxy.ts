import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const name = host.split(",")[0]?.trim().split(":")[0] ?? "";
  if (name.endsWith(".lhr.life") || name.endsWith(".serveousercontent.com") || name.endsWith(".serveo.net")) {
    const url = request.nextUrl.clone();
    url.pathname = "/go";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
