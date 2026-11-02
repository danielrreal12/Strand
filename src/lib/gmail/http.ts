import { NextResponse } from "next/server";
import { gmailConfigured, gmailHostBlock, type HostBlock } from "./guard";
import { gmailCookies, open, type GmailSession, type OAuthPending } from "./session";

export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const forwarded = request.headers.get("x-forwarded-proto");
  const proto = forwarded?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

export function redirectUri(request: Request): string {
  return `${requestOrigin(request)}/api/gmail/callback`;
}

export function cookieSecure(request: Request): boolean {
  return requestOrigin(request).startsWith("https://");
}

export function hostBlock(request: Request): HostBlock | null {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const viaCloudflare = Boolean(
    request.headers.get("cf-ray") || request.headers.get("cf-connecting-ip"),
  );
  return gmailHostBlock(host, viaCloudflare);
}

export function blockedResponse(request: Request): NextResponse | null {
  const block = hostBlock(request);
  if (!block) return null;
  return NextResponse.json(
    { ok: false, reason: block },
    { status: 403, headers: { "cache-control": "no-store" } },
  );
}

export function readSession(request: Request, cookie: string | undefined): GmailSession | null {
  if (hostBlock(request) || !gmailConfigured()) return null;
  return open<GmailSession>(cookie);
}

export function readPending(request: Request, cookie: string | undefined): OAuthPending | null {
  if (hostBlock(request) || !gmailConfigured()) return null;
  return open<OAuthPending>(cookie);
}

export function pageRedirect(request: Request, query: string): NextResponse {
  return NextResponse.redirect(new URL(`/${query}`, requestOrigin(request)));
}
