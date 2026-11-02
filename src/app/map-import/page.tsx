"use client";

import { useState } from "react";
import { NODES_KEY, readStoredNodes, writeStoredNodes } from "@/lib/splicer";

export default function MapImportPage() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [coords, setCoords] = useState('{\n  "B619A": "30.728096, -96.471927"\n}');
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/maps", { method: "POST", body: form });
      const payload = (await response.json()) as { error?: string; saved?: string[] };
      if (!response.ok) throw new Error(payload.error || "No se pudieron guardar los mapas");
      const saved = new Set(payload.saved ?? []);
      let parsed: Record<string, string> = {};
      const raw = coords.trim();
      if (raw) {
        const json = JSON.parse(raw) as Record<string, string> | { code: string; gps: string }[];
        if (Array.isArray(json)) {
          parsed = Object.fromEntries(json.map((item) => [item.code.toUpperCase(), item.gps]));
        } else {
          parsed = Object.fromEntries(Object.entries(json).map(([code, gps]) => [code.toUpperCase(), gps]));
        }
      }
      const nodes = readStoredNodes().map((node) => {
        const file = [...saved].find((name) => name.toUpperCase().startsWith(node.code));
        const gps = parsed[node.code];
        return {
          ...node,
          ...(file ? { map: file } : {}),
          ...(gps ? { gps } : {}),
        };
      });
      writeStoredNodes(nodes);
      localStorage.setItem(NODES_KEY, JSON.stringify(nodes));
      setStatus(`Guardados ${saved.size} mapas. Las coordenadas quedaron en este dispositivo.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron guardar los mapas");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="map-import">
      <a className="text-button" href="/">
        ← Volver al dashboard
      </a>
      <div className="eyebrow">MAPAS</div>
      <h1>Agregar mapas PDF</h1>
      <p>Selecciona los mapas recibidos por correo y agrega sus coordenadas por nodo. Cada PDF queda vinculado a su ubicación en el dashboard.</p>
      <form onSubmit={submit} className="panel" style={{ padding: 22, display: "grid", gap: 16 }}>
        <label>
          Archivos PDF de mapa (hasta 20, máximo 8 MB cada uno)
          <input name="files" type="file" accept="application/pdf,.pdf" multiple required />
        </label>
        <label>
          Coordenadas por nodo (JSON)
          <textarea value={coords} onChange={(event) => setCoords(event.target.value)} />
          <small className="sub">Usa el código de nodo y las coordenadas que aparecen en rojo en cada mapa.</small>
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {status ? <p className="production-rule">{status}</p> : null}
        <button className="primary" disabled={pending} type="submit">
          {pending ? "Guardando…" : "Guardar mapas y ubicaciones"}
        </button>
      </form>
    </main>
  );
}
