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
      if (!response.ok) throw new Error(payload.error || "Couldn’t save the maps");
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
      setStatus(`Saved ${saved.size} maps. Coordinates are stored on this device.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn’t save the maps");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="map-import">
      <a className="text-button" href="/">
        ← Back to the board
      </a>
      <div className="eyebrow">MAPS</div>
      <h1>Add map PDFs</h1>
      <p>Choose the map files from the email and add coordinates for each node. Each PDF stays tied to that location on the board.</p>
      <form onSubmit={submit} className="panel" style={{ padding: 22, display: "grid", gap: 16 }}>
        <label>
          Map PDF files (up to 20, 8 MB each)
          <input name="files" type="file" accept="application/pdf,.pdf" multiple required />
        </label>
        <label>
          Coordinates by node (JSON)
          <textarea value={coords} onChange={(event) => setCoords(event.target.value)} />
          <small className="sub">Use the node code and the coordinates printed in red on each map.</small>
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {status ? <p className="production-rule">{status}</p> : null}
        <button className="primary" disabled={pending} type="submit">
          {pending ? "Saving…" : "Save maps and locations"}
        </button>
      </form>
    </main>
  );
}
