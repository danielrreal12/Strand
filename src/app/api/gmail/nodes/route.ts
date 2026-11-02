import { NextRequest, NextResponse } from "next/server";
import { anthoneyMessages } from "@/lib/gmail/messages";
import { mailToNode } from "@/lib/gmail/parse";
import { refreshAccessToken } from "@/lib/gmail/oauth";
import { gmailCookies } from "@/lib/gmail/session";
import { blockedResponse, readSession } from "@/lib/gmail/http";
import { scopeIsReadOnly } from "@/lib/gmail/guard";

export async function GET(request: NextRequest) {
  const blocked = blockedResponse(request);
  if (blocked) return blocked;
  const session = readSession(request, request.cookies.get(gmailCookies.session)?.value);
  if (!session) {
    return NextResponse.json({ ok: false, reason: "signed-out" }, { status: 401 });
  }

  try {
    const tokens = await refreshAccessToken(session.refreshToken);
    if (!scopeIsReadOnly(tokens.scope)) {
      return NextResponse.json({ ok: false, reason: "scope" }, { status: 403 });
    }
    const messages = await anthoneyMessages(tokens.accessToken);
    return NextResponse.json(
      {
        ok: true,
        account: session.email,
        messages: messages.map((mail) => ({
          id: mail.id,
          from: mail.from,
          subject: mail.subject,
          date: mail.date,
        })),
        nodes: messages.map(mailToNode),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, reason: "gmail" }, { status: 502 });
  }
}
