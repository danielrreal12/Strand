import { connection } from "next/server";
import { cookies } from "next/headers";
import { memberById, memberByPin } from "@/lib/crew.server";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  cookieSecure,
  currentSession,
  judgeAttempt,
  sessionSecret,
  signToken,
  type AttemptState,
} from "@/lib/session.server";

const attempts = new Map<string, AttemptState>();

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return "local";
}

export async function GET() {
  await connection();
  const session = await currentSession();
  if (!session) return Response.json({ error: "Sign in again." }, { status: 401 });
  const profile = memberById(session.id);
  return Response.json({
    id: session.id,
    role: session.role,
    name: profile?.name ?? session.id,
    initials: profile?.initials ?? session.id.slice(0, 2).toUpperCase(),
  });
}

export async function POST(request: Request) {
  await connection();
  const ip = clientIp(request);
  const now = Date.now();
  const prior = attempts.get(ip) ?? { fails: 0, lockedUntil: 0 };
  if (prior.lockedUntil > now) {
    return Response.json({ error: "Too many tries. Wait 15 minutes." }, { status: 429 });
  }
  let pin = "";
  try {
    const body = (await request.json()) as { pin?: unknown };
    pin = String(body.pin ?? "").replace(/\D/g, "").slice(0, 4);
  } catch {
    pin = "";
  }
  const member = memberByPin(pin);
  const judged = judgeAttempt(prior, Boolean(member), now);
  attempts.set(ip, judged.state);
  if (!member) {
    return Response.json({ error: judged.locked ? "Too many tries. Wait 15 minutes." : "Wrong access code." }, { status: judged.locked ? 429 : 401 });
  }
  const exp = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const token = signToken({ id: member.id, role: member.role, exp }, await sessionSecret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(request),
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return Response.json({ id: member.id, role: member.role, name: member.name, initials: member.initials });
}

export async function DELETE() {
  await connection();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return Response.json({ ok: true });
}
