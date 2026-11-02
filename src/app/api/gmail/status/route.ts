import { NextRequest, NextResponse } from "next/server";
import { gmailConfigured } from "@/lib/gmail/guard";
import { gmailCookies } from "@/lib/gmail/session";
import { hostBlock, readSession } from "@/lib/gmail/http";

export async function GET(request: NextRequest) {
  const block = hostBlock(request);
  if (block) {
    return NextResponse.json(
      { allowed: false, reason: block, configured: false, connected: false },
      { headers: { "cache-control": "no-store" } },
    );
  }
  const session = readSession(request, request.cookies.get(gmailCookies.session)?.value);
  return NextResponse.json(
    {
      allowed: true,
      configured: gmailConfigured(),
      connected: Boolean(session),
      account: session?.email,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
