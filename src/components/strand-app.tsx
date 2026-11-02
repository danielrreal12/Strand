"use client";

import { useEffect, useState } from "react";
import { FiberBg } from "@/components/fiber-bg";
import { PinGate } from "@/components/pin-gate";
import { AppShell } from "@/components/app-shell";
import { readSession } from "@/lib/auth";

export function StrandApp() {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(Boolean(readSession()));
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <FiberBg />
        <p className="font-heading text-sm tracking-[0.2em] text-muted-foreground">
          OPTIMUM
        </p>
      </div>
    );
  }

  return (
    <>
      <FiberBg />
      {unlocked ? (
        <AppShell onLock={() => setUnlocked(false)} />
      ) : (
        <PinGate onUnlock={() => setUnlocked(true)} />
      )}
    </>
  );
}
