import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const SESSION_COOKIE = "optimum_gmail";
const OAUTH_COOKIE = "optimum_gmail_oauth";

export type GmailSession = {
  refreshToken: string;
  email: string;
};

export type OAuthPending = {
  state: string;
  verifier: string;
};

function encryptionKey(): Buffer {
  const secret = process.env.GMAIL_TOKEN_SECRET ?? "";
  return scryptSync(secret, "optimum-nodes-gmail", 32);
}

export function seal(value: object): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function open<T>(token: string | undefined): T | null {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, "base64url");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(plain.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export const gmailCookies = {
  session: SESSION_COOKIE,
  oauth: OAUTH_COOKIE,
};
