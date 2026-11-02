"use client";

import { useMemo, useState } from "react";
import { INVOICES as SEED } from "@/lib/data";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { InvoiceBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

const FILTERS: Array<{ id: "all" | InvoiceStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent" },
  { id: "paid", label: "Paid" },
  { id: "overdue", label: "Overdue" },
];

export function BillingView() {
  const [invoices, setInvoices] = useState<Invoice[]>(SEED);
  const [filter, setFilter] = useState<"all" | InvoiceStatus>("all");

  const rows = useMemo(
    () =>
      invoices.filter((i) => (filter === "all" ? true : i.status === filter)),
    [invoices, filter],
  );

  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((n, i) => n + i.amount, 0);
  const paid = invoices
    .filter((i) => i.status === "paid")
    .reduce((n, i) => n + i.amount, 0);

  function markPaid(id: string) {
    setInvoices((list) =>
      list.map((inv) => (inv.id === id ? { ...inv, status: "paid" } : inv)),
    );
  }

  function sendDraft(id: string) {
    setInvoices((list) =>
      list.map((inv) => (inv.id === id ? { ...inv, status: "sent" } : inv)),
    );
  }

  return (
    <div className="space-y-6">
      <header className="rise-in">
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Billing
        </h2>
        <p className="mt-1 text-muted-foreground">
          Turn finished splices into cash without leaving the truck.
        </p>
      </header>

      <div className="rise-in rise-in-delay-1 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card/60 p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Outstanding
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-copper tabular-nums">
            ${outstanding.toLocaleString("en-US")}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/60 p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Collected
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-primary tabular-nums">
            ${paid.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      <div className="rise-in rise-in-delay-2 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "secondary"}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <ul className="rise-in rise-in-delay-3 space-y-2">
        {rows.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing in this bucket.
          </li>
        ) : (
          rows.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-sm text-primary">{inv.number}</p>
                  <InvoiceBadge status={inv.status} />
                </div>
                <p className="mt-1 font-medium">{inv.client}</p>
                <p className="text-sm text-muted-foreground">
                  {inv.jobTitle} · due {inv.due}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xl font-bold tracking-tight tabular-nums">
                  ${inv.amount.toLocaleString("en-US")}
                </p>
                {inv.status === "draft" ? (
                  <Button size="sm" variant="secondary" onClick={() => sendDraft(inv.id)}>
                    Send
                  </Button>
                ) : null}
                {inv.status === "sent" || inv.status === "overdue" ? (
                  <Button size="sm" onClick={() => markPaid(inv.id)}>
                    Mark paid
                  </Button>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
