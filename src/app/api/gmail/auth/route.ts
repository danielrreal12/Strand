import { NextRequest, NextResponse } from "next/server";
import { gmailConfigured } from "@/lib/gmail/guard";
import { authorizationUrl, randomToken } from "@/lib/gmail/oauth";
import { gmailCookies, seal } from "@/lib/gmail/session";
import { cookieSecure, hostBlock, pageRedirect, redirectUri } from "@/lib/gmail/http";

export async function GET(request: NextRequest) {
  const block = hostBlock(request);
  if (block) return pageRedirect(request, "?gmail=off");
  if (!gmailConfigured()) return pageRedirect(request, "?gmail=setup");

  const state = randomToken(24);
  const verifier = randomToken(48);
  const response = NextResponse.redirect(
    authorizationUrl({ redirectUri: redirectUri(request), state, verifier }),
  );
  response.cookies.set({
    name: gmailCookies.oauth,
    value: seal({ state, verifier }),
    httpOnly: true,
    secure: cookieSecure(request),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
