"use client";

import { useEffect, useState } from "react";
import { Delete, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_PIN } from "@/lib/data";
import { verifyPin, writeSession } from "@/lib/auth";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  function pushDigit(d: string) {
    if (pin.length >= 4) return;
    setError("");
    setPin((p) => p + d);
  }

  function backspace() {
    setError("");
    setPin((p) => p.slice(0, -1));
  }

  function submit(value: string) {
    if (value.length !== 4) return;
    if (verifyPin(value)) {
      writeSession();
      onUnlock();
      return;
    }
    setShaking(true);
    setError("That PIN doesn’t match. Try again.");
    setPin("");
    window.setTimeout(() => setShaking(false), 400);
  }

  useEffect(() => {
    if (pin.length === 4) {
      const t = window.setTimeout(() => submit(pin), 120);
      return () => window.clearTimeout(t);
    }
  }, [pin]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") pushDigit(e.key);
      if (e.key === "Backspace") backspace();
      if (e.key === "Enter") submit(pin);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pin]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="rise-in w-full max-w-[400px]">
        <div className="mb-6 text-center sm:mb-10">
          <p className="font-heading text-[0.7rem] font-semibold tracking-[0.28em] text-primary">
            STRAND · FIELD OPS
          </p>
          <h1 className="font-heading mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Strand
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-pretty text-muted-foreground">
            Unlock the board for today’s splices, crew moves, and billing.
          </p>
        </div>

        <div
          className={`rounded-2xl border border-border/80 bg-card/80 p-6 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.8)] backdrop-blur-md sm:p-8 ${
            shaking ? "animate-[pulse_0.35s_ease]" : ""
          }`}
        >
          <div className="mb-6 flex items-center gap-2 text-muted-foreground">
            <LockKeyhole className="size-4 text-primary" />
            <span className="text-sm">Access PIN</span>
          </div>

          <div
            className="mb-6 flex justify-center gap-3"
            aria-label={`PIN entered ${pin.length} of 4 digits`}
          >
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`flex size-3.5 items-center justify-center rounded-full border transition-all ${
                  i < pin.length
                    ? "pin-pop border-primary bg-primary shadow-[0_0_12px_rgba(94,228,208,0.55)]"
                    : "border-border bg-muted/40"
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {KEYS.map((key, idx) => {
              if (key === "") return <span key={`empty-${idx}`} />;
              if (key === "del") {
                return (
                  <Button
                    key="del"
                    type="button"
                    variant="secondary"
                    className="h-14 text-base"
                    onClick={backspace}
                    aria-label="Delete"
                  >
                    <Delete className="size-5" />
                  </Button>
                );
              }
              return (
                <Button
                  key={key}
                  type="button"
                  variant="secondary"
                  className="h-14 font-heading text-xl font-semibold tracking-wide"
                  onClick={() => pushDigit(key)}
                >
                  {key}
                </Button>
              );
            })}
          </div>

          {error ? (
            <p className="mt-4 text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Demo PIN <span className="font-mono text-foreground/90">{DEMO_PIN}</span> ·
              remembered 30 days
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
