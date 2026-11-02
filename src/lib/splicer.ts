import seedNodes from "@/data/nodes.json";

export const PAY_PER_NODE = 350;
export const PIN = "5796";
export const SESSION_KEY = "splicer-session";
export const NODES_KEY = "splicer-nodes-v1";
export const ROUTES_KEY = "splicer-routes-v1";
export const THEME_KEY = "splicer-theme";
export const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type NodeStatus = "pending" | "progress" | "completed" | "excluded";
export type InvoiceStatus = "pending" | "sent" | "approved";
export type ReviewStatus = "" | "review_data" | "check_reassignment";
export type CalendarMode = "scheduled" | "start" | "due" | "completed" | "payment";
export type TabId = "calendar" | "nodes" | "routes" | "billing";
export type CrewName = "Daniel" | "Iván";

export type SplicerNode = {
  code: string;
  start: string;
  due: string;
  night: boolean;
  status: NodeStatus;
  gps: string;
  address: string;
  map: string;
  source: string;
  completed: string;
  scheduled: string;
  payDate: string;
  paidDate: string;
  invoice: string;
  job: string;
  invoiceStatus: InvoiceStatus;
  notes: string;
  reviewStatus: ReviewStatus | string;
  billingIncluded?: boolean;
};

export type BillingWeek = {
  start: string;
  end: string;
  payDate: string;
  label: string;
  exception: boolean;
  nodes: SplicerNode[];
  count: number;
  earned: number;
  received: number;
  receivable: number;
};

export type RoutePlan = {
  day: string;
  Daniel: string[];
  Iván: string[];
  extra: CrewName;
  nextExtra: CrewName;
  saved: boolean;
};

export const STATUS_LABEL: Record<NodeStatus, string> = {
  pending: "Pendiente",
  progress: "En proceso",
  completed: "Completado",
  excluded: "Reasignado",
};

export const REVIEW_LABEL: Record<string, string> = {
  review_data: "Revisar datos",
  check_reassignment: "Consultar reasignación",
};

export const PREPARED_ROUTE: RoutePlan = {
  day: "2026-11-03",
  Daniel: [],
  Iván: ["B619A"],
  extra: "Iván",
  nextExtra: "Daniel",
  saved: false,
};

const DAY = 86400000;

