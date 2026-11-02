import { createHash, randomBytes } from "crypto";
import { GMAIL_SCOPE } from "./guard";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  expiresIn: number;
};

function clientId(): string {
  return process.env.GOOGLE_CLIENT_ID ?? "";
}

function clientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET ?? "";
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function authorizationUrl(input: {
  redirectUri: string;
  state: string;
  verifier: string;
}): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", codeChallenge(input.verifier));
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

async function postToken(body: URLSearchParams): Promise<GoogleTokens> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Google token exchange failed");
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    scope: json.scope,
    expiresIn: json.expires_in ?? 3600,
  };
}

export function exchangeCode(input: {
  code: string;
  redirectUri: string;
  verifier: string;
}): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
    code_verifier: input.verifier,
  });
  return postToken(body);
}

export function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: "refresh_token",
  });
  return postToken(body);
}

export async function revokeToken(token: string): Promise<void> {
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });
}
