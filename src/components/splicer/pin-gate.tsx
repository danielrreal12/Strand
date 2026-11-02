"use client";

import { useState } from "react";
import { crewByPin, writeSession, type CrewName } from "@/lib/splicer";

export function PinGate({ onUnlock }: { onUnlock: (person: CrewName) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const member = crewByPin(pin);
    if (member) {
      writeSession(member.id);
      onUnlock(member.id);
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
        <p>Enter your access code to open the calendar, your route, and your billing.</p>
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
          <button className="primary">Enter</button>
        </form>
        <footer>This device will remember access for 30 days.</footer>
      </main>
    </div>
  );
}
