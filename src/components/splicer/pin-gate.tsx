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
    setError("PIN incorrecto.");
    setPin("");
  }

  return (
    <div className="pin-screen">
      <main className="pin-card">
        <small>OPTIMUM · PAIGE</small>
        <h1>Bienvenido a Splicer</h1>
        <p>Ingresa tu PIN para abrir el calendario, producción y billing.</p>
        <form onSubmit={submit}>
          <label htmlFor="pin">PIN de acceso</label>
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
          <button className="primary">Entrar</button>
        </form>
        <footer>Este dispositivo recordará el acceso durante 30 días.</footer>
      </main>
    </div>
  );
}
