import { connection } from "next/server";
import { currentSession } from "@/lib/session.server";
import { readStore, writeStore, withStoreLock } from "@/lib/store.server";
import { billingWeeks, chicagoToday, seedNodesList } from "@/lib/splicer";

export async function PUT(request: Request) {
  await connection();
  const session = await currentSession();
  if (!session) return Response.json({ error: "Sign in again." }, { status: 401 });
  if (session.role !== "admin") return Response.json({ error: "Daniel records cycle payments." }, { status: 403 });
  let body: { person?: unknown; start?: unknown; amount?: unknown; paidDate?: unknown; notes?: unknown; baseUpdatedAt?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 8000) return Response.json({ error: "Payment record is too large." }, { status: 413 });
    body = JSON.parse(raw);
    if (!body || typeof body !== "object") throw new Error();
  } catch { return Response.json({ error: "Enter a valid payment record." }, { status: 400 }); }
  const { person, start, amount, paidDate } = body;
  if ((person !== "Daniel" && person !== "Iván") || typeof start !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(start) || typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) return Response.json({ error: "Enter a nonnegative amount with at most two decimal places." }, { status: 400 });
  if (amount > 0 && (typeof paidDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(paidDate) || Number.isNaN(Date.parse(`${paidDate}T12:00:00Z`)) || new Date(`${paidDate}T12:00:00Z`).toISOString().slice(0, 10) !== paidDate || paidDate > chicagoToday())) return Response.json({ error: "Choose the date the payment was received, no later than today." }, { status: 400 });
  return withStoreLock(async () => {
    const current = await readStore();
    if ((current?.updatedAt ?? null) !== (body.baseUpdatedAt ?? null)) return Response.json({ ...current, error: "Records changed. Review the latest balance and save again." }, { status: 409 });
    const store = current ?? { updatedAt: "", nodes: seedNodesList(), routes: {}, cyclePayments: {} };
    const week = billingWeeks(store.nodes, chicagoToday(), person, store.cyclePayments).find((item) => item.start === start);
    if (!week || !week.count || amount > week.earned) return Response.json({ error: "The received amount cannot exceed this person’s earned share for the cycle." }, { status: 400 });
    const key = `${person}:${start}`;
    const saved = await writeStore({ ...store, cyclePayments: { ...store.cyclePayments, [key]: { amount: Math.round(amount * 100) / 100, paidDate: amount ? String(paidDate) : "", notes: String(body.notes ?? "").slice(0, 500) } } });
    return Response.json(saved);
  });
}
