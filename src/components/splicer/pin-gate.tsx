"use client";

import { useState } from "react";
import { PIN, writeSession } from "@/lib/splicer";

export function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pin === PIN) {
      writeSession();
      onUnlock();
      return;
    }
    setError("Wrong PIN.");
    setPin("");
  }

  return (
    <div className="pin-screen">
      <main className="pin-card">
        <small>OPTIMUM · PAIGE</small>
        <h1>Welcome to Splicer</h1>
        <p>Enter your PIN to open the calendar, production, and billing.</p>
        <form onSubmit={submit}>
          <label htmlFor="pin">Access PIN</label>
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
          <button className="primary">Enter</button>
        </form>
        <footer>This device will remember access for 30 days.</footer>
      </main>
    </div>
  );
}