export function chicagoToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function money(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatShort(iso: string) {
  if (!iso) return "Sin fecha";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

export function formatLong(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatMonth(date: Date) {
  const label = date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function isoFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00Z`);
  return new Date(date.getTime() + days * DAY).toISOString().slice(0, 10);
}

export function billingPeriod(iso: string) {
  if (iso >= "2026-10-13" && iso <= "2026-10-16") {
    return {
      start: "2026-10-13",
      end: "2026-10-16",
      payDate: "2026-10-30",
      label: "Primer corte · Martes a viernes",
      exception: true,
    };
  }
  if (iso >= "2026-10-19" && iso <= "2026-10-22") {
    return {
      start: "2026-10-19",
      end: "2026-10-22",
      payDate: "2026-11-06",
      label: "Segundo corte · Lunes a jueves",
      exception: true,
    };
  }
  if (iso === "2026-10-17" || iso === "2026-10-18") {
    return {
      start: "2026-10-17",
      end: "2026-10-18",
      payDate: "",
      label: "Fuera de los cortes iniciales · Por confirmar",
      exception: true,
    };
  }
  const anchor = new Date(`${iso}T12:00:00Z`);
  const start = new Date(anchor.getTime() - ((anchor.getUTCDay() + 2) % 7) * DAY);
  return {
    start: start.toISOString().slice(0, 10),
    end: new Date(start.getTime() + 6 * DAY).toISOString().slice(0, 10),
    payDate: new Date(start.getTime() + 21 * DAY).toISOString().slice(0, 10),
    label: "Viernes a jueves",
    exception: false,
  };
}

export function billingWeeks(nodes: SplicerNode[], today: string): BillingWeek[] {
  const weeks = new Map<string, Omit<BillingWeek, "count" | "earned" | "received" | "receivable">>();
  const ensure = (iso: string) => {
    const period = billingPeriod(iso);
    if (!weeks.has(period.start)) weeks.set(period.start, { ...period, nodes: [] });
    return weeks.get(period.start)!;
  };
  ensure("2026-10-13");
  ensure("2026-10-19");
  ensure("2026-10-23");
  for (let cursor = new Date("2026-10-30T12:00:00Z"); cursor.toISOString().slice(0, 10) <= today; cursor = new Date(cursor.getTime() + 7 * DAY)) {
    ensure(cursor.toISOString().slice(0, 10));
  }
  for (const node of nodes) {
    if (node.status === "completed" && node.completed && node.billingIncluded !== false) {
      ensure(node.completed).nodes.push(node);
    }
  }
  return [...weeks.values()]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((week) => {
      const ordered = [...week.nodes].sort(
        (a, b) => a.completed.localeCompare(b.completed) || a.code.localeCompare(b.code),
      );
      const received = ordered.filter((node) => node.paidDate).length * PAY_PER_NODE;
      return {
        ...week,
        nodes: ordered,
        count: ordered.length,
        earned: ordered.length * PAY_PER_NODE,
        received,
        receivable: ordered.length * PAY_PER_NODE - received,
      };
    });
}

export function agendaAnchor(nodes: SplicerNode[], today: string) {
  const last = nodes
    .filter((node) => node.status === "completed" && node.completed)
    .map((node) => node.completed)
    .sort()
    .at(-1);
  return last && last >= today ? addDays(last, 1) : today;
}

export function agendaDate(node: SplicerNode, anchor: string) {
  if (node.status === "excluded") return "";
  if (node.status === "completed") return node.completed;
  return [anchor, node.start, node.scheduled].filter(Boolean).sort().at(-1) || anchor;
}

export function placedOn(node: SplicerNode, mode: CalendarMode, anchor: string) {
  if (mode === "start") return node.start;
  if (mode === "completed") return node.completed;
  if (mode === "payment") return node.payDate;
  if (mode === "due") return node.due;
  return agendaDate(node, anchor);
}

export function urgency(node: SplicerNode, day: string) {
  if (node.status === "completed" || node.status === "excluded" || !node.due) {
    return { kind: "", label: "" };
  }
  const due = new Date(`${node.due}T12:00:00Z`).getTime();
  const current = new Date(`${day}T12:00:00Z`).getTime();
  const days = Math.round((due - current) / DAY);
  if (days < 0) return { kind: "overdue", label: `Vencido hace ${-days} ${days === -1 ? "día" : "días"}` };
  if (days === 0) return { kind: "urgent", label: "Vence hoy" };
  if (days === 1) return { kind: "urgent", label: "Vence mañana" };
  if (days <= 2) return { kind: "urgent", label: `Vence en ${days} días` };
  return { kind: "", label: "" };
}

export function parseGps(gps: string) {
  const match = gps.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function googleSearch(gps: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gps)}`;
}

export function appleMaps(node: SplicerNode) {
  const point = parseGps(node.gps);
  if (!point) return "";
  return `https://maps.apple.com/?ll=${point.lat},${point.lng}&q=${encodeURIComponent(node.code)}`;
}

export function googleDirections(points: { lat: number; lng: number }[]) {
  if (!points.length) return "";
  const last = points[points.length - 1];
  const params = new URLSearchParams({
    api: "1",
    destination: `${last.lat},${last.lng}`,
    travelmode: "driving",
  });
  if (points.length === 1) {
    params.set("destination", `${last.lat},${last.lng}`);
    return `https://www.google.com/maps/dir/?${params}`;
  }
  const origin = points[0];
  const via = points.slice(1, -1);
  params.set("origin", `${origin.lat},${origin.lng}`);
  if (via.length) params.set("waypoints", via.map((point) => `${point.lat},${point.lng}`).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

export function directionLegs(points: { lat: number; lng: number }[]) {
  const legs: { start: number; end: number; url: string }[] = [];
  for (let index = 0; index < points.length; index += 4) {
    const slice = points.slice(Math.max(0, index - (index ? 1 : 0)), index + 4);
    const chunk = points.slice(index, index + 4);
    legs.push({
      start: index + 1,
      end: Math.min(index + 4, points.length),
      url: googleDirections(index ? [points[index - 1], ...chunk] : slice),
    });
  }
  return legs;
}

export function mondayOf(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

export function activeNodes(nodes: SplicerNode[]) {
  return nodes.filter((node) => node.status !== "excluded");
}

export function billable(node: SplicerNode) {
  return node.billingIncluded !== false;
}

export function seedNodesList(): SplicerNode[] {
  return seedNodes as SplicerNode[];
}

export function readStoredNodes(): SplicerNode[] {
  const seed = seedNodesList();
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(NODES_KEY);
    if (!raw) return seed;
    const saved = JSON.parse(raw) as SplicerNode[];
    const byCode = new Map(saved.map((node) => [node.code, node]));
    return seed.map((node) => ({ ...node, ...byCode.get(node.code) }));
  } catch {
    return seed;
  }
}

export function writeStoredNodes(nodes: SplicerNode[]) {
  localStorage.setItem(NODES_KEY, JSON.stringify(nodes));
}

export function readSession() {
  if (typeof window === "undefined") return false;
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as { ok?: boolean; exp?: number } | null;
    return Boolean(raw?.ok && raw.exp && raw.exp > Date.now());
  } catch {
    return false;
  }
}

export function writeSession() {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, exp: Date.now() + SESSION_MS }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function csvFor(nodes: SplicerNode[]) {
  const header = [
    "Nodo",
    "Estado",
    "Inicio autorizado",
    "Fecha limite",
    "Programado",
    "Completado",
    "Pago previsto",
    "Pago recibido",
    "Generado USD",
    "Factura",
    "Wise Job",
    "GPS",
    "Inicio corte billing",
    "Fin corte billing",
    "Mapa PDF",
    "Aviso seguimiento",
    "Incluido en billing",
  ];
  const rows = nodes.map((node) => {
    const period = node.status === "completed" && billable(node) && node.completed ? billingPeriod(node.completed) : null;
    return [
      node.code,
      STATUS_LABEL[node.status],
      node.start,
      node.due,
      node.scheduled,
      node.completed,
      node.payDate,
      node.paidDate,
      node.status === "completed" && billable(node) ? "350" : "0",
      node.invoice,
      node.job,
      node.gps,
      period?.start ?? "",
      period?.end ?? "",
      node.map || "Mapa por recibir",
      REVIEW_LABEL[node.reviewStatus] || "",
      node.billingIncluded === false ? "No" : "Sí",
    ];
  });
  return `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}`;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function downloadCsv(nodes: SplicerNode[], today: string) {
  const blob = new Blob([csvFor(nodes)], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `optimum-billing-${today}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function calendarHelp(mode: CalendarMode) {
  if (mode === "scheduled") {
    return "Agenda automática: los pendientes pasan al siguiente día tras tu último reporte, respetando el inicio disponible y las fechas futuras que programes.";
  }
  if (mode === "start") {
    return "Fecha original en que cada nodo puede comenzar. Sin fecha de inicio: disponible en la agenda automática.";
  }
  if (mode === "due") {
    return "Fechas límite originales; los vencidos permanecen pendientes hasta que confirmes su producción.";
  }
  if (mode === "completed") return "Nodos agrupados por su fecha real de completado.";
  return "Pagos esperados; sólo se marcan recibidos cuando lo confirmas.";
}

export function monthGrid(month: Date) {
  const lead = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), 1 - lead + index));
}

export function orderByProximity(nodes: SplicerNode[], origin?: { lat: number; lng: number } | null) {
  const pool = nodes.filter((node) => parseGps(node.gps));
  if (!pool.length) return [];
  const ordered: SplicerNode[] = [];
  let cursor = origin ?? parseGps(pool[0].gps)!;
  if (!origin) {
    ordered.push(pool.shift()!);
    const last = parseGps(ordered[0].gps);
    if (last) cursor = last;
  }
  while (pool.length) {
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < pool.length; index += 1) {
      const point = parseGps(pool[index].gps)!;
      const distance = (point.lat - cursor.lat) ** 2 + (point.lng - cursor.lng) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
    const [next] = pool.splice(best, 1);
    ordered.push(next);
    cursor = parseGps(next.gps)!;
  }
  return ordered;
}

export function readRoutePlans(): Record<string, RoutePlan> {
  if (typeof window === "undefined") return { [PREPARED_ROUTE.day]: PREPARED_ROUTE };
  try {
    const raw = JSON.parse(localStorage.getItem(ROUTES_KEY) || "null") as Record<string, RoutePlan> | null;
    return { [PREPARED_ROUTE.day]: PREPARED_ROUTE, ...raw };
  } catch {
    return { [PREPARED_ROUTE.day]: PREPARED_ROUTE };
  }
}

export function writeRoutePlans(plans: Record<string, RoutePlan>) {
  localStorage.setItem(ROUTES_KEY, JSON.stringify(plans));
}
