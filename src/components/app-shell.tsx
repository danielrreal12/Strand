"use client";

import { useState } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  Lock,
  MapPinned,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession } from "@/lib/auth";
import { NodesView } from "@/components/nodes-view";
import { CalendarView } from "@/components/calendar-view";
import { ProductionView } from "@/components/production-view";
import { BillingView } from "@/components/billing-view";
import { PAY_PER_NODE } from "@/lib/nodes";

type Tab = "nodes" | "calendar" | "production" | "billing";

const NAV: Array<{ id: Tab; label: string; icon: typeof MapPinned }> = [
  { id: "nodes", label: "Nodes", icon: MapPinned },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "production", label: "Production", icon: Wrench },
  { id: "billing", label: "Billing", icon: CircleDollarSign },
];

export function AppShell({ onLock }: { onLock: () => void }) {
  const [tab, setTab] = useState<Tab>("nodes");

  function lock() {
    clearSession();
    onLock();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-10 lg:px-8">
      <header className="rise-in mb-5 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/50 px-3 py-2.5 backdrop-blur-md sm:mb-6 sm:px-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-heading text-[0.65rem] font-semibold tracking-[0.22em] text-primary">
              OPTIMUM
            </p>
            <p className="text-xs text-muted-foreground">Nodes · ${PAY_PER_NODE} each</p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Button
              key={item.id}
              size="sm"
              variant={tab === item.id ? "default" : "ghost"}
              onClick={() => setTab(item.id)}
            >
              <item.icon />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex">
            <span className="pulse-live size-1.5 rounded-full bg-primary" />
            Production week
          </span>
          <Button variant="secondary" size="sm" onClick={lock}>
            <Lock />
            <span className="hidden sm:inline">Lock</span>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {tab === "nodes" ? <NodesView /> : null}
        {tab === "calendar" ? <CalendarView /> : null}
        {tab === "production" ? <ProductionView /> : null}
        {tab === "billing" ? <BillingView /> : null}
      </main>

      <footer className="mt-8 flex items-center justify-between gap-3 border-t border-border/40 pt-4 text-xs text-muted-foreground sm:mt-10">
        <p className="inline-flex items-center gap-1.5">
          <Sparkles className="size-3.5 shrink-0 text-copper" />
          Add Optimum Nodes to your Home Screen for full-screen access.
        </p>
        <p className="hidden sm:block">Demo data · local PIN session</p>
      </footer>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 px-1 pt-1 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {NAV.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="size-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
