import { NextRequest, NextResponse } from "next/server";
import { revokeToken } from "@/lib/gmail/oauth";
import { gmailCookies } from "@/lib/gmail/session";
import { blockedResponse, cookieSecure, readSession } from "@/lib/gmail/http";

export async function POST(request: NextRequest) {
  const blocked = blockedResponse(request);
  if (blocked) return blocked;
  const session = readSession(request, request.cookies.get(gmailCookies.session)?.value);
  if (session) {
    await revokeToken(session.refreshToken);
  }
  const response = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  response.cookies.set({
    name: gmailCookies.session,
    value: "",
    httpOnly: true,
    secure: cookieSecure(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
