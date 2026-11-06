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
    <div className="strand-gate">
      <div className="strand-gate-glow" aria-hidden="true" />
      <svg className="strand-fiber" viewBox="0 0 400 720" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="strand-copper" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#16325a" />
            <stop offset="0.55" stopColor="#c4622d" />
            <stop offset="1" stopColor="#8a3d18" />
          </linearGradient>
        </defs>
        <path
          className="strand-fiber-line"
          d="M-20 80 C 80 40, 120 180, 210 150 S 330 80, 430 140 C 380 260, 40 250, 30 380 S 360 470, 420 560 C 280 640, 80 600, -20 700"
          fill="none"
          stroke="url(#strand-copper)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          className="strand-fiber-glow"
          d="M-20 80 C 80 40, 120 180, 210 150 S 330 80, 430 140 C 380 260, 40 250, 30 380 S 360 470, 420 560 C 280 640, 80 600, -20 700"
          fill="none"
          stroke="#c4622d"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>

      <main className="strand-gate-main">
        <p className="strand-kicker">Optimum · Paige</p>
        <h1 className="strand-mark" aria-label="Strand">
          {"STRAND".split("").map((letter, index) => (
            <span key={letter} style={{ animationDelay: `${0.35 + index * 0.12}s` }}>
              {letter}
            </span>
          ))}
        </h1>
        <div className="strand-rule" aria-hidden="true" />

        <form className="strand-form" onSubmit={submit}>
          <label htmlFor="pin" className="strand-visually-hidden">
            Four-digit code
          </label>
          <div className="strand-pin-wrap">
            <div className="strand-slots" aria-hidden="true">
              {[0, 1, 2, 3].map((index) => (
                <span key={index} className={pin.length === index ? "hot" : pin.length > index ? "filled" : ""}>
                  {pin[index] ? "•" : ""}
                </span>
              ))}
            </div>
            <input
              id="pin"
              name="pin"
              className="strand-pin-input"
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
          </div>
          <p id="pin-error" className="strand-error" role="alert">
            {error}
          </p>
          <button className="strand-open" disabled={pending || pin.length !== 4}>
            {pending ? "Opening…" : "Open Strand"}
          </button>
        </form>
        <p className="strand-stay">Signed in for 7 days on this phone.</p>
      </main>
    </div>
  );
}
