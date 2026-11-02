import { NextRequest } from "next/server";
import { scopeIsReadOnly } from "@/lib/gmail/guard";
import { mailboxAddress } from "@/lib/gmail/messages";
import { exchangeCode } from "@/lib/gmail/oauth";
import { gmailCookies, seal } from "@/lib/gmail/session";
import { cookieSecure, pageRedirect, readPending, redirectUri } from "@/lib/gmail/http";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const pending = readPending(request, request.cookies.get(gmailCookies.oauth)?.value);

  const finish = (query: string) => {
    const response = pageRedirect(request, query);
    response.cookies.set({
      name: gmailCookies.oauth,
      value: "",
      httpOnly: true,
      secure: cookieSecure(request),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  };

  if (!pending || !code || !state || state !== pending.state) {
    return finish("?gmail=error");
  }

  try {
    const tokens = await exchangeCode({
      code,
      redirectUri: redirectUri(request),
      verifier: pending.verifier,
    });
    if (!tokens.refreshToken || !tokens.scope || !scopeIsReadOnly(tokens.scope)) {
      return finish("?gmail=error");
    }
    const email = await mailboxAddress(tokens.accessToken);
    const response = finish("?gmail=connected");
    response.cookies.set({
      name: gmailCookies.session,
      value: seal({ refreshToken: tokens.refreshToken, email }),
      httpOnly: true,
      secure: cookieSecure(request),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return finish("?gmail=error");
  }
}
