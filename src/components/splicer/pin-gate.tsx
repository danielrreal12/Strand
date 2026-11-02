"use client";

import { useState } from "react";
import type { CrewName, CrewRole } from "@/lib/splicer";

export function PinGate({ onUnlock }: { onUnlock: (person: CrewName, role: CrewRole) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = (await response.json().catch(() => ({}))) as { id?: CrewName; role?: CrewRole; error?: string };
      if (!response.ok || !data.id || !data.role) {
        setError(data.error || "Wrong access code.");
        setPin("");
        return;
      }
      onUnlock(data.id, data.role);
    } catch {
      setError("Couldn’t reach the sign-in. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pin-screen">
      <main className="pin-card">
        <small>OPTIMUM · PAIGE</small>
        <h1>Welcome to Splicer</h1>
        <p>Enter your access code. Today’s route opens first.</p>
        <form onSubmit={submit}>
          <label htmlFor="pin">Access code</label>
          <input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{4}"
            minLength={4}
            maxLength={4}
            autoComplete="current-password"
            required
            autoFocus
            aria-describedby="pin-error"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
          />
          <p id="pin-error" className="error" role="alert">
            {error}
          </p>
          <button className="primary" disabled={pending}>
            {pending ? "Checking…" : "Enter"}
          </button>
        </form>
        <footer>This phone stays signed in for 7 days. Five wrong codes lock the sign-in for 15 minutes.</footer>
      </main>
    </div>
  );
}
