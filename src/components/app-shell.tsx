"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession } from "@/lib/auth";
import { NodesView } from "@/components/nodes-view";
import { PAY_PER_NODE } from "@/lib/nodes";

export function AppShell({ onLock }: { onLock: () => void }) {
  function lock() {
    clearSession();
    onLock();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
      <header className="rise-in mb-5 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/50 px-3 py-2.5 backdrop-blur-md sm:mb-6 sm:px-4">
        <div>
          <p className="font-heading text-[0.65rem] font-semibold tracking-[0.22em] text-primary">
            OPTIMUM
          </p>
          <p className="text-xs text-muted-foreground">Nodes · ${PAY_PER_NODE} each</p>
        </div>
        <Button variant="secondary" size="sm" onClick={lock}>
          <Lock />
          <span className="hidden sm:inline">Lock</span>
        </Button>
      </header>

      <main className="flex-1">
        <NodesView />
      </main>
    </div>
  );
}
