import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { mergeNodeEdit, normalizePlan, type CrewName, type CrewRole, type RoutePlan, type SplicerNode } from "./splicer";

const STORE_FILE = path.join(process.cwd(), ".data", "production-store.json");

export type ProductionStore = {
  updatedAt: string;
  nodes: SplicerNode[];
  routes: Record<string, RoutePlan>;
};

function isNode(value: unknown): value is SplicerNode {
  if (!value || typeof value !== "object") return false;
  const node = value as SplicerNode;
  return typeof node.code === "string" && /^[A-Za-z0-9]{2,16}$/.test(node.code) && typeof node.status === "string";
}

export function sanitizeStore(input: unknown): ProductionStore | null {
  if (!input || typeof input !== "object") return null;
  const record = input as { updatedAt?: unknown; nodes?: unknown; routes?: unknown };
  if (!Array.isArray(record.nodes) || record.nodes.length > 500) return null;
  const nodes = record.nodes.filter(isNode).map((node) => ({
    ...node,
    notes: String(node.notes || "").slice(0, 2000),
    address: String(node.address || "").slice(0, 300),
    gps: String(node.gps || "").slice(0, 80),
  }));
  if (!nodes.length) return null;
  const routes: Record<string, RoutePlan> = {};
  if (record.routes && typeof record.routes === "object") {
    for (const [day, plan] of Object.entries(record.routes as Record<string, Partial<RoutePlan>>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      routes[day] = normalizePlan({ ...plan, day });
    }
  }
  const updatedAt = typeof record.updatedAt === "string" && record.updatedAt ? record.updatedAt : new Date().toISOString();
  return { updatedAt, nodes, routes };
}

export async function readStore(): Promise<ProductionStore | null> {
  try {
    return sanitizeStore(JSON.parse(await readFile(STORE_FILE, "utf8")));
  } catch {
    return null;
  }
}

export async function writeStore(store: ProductionStore) {
  const clean = sanitizeStore({ ...store, updatedAt: new Date().toISOString() });
  if (!clean) throw new Error("The records aren’t valid.");
  await mkdir(path.dirname(STORE_FILE), { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(clean));
  return clean;
}

export function applyRecordWrite(current: ProductionStore | null, incoming: ProductionStore, role: CrewRole, actor: CrewName): ProductionStore {
  if (!current || role === "admin") return { ...incoming, updatedAt: new Date().toISOString() };
  const incomingByCode = new Map(incoming.nodes.map((node) => [node.code, node]));
  const nodes = current.nodes.map((node) => {
    const next = incomingByCode.get(node.code);
    return next ? mergeNodeEdit(node, next, "splicer", actor) : node;
  });
  return { updatedAt: new Date().toISOString(), nodes, routes: current.routes };
}
