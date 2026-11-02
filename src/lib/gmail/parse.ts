import { PAY_PER_NODE, type OptimumNode } from "../nodes";

export type MailMessage = {
  id: string;
  from: string;
  subject: string;
  date: string;
  body: string;
};

const DATE_RE =
  /\b(20\d{2}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i;

const START_RE = /\b(can start|start date|start window|earliest|available(?:\s+on)?|begin)\b/i;
const DUE_RE = /\b(due date|due|deadline|complete by|finish by|must be (?:done|in))\b/i;
const ADDRESS_RE = /\baddress\s*[:\-]\s*(.+)$/i;
const NODE_RE = /\bnode\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9-]{0,20})\b/i
const MAP_RE =
  /https?:\/\/(?:(?:www\.)?google\.[a-z.]+\/maps\S*|maps\.app\.goo\.gl\/\S*|maps\.apple\.com\/\S*)/i;

function findDate(text: string): string | null {
  return text.match(DATE_RE)?.[1] ?? null;
}

function fieldDate(body: string, label: RegExp): string | null {
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (!label.test(lines[i])) continue;
    const onLine = findDate(lines[i]);
    if (onLine) return onLine;
    const next = findDate(lines[i + 1] ?? "");
    if (next) return next;
  }
  return null;
}

function coordinates(body: string): { latitude: number; longitude: number } | null {
  const patterns = [
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&](?:q|ll|query)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /(-?\d{1,2}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/,
  ];
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (!match) continue;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      return { latitude, longitude };
    }
  }
  return null;
}

function addressFrom(body: string, mapUrl: string | undefined): string {
  const line = body
    .split(/\r?\n/)
    .map((item) => item.match(ADDRESS_RE)?.[1]?.trim())
    .find(Boolean);
  if (line) return line;
  if (!mapUrl) return "—";
  const place = mapUrl.match(/\/maps\/place\/([^/@?]+)/i)?.[1];
  if (!place) return "—";
  return decodeURIComponent(place).replace(/\+/g, " ");
}

function accessNotes(body: string): string | undefined {
  const notes = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\b(gate|code|contact|call|hours|lockbox|permit|meet)\b/i.test(line))
    .slice(0, 4);
  if (notes.length === 0) return undefined;
  return notes.join(" · ").slice(0, 400);
}

export function mailToNode(mail: MailMessage): OptimumNode {
  const nodeMatch = mail.body.match(NODE_RE) ?? mail.subject.match(NODE_RE);
  const mapUrl = mail.body.match(MAP_RE)?.[0] ?? mail.subject.match(MAP_RE)?.[0];
  const coords = coordinates(`${mail.body}\n${mapUrl ?? ""}`);
  return {
    id: mail.id,
    node: nodeMatch?.[1] ?? (mail.subject.trim() || "Untitled node"),
    address: addressFrom(mail.body, mapUrl),
    canStart: fieldDate(mail.body, START_RE) ?? "—",
    due: fieldDate(mail.body, DUE_RE) ?? "—",
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    mapUrl,
    pay: PAY_PER_NODE,
    status: "not_started",
    access: accessNotes(mail.body),
    source: `${mail.from} · ${mail.date} · ${mail.subject}`,
  };
}
