"use client";

import { useState } from "react";
import {
  CalendarDays,
  CircleDollarSign,
  LayoutDashboard,
  Lock,
  Menu,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { clearSession } from "@/lib/auth";
import { OverviewView } from "@/components/overview-view";
import { CalendarView } from "@/components/calendar-view";
import { ProductionView } from "@/components/production-view";
import { BillingView } from "@/components/billing-view";
import { CREW } from "@/lib/data";

type Tab = "overview" | "calendar" | "production" | "billing";

const NAV: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "production", label: "Production", icon: Wrench },
  { id: "billing", label: "Billing", icon: CircleDollarSign },
];

export function AppShell({ onLock }: { onLock: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [open, setOpen] = useState(false);
  const onSite = CREW.filter((c) => c.status !== "off").length;

  function lock() {
    clearSession();
    onLock();
  }

  function go(id: Tab) {
    setTab(id);
    setOpen(false);
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <header className="rise-in mb-6 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/50 px-3 py-2.5 backdrop-blur-md sm:px-4">
        <div className="flex items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="md:hidden"
              render={
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Open menu"
                />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] border-border bg-card">
              <SheetHeader>
                <SheetTitle className="font-heading">Strand</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1 px-2">
                {NAV.map((item) => (
                  <Button
                    key={item.id}
                    variant={tab === item.id ? "default" : "ghost"}
                    className="justify-start"
                    onClick={() => go(item.id)}
                  >
                    <item.icon />
                    {item.label}
                  </Button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <div>
            <p className="font-heading text-[0.65rem] font-semibold tracking-[0.22em] text-primary">
              STRAND
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Field ops control
            </p>
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
            {onSite} crew active
          </span>
          <Button variant="secondary" size="sm" onClick={lock}>
            <Lock />
            <span className="hidden sm:inline">Lock</span>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {tab === "overview" ? <OverviewView /> : null}
        {tab === "calendar" ? <CalendarView /> : null}
        {tab === "production" ? <ProductionView /> : null}
        {tab === "billing" ? <BillingView /> : null}
      </main>

      <footer className="mt-10 flex items-center justify-between gap-3 border-t border-border/40 pt-4 text-xs text-muted-foreground">
        <p className="inline-flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-copper" />
          Strand keeps the board, the vault, and the invoice in one place.
        </p>
        <p className="hidden sm:block">Demo data · local PIN session</p>
      </footer>
    </div>
  );
}
