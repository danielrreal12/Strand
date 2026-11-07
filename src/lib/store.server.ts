import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { mergeNodeEdit, normalizePlan, type CrewName, type CrewRole, type RoutePlan, type SplicerNode, type CyclePayments } from "./splicer";
import { dataDir, storeFile } from "./paths.server";

export type ProductionStore = {
  updatedAt: string;
  nodes: SplicerNode[];
  routes: Record<string, RoutePlan>;
  cyclePayments?: CyclePayments;
};

function isNode(value: unknown): value is SplicerNode {
  if (!value || typeof value !== "object") return false;
  const node = value as SplicerNode;
  return typeof node.code === "string" && /^[A-Za-z0-9]{2,16}$/.test(node.code) && typeof node.status === "string";
}

export function sanitizeStore(input: unknown): ProductionStore | null {
  if (!input || typeof input !== "object") return null;
  const record = input as { updatedAt?: unknown; nodes?: unknown; routes?: unknown; cyclePayments?: unknown };
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
  const cyclePayments: CyclePayments = {};
  if (record.cyclePayments && typeof record.cyclePayments === "object") {
    for (const [key, value] of Object.entries(record.cyclePayments)) {
      if (!/^(Daniel|Iván):\d{4}-\d{2}-\d{2}$/.test(key) || !value || typeof value !== "object") continue;
      const payment = value as { amount?: unknown; paidDate?: unknown; notes?: unknown };
      if (typeof payment.amount !== "number" || !Number.isFinite(payment.amount) || payment.amount < 0 || payment.amount > 100_000_000) continue;
      cyclePayments[key] = { amount: Math.round(payment.amount * 100) / 100, paidDate: typeof payment.paidDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payment.paidDate) ? payment.paidDate : "", notes: String(payment.notes || "").slice(0, 500) };
    }
  }
  return { updatedAt, nodes, routes, cyclePayments };
}

export async function readStore(): Promise<ProductionStore | null> {
  try {
    return sanitizeStore(JSON.parse(await readFile(storeFile(), "utf8")));
  } catch {
    return null;
  }
}

export async function writeStore(store: ProductionStore) {
  const clean = sanitizeStore({ ...store, updatedAt: new Date(Math.max(Date.now(), Date.parse(store.updatedAt) || 0) + 1).toISOString() });
  if (!clean) throw new Error("The records aren’t valid.");
  await mkdir(dataDir(), { recursive: true });
  const temporary = `${storeFile()}.tmp`;
  await writeFile(temporary, JSON.stringify(clean));
  await rename(temporary, storeFile());
  return clean;
}

export function applyRecordWrite(current: ProductionStore | null, incoming: ProductionStore, role: CrewRole, actor: CrewName): ProductionStore {
  if (!current || role === "admin") return { ...incoming, cyclePayments: current?.cyclePayments ?? incoming.cyclePayments ?? {}, updatedAt: new Date().toISOString() };
  const incomingByCode = new Map(incoming.nodes.map((node) => [node.code, node]));
  const nodes = current.nodes.map((node) => {
    const next = incomingByCode.get(node.code);
    return next ? mergeNodeEdit(node, next, "splicer", actor) : node;
  });
  return { updatedAt: new Date().toISOString(), nodes, routes: current.routes, cyclePayments: current.cyclePayments ?? {} };
}

const storeRuntime = globalThis as typeof globalThis & { strandStoreQueue?: Promise<unknown> };
export function withStoreLock<T>(action: () => Promise<T>): Promise<T> {
  const next = (storeRuntime.strandStoreQueue ?? Promise.resolve()).then(action, action);
  storeRuntime.strandStoreQueue = next.catch(() => undefined);
  return next;
}
