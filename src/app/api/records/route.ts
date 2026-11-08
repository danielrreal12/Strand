import { connection } from "next/server";
import { currentSession } from "@/lib/session.server";
import { applyRecordWrite, readStore, sanitizeStore, writeStore, withStoreLock } from "@/lib/store.server";
import { presentNodes } from "@/lib/splicer";

function visible(store: { updatedAt: string; nodes: Parameters<typeof presentNodes>[0]; routes: Record<string, unknown>; cyclePayments?: import("@/lib/splicer").CyclePayments } | null, role: "admin" | "splicer", id: "Daniel" | "Iván" | "Chris" | "Master") {
  if (!store) return { updatedAt: null, nodes: [], routes: {}, cyclePayments: {} };
  return { updatedAt: store.updatedAt, nodes: presentNodes(store.nodes, role, id === "Master" ? "Daniel" : id), routes: store.routes, cyclePayments: role === "admin" ? store.cyclePayments ?? {} : Object.fromEntries(Object.entries(store.cyclePayments ?? {}).filter(([key]) => key.startsWith(`${id}:`))) };
}

export async function GET() {
  await connection();
  const session = await currentSession();
  if (!session) return Response.json({ error: "Sign in again." }, { status: 401 });
  const store = await readStore();
  return Response.json(visible(store, session.role, session.id));
}

export async function PUT(request: Request) {
  await connection();
  const session = await currentSession();
  if (!session) return Response.json({ error: "Sign in again." }, { status: 401 });
  const raw = await request.text();
  if (raw.length > 2_000_000) return Response.json({ error: "That backup is too large." }, { status: 413 });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return Response.json({ error: "The records aren’t valid." }, { status: 400 });
  }
  const incoming = sanitizeStore(parsed);
  if (!incoming) return Response.json({ error: "The records aren’t valid." }, { status: 400 });
  return withStoreLock(async () => {
  const current = await readStore();
  const baseUpdatedAt = parsed && typeof parsed === "object" && typeof (parsed as { baseUpdatedAt?: unknown }).baseUpdatedAt === "string"
    ? (parsed as { baseUpdatedAt: string }).baseUpdatedAt
    : null;
  if (current && baseUpdatedAt !== current.updatedAt) {
    return Response.json({ ...visible(current, session.role, session.id), error: "The records changed. Reloading." }, { status: 409 });
  }
  const next = applyRecordWrite(current, incoming, session.role, session.id === "Master" ? "Daniel" : session.id);
  const saved = await writeStore(next);
  return Response.json(visible(saved, session.role, session.id));
  });
}
