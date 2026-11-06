import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { cookies } from "next/headers";
import type { CrewName, CrewRole } from "./splicer";
import { dataDir, sessionSecretFile } from "./paths.server";

const COOKIE = "splicer_session";
export const SESSION_DAYS = 7;

export type SessionPayload = { id: CrewName; role: CrewRole; exp: number };
export type AttemptState = { fails: number; lockedUntil: number };

let secretPromise: Promise<string> | null = null;

export function signToken(payload: SessionPayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readToken(token: string, secret: string, now = Date.now()): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!payload?.exp || payload.exp < now) return null;
    if (payload.id !== "Daniel" && payload.id !== "Iván" && payload.id !== "Chris") return null;
    if (payload.role !== "admin" && payload.role !== "splicer") return null;
    return payload;
  } catch {
    return null;
  }
}

export function judgeAttempt(state: AttemptState, ok: boolean, now: number) {
  if (state.lockedUntil > now) return { state, locked: true };
  if (ok) return { state: { fails: 0, lockedUntil: 0 }, locked: false };
  const fails = state.fails + 1;
  if (fails >= 5) return { state: { fails: 0, lockedUntil: now + 15 * 60 * 1000 }, locked: true };
  return { state: { fails, lockedUntil: 0 }, locked: false };
}

export async function sessionSecret() {
  if (process.env.SPLICER_SESSION_SECRET) return process.env.SPLICER_SESSION_SECRET;
  secretPromise ??= (async () => {
    try {
      const existing = (await readFile(sessionSecretFile(), "utf8")).trim();
      if (existing) return existing;
    } catch {
      // First boot on this machine.
    }
    const created = randomBytes(32).toString("base64url");
    await mkdir(dataDir(), { recursive: true });
    await writeFile(sessionSecretFile(), created, { mode: 0o600 });
    return created;
  })();
  return secretPromise;
}

export async function currentSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return readToken(token, await sessionSecret());
}

export function cookieSecure(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]?.trim() === "https";
  return new URL(request.url).protocol === "https:";
}

export const SESSION_COOKIE = COOKIE;
