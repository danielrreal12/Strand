import { connection } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { seedNodesList } from "@/lib/splicer";

const MAPS_DIR = path.join(process.cwd(), "public", "maps");

function safeName(name: string) {
  const base = path.basename(name);
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._()-]*\.pdf$/i.test(base)) return "";
  return base;
}

async function originCookie() {
  try {
    const raw = await readFile("/tmp/splicer.ck", "utf8");
    const pairs: string[] = [];
    for (const line of raw.split("\n")) {
      if (!line || line.startsWith("# ")) continue;
      const parts = line.split("\t");
      if (parts.length < 7) continue;
      if (parts[0].startsWith("#") && !parts[0].startsWith("#HttpOnly_")) continue;
      pairs.push(`${parts[5]}=${parts[6]}`);
    }
    return pairs.join("; ");
  } catch {
    return "";
  }
}

function pdfBody(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function pdfResponse(bytes: Uint8Array) {
  return new Response(pdfBody(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=86400",
    },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  await connection();
  const { file } = await context.params;
  const name = safeName(decodeURIComponent(file));
  const known = new Set(seedNodesList().map((node) => node.map).filter(Boolean));
  if (!name || !known.has(name)) return new Response("Mapa no disponible", { status: 404 });

  const local = path.join(MAPS_DIR, name);
  try {
    const cached = await readFile(local);
    if (cached.subarray(0, 4).toString() === "%PDF") return pdfResponse(cached);
  } catch {
    // Not cached yet.
  }

  const cookie = await originCookie();
  if (!cookie) return new Response("Mapa no disponible", { status: 404 });
  const response = await fetch(`https://optimum-splicer-control.armzglz.chatgpt.site/maps/${encodeURIComponent(name)}`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  if (!response.ok) return new Response("Mapa no disponible", { status: 404 });
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== "%PDF") return new Response("Mapa no disponible", { status: 404 });
  await mkdir(MAPS_DIR, { recursive: true });
  await writeFile(local, bytes);
  return pdfResponse(bytes);
}
