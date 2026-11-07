"use client";
import { useState } from "react";
import { money, type BillingWeek, type CyclePayment } from "@/lib/splicer";
import { useSplicer } from "./provider";
import "./workspace.css";

export function CyclePaymentEditor({ person, week, payment }: { person: "Daniel" | "Iván"; week: BillingWeek; payment?: CyclePayment }) {
  const s = useSplicer();
  const [mode, setMode] = useState(week.received >= week.earned && week.earned > 0 ? "full" : week.received > 0 ? "partial" : "unpaid");
  const [amount, setAmount] = useState(String(week.received || ""));
  const [date, setDate] = useState(payment?.paidDate || s.today);
  const [notes, setNotes] = useState(payment?.notes || "");
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const received = mode === "full" ? week.earned : mode === "unpaid" ? 0 : Number(amount);
    if (!Number.isFinite(received) || received < 0 || received > week.earned || (mode === "partial" && (received <= 0 || received >= week.earned))) { setError("Enter a partial amount greater than zero and less than the earned share."); return; }
    setError("");
    await s.saveCyclePayment(person, week.start, { amount: received, paidDate: received ? date : "", notes });
  }
  return <form className="cycle-payment-editor" aria-label={`Payment for ${person} cycle ${week.start}`} onSubmit={save}>
    <p><strong>{person}’s share: {money(week.earned)}</strong><br />Record the total received for this person and cycle, not the full company check. Updating replaces the previous received total.</p>
    <label>Payment status<select aria-label="Payment status" value={mode} onChange={(event) => { const next = event.target.value; setMode(next); if (next === "full") setAmount(String(week.earned)); if (next === "unpaid") setAmount("0"); }}><option value="unpaid">Unpaid</option><option value="partial">Partially paid</option><option value="full">Fully paid</option></select></label>
    {mode === "partial" ? <label>Total amount received (USD)<input type="number" min="0.01" max={Math.max(0, week.earned - 0.01)} step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} /></label> : null}
    {mode !== "unpaid" ? <label>Date received<input type="date" required max={s.today} value={date} onChange={(event) => setDate(event.target.value)} /></label> : null}
    <label>Payment note<textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Check reference or payment note" /></label>
    {error ? <p className="error" role="alert">{error}</p> : null}
    <p>Remaining after this update: <strong>{money(Math.max(0, week.earned - (mode === "full" ? week.earned : mode === "unpaid" ? 0 : Number(amount) || 0)))}</strong></p>
    <button className="primary" type="submit" disabled={s.saving}>{s.saving ? "Saving…" : "Save cycle payment"}</button>
  </form>;
}
