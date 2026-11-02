"use client";

import { useEffect, useState } from "react";
import { readSession } from "@/lib/splicer";
import { BillingView } from "./billing";
import { CalendarView } from "./calendar";
import { Modals } from "./modals";
import { NodesView } from "./nodes";
import { PinGate } from "./pin-gate";
import { SplicerProvider, useSplicer } from "./provider";
import { RoutesView } from "./routes";
import { Shell } from "./shell";

export function SplicerApp() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(readSession());
    setReady(true);
  }, []);

  if (!ready) return <div className="loading">Cargando tu operación…</div>;
  if (!authed) return <PinGate onUnlock={() => setAuthed(true)} />;

  return (
    <SplicerProvider onLock={() => setAuthed(false)}>
      <Board />
    </SplicerProvider>
  );
}

function Board() {
  const { tab } = useSplicer();
  return (
    <Shell>
      {tab === "calendar" ? <CalendarView /> : null}
      {tab === "nodes" ? <NodesView /> : null}
      {tab === "routes" ? <RoutesView /> : null}
      {tab === "billing" ? <BillingView /> : null}
      <Modals />
    </Shell>
  );
}
