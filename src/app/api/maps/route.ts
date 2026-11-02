import { connection } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAPS_DIR = path.join(process.cwd(), "public", "maps");

function safeName(name: string) {
  const base = path.basename(name);
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._()-]*\.pdf$/i.test(base)) return "";
  return base;
}

export async function POST(request: Request) {
  await connection();
  const form = await request.formData();
  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  if (!files.length || files.length > 20) {
    return Response.json({ error: "Choose between 1 and 20 PDFs." }, { status: 400 });
  }
  const saved: string[] = [];
  await mkdir(MAPS_DIR, { recursive: true });
  for (const file of files) {
    if (file.size > 8 * 1024 * 1024) return Response.json({ error: `${file.name} is over 8 MB.` }, { status: 400 });
    const name = safeName(file.name);
    if (!name) return Response.json({ error: `Name not allowed: ${file.name}` }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.subarray(0, 4).toString() !== "%PDF") return Response.json({ error: `${file.name} is not a PDF.` }, { status: 400 });
    await writeFile(path.join(MAPS_DIR, name), bytes);
    saved.push(name);
  }
  return Response.json({ saved });
}
