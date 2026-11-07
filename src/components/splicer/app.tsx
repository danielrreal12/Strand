"use client";

import { useEffect, useState } from "react";
import { type CrewName, type CrewRole } from "@/lib/splicer";
import { BillingView } from "./billing";
import { CalendarView } from "./calendar";
import { Modals } from "./modals";
import { NodesView } from "./nodes";
import { PinGate } from "./pin-gate";
import { SplicerProvider, useSplicer } from "./provider";
import { RoutesView } from "./routes";
import { Shell } from "./shell";
import { OverviewView } from "./overview";
import { SettingsView } from "./settings";
import { StatsView } from "./stats";

type SignedIn = { id: CrewName; role: CrewRole };

export function SplicerApp() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SignedIn | null>(null);

  useEffect(() => {
    fetch("/api/session")
      .then(async (response) => {
        if (!response.ok) {
          setSession(null);
          return;
        }
        const data = (await response.json()) as SignedIn;
        setSession({ id: data.id, role: data.role });
      })
      .catch(() => setSession(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <div className="loading">Loading your operation…</div>;
  if (!session) return <PinGate onUnlock={(id, role) => setSession({ id, role })} />;

  return (
    <SplicerProvider person={session.id} role={session.role} onLock={() => setSession(null)}>
      <Board />
    </SplicerProvider>
  );
}

function Board() {
  const { tab } = useSplicer();
  return (
    <Shell>
      {tab === "overview" ? <OverviewView /> : null}
      {tab === "calendar" ? <CalendarView /> : null}
      {tab === "nodes" ? <NodesView /> : null}
      {tab === "routes" ? <RoutesView /> : null}
      {tab === "billing" ? <BillingView /> : null}
      {tab === "stats" ? <StatsView /> : null}
      {tab === "settings" ? <SettingsView /> : null}
      <Modals />
    </Shell>
  );
}
