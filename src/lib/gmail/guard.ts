/** Hosts that must never receive a Gmail session, even if someone allowlists them. */
const PUBLIC_TUNNEL_SUFFIXES = [
  "trycloudflare.com",
  "ngrok.io",
  "ngrok-free.app",
  "ngrok.app",
  "loca.lt",
  "localtunnel.me",
  "serveo.net",
  "localhost.run",
];

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

const FORBIDDEN_SCOPES = [
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.insert",
];

export type HostBlock = "public-link" | "not-allowed";

export function hostnameFrom(hostHeader: string | null): string {
  return (hostHeader ?? "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

export function gmailHostBlock(
  hostHeader: string | null,
  viaCloudflare = false,
): HostBlock | null {
  const host = hostnameFrom(hostHeader);
  if (!host) return "not-allowed";
  if (PUBLIC_TUNNEL_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
    return "public-link";
  }
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]") {
    // A tunnel that rewrites Host to localhost still arrives with Cloudflare headers.
    return viaCloudflare ? "public-link" : null;
  }
  const allowed = (process.env.GMAIL_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(host) ? null : "not-allowed";
}

export function gmailConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GMAIL_TOKEN_SECRET &&
      process.env.GMAIL_TOKEN_SECRET.length >= 16,
  );
}

/** Reject any grant wider than read-only. A missing scope string is not itself a wider grant. */
export function scopeIsReadOnly(scope: string | undefined): boolean {
  if (!scope) return true;
  const granted = new Set(scope.split(/\s+/).filter(Boolean));
  if (!granted.has(GMAIL_SCOPE)) return false;
  return !FORBIDDEN_SCOPES.some((item) => granted.has(item));
}
