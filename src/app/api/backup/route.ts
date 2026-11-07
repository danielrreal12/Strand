import { connection } from "next/server";
import { currentSession } from "@/lib/session.server";
import { readStore, sanitizeStore, writeStore, withStoreLock } from "@/lib/store.server";

export async function GET() {
  await connection();
  const session = await currentSession();
  if (!session) return Response.json({ error: "Sign in again." }, { status: 401 });
  if (session.role !== "admin") return Response.json({ error: "Only Daniel can download the backup." }, { status: 403 });
  const store = await readStore();
  if (!store) return Response.json({ error: "Nothing has been saved yet." }, { status: 404 });
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Response(JSON.stringify(store), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="optimum-backup-${day}.json"`,
    },
  });
}

export async function POST(request: Request) {
  await connection();
  const session = await currentSession();
  if (!session) return Response.json({ error: "Sign in again." }, { status: 401 });
  if (session.role !== "admin") return Response.json({ error: "Only Daniel can restore a backup." }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 2_000_000) return Response.json({ error: "That backup is too large." }, { status: 413 });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return Response.json({ error: "That file isn’t a backup." }, { status: 400 });
  }
  const incoming = sanitizeStore(parsed);
  if (!incoming) return Response.json({ error: "That file isn’t a backup." }, { status: 400 });
  return withStoreLock(async () => {
    const current = await readStore();
    if (!(parsed && typeof parsed === "object" && "cyclePayments" in parsed)) incoming.cyclePayments = current?.cyclePayments ?? {};
    const saved = await writeStore(incoming);
    return Response.json(saved);
  });
}
