import seedNodes from "@/data/nodes.json";

export const PAY_PER_NODE = 350;
export const CHRIS_RATE = 300;
export const NODES_KEY = "splicer-nodes-v3";
export const STOPS_PER_DAY = 6;
export const SESSION_KEY = "splicer-session";
export const ROUTES_KEY = "splicer-routes-v1";
export const THEME_KEY = "splicer-theme";
export const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type NodeStatus = "pending" | "progress" | "completed" | "excluded";
export type InvoiceStatus = "pending" | "sent" | "approved";
export type ReviewStatus = "" | "review_data" | "check_reassignment";
export type CalendarMode = "scheduled" | "start" | "due" | "completed" | "payment";
export type TabId = "today" | "calendar" | "nodes" | "routes" | "billing";
export type CrewName = "Daniel" | "Iván" | "Chris";
export type CrewRole = "admin" | "splicer";

export const CREW: CrewName[] = ["Daniel", "Iván", "Chris"];

export const CREW_MEMBERS: { id: CrewName; name: string; initials: string; role: string }[] = [
  { id: "Daniel", name: "Daniel Villarreal", initials: "DV", role: "Administrator · Private" },
  { id: "Iván", name: "Iván", initials: "IV", role: "Splicer · Private" },
  { id: "Chris", name: "Chris", initials: "CH", role: "Splicer · Private" },
];

export function crewById(id: CrewName) {
  return CREW_MEMBERS.find((member) => member.id === id) ?? CREW_MEMBERS[0];
}

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
  completedBy?: CrewName | "";
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
  Chris: string[];
  saved: boolean;
};

export const STATUS_LABEL: Record<NodeStatus, string> = {
  pending: "Pending",
  progress: "In progress",
  completed: "Completed",
  excluded: "Reassigned",
};

export const REVIEW_LABEL: Record<string, string> = {
  review_data: "Review data",
  check_reassignment: "Check reassignment",
};

export const ROUTE_FOCUS_DAY = "2026-11-03";

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
  if (!iso) return "No date";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

export function formatLong(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatMonth(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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
      label: "First cut · Tuesday to Friday",
      exception: true,
    };
  }
  if (iso >= "2026-10-19" && iso <= "2026-10-22") {
    return {
      start: "2026-10-19",
      end: "2026-10-22",
      payDate: "2026-11-06",
      label: "Second cut · Monday to Thursday",
      exception: true,
    };
  }
  if (iso === "2026-10-17" || iso === "2026-10-18") {
    return {
      start: "2026-10-17",
      end: "2026-10-18",
      payDate: "",
      label: "Outside the opening cuts · To confirm",
      exception: true,
    };
  }
  const anchor = new Date(`${iso}T12:00:00Z`);
  const start = new Date(anchor.getTime() - ((anchor.getUTCDay() + 2) % 7) * DAY);
  return {
    start: start.toISOString().slice(0, 10),
    end: new Date(start.getTime() + 6 * DAY).toISOString().slice(0, 10),
    payDate: new Date(start.getTime() + 21 * DAY).toISOString().slice(0, 10),
    label: "Friday to Thursday",
    exception: false,
  };
}

export function billingWeeks(nodes: SplicerNode[], today: string, viewer?: CrewName): BillingWeek[] {
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
    if (node.status !== "completed" || !node.completed) continue;
    if (viewer) {
      if (shareAmount(node, viewer) > 0) ensure(node.completed).nodes.push(node);
      continue;
    }
    if (node.billingIncluded !== false) ensure(node.completed).nodes.push(node);
  }
  return [...weeks.values()]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((week) => {
      const ordered = [...week.nodes].sort(
        (a, b) => a.completed.localeCompare(b.completed) || a.code.localeCompare(b.code),
      );
      const earned = viewer ? ordered.reduce((sum, node) => sum + shareAmount(node, viewer), 0) : ordered.length * PAY_PER_NODE;
      const received = viewer
        ? ordered.filter((node) => node.paidDate).reduce((sum, node) => sum + shareAmount(node, viewer), 0)
        : ordered.filter((node) => node.paidDate).length * PAY_PER_NODE;
      return {
        ...week,
        nodes: ordered,
        count: ordered.length,
        earned,
        received,
        receivable: earned - received,
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
  if (days < 0) return { kind: "overdue", label: `Overdue by ${-days} ${days === -1 ? "day" : "days"}` };
  if (days === 0) return { kind: "urgent", label: "Due today" };
  if (days === 1) return { kind: "urgent", label: "Due tomorrow" };
  if (days <= 2) return { kind: "urgent", label: `Due in ${days} days` };
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

export function weekBounds(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 2) % 7));
  const start = isoFromDate(date);
  return { start, end: addDays(start, 6) };
}

export function payrollWeek(iso: string) {
  const { start: payDate } = weekBounds(iso);
  return { start: addDays(payDate, -21), end: addDays(payDate, -15), payDate };
}

export function expectedPayDate(node: SplicerNode) {
  if (node.status !== "completed") return "";
  return node.payDate || (node.completed ? billingPeriod(node.completed).payDate : "");
}

export function expectedPayNodes(nodes: SplicerNode[], today: string, person: CrewName) {
  const week = weekBounds(today);
  return payableNodes(nodes, person).filter((node) => {
    const date = expectedPayDate(node);
    return !node.paidDate && date >= week.start && date <= week.end;
  });
}

export function completedBetween(nodes: SplicerNode[], start: string, end: string) {
  return activeNodes(nodes).filter((node) => node.status === "completed" && node.completed >= start && node.completed <= end);
}

export function driveTo(node: SplicerNode) {
  const point = parseGps(node.gps);
  if (!point) return "";
  return `https://maps.apple.com/?daddr=${point.lat},${point.lng}&dirflg=d`;
}

export function googleDriveTo(node: SplicerNode) {
  const point = parseGps(node.gps);
  if (!point) return "";
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=driving`;
}

const PAYMENT_KEYS = ["payDate", "paidDate", "invoice", "invoiceStatus", "billingIncluded"] as const;

export function mergeNodeEdit(previous: SplicerNode, incoming: SplicerNode, role: CrewRole, actor: CrewName): SplicerNode {
  if (role === "admin") return { ...previous, ...incoming, code: previous.code };
  if (previous.status === "completed" && previous.completedBy && previous.completedBy !== actor) return previous;
  const next: SplicerNode = {
    ...previous,
    status: incoming.status,
    scheduled: incoming.scheduled,
    notes: incoming.notes,
    reviewStatus: incoming.reviewStatus,
    completed: incoming.status === "completed" ? incoming.completed : "",
    completedBy: incoming.status === "completed" ? actor : "",
  };
  for (const key of PAYMENT_KEYS) next[key] = previous[key] as never;
  return next;
}

export function presentNodes(nodes: SplicerNode[], role: CrewRole, person: CrewName) {
  if (role === "admin") return nodes;
  return nodes.map((node) => {
    if (!node.completedBy || node.completedBy === person) return node;
    return { ...node, payDate: "", paidDate: "", invoice: "", invoiceStatus: "pending" as const };
  });
}

export function activeNodes(nodes: SplicerNode[]) {
  return nodes.filter((node) => node.status !== "excluded");
}

export function billable(node: SplicerNode) {
  return node.billingIncluded !== false;
}

export function mineNodes(nodes: SplicerNode[], person: CrewName) {
  return nodes.filter((node) => node.completedBy === person);
}

export function shareAmount(node: SplicerNode, person: CrewName) {
  if (node.status !== "completed") return 0;
  if (person === "Chris") return node.completedBy === "Chris" ? CHRIS_RATE : 0;
  if (node.completedBy === "Chris" || node.billingIncluded === false) return 0;
  return PAY_PER_NODE / 2;
}

export function payableNodes(nodes: SplicerNode[], person: CrewName) {
  return nodes.filter((node) => shareAmount(node, person) > 0);
}

export function personalTotal(nodes: SplicerNode[], person: CrewName, paid?: boolean) {
  return nodes.reduce((sum, node) => {
    if (paid === true && !node.paidDate) return sum;
    if (paid === false && node.paidDate) return sum;
    return sum + shareAmount(node, person);
  }, 0);
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

export function readSession(): CrewName | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) || "null") as { person?: CrewName; exp?: number } | null;
    if (!raw?.person || !raw.exp || raw.exp <= Date.now()) return null;
    return CREW.includes(raw.person) ? raw.person : null;
  } catch {
    return null;
  }
}

export function writeSession(person: CrewName) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ok: true, person, exp: Date.now() + SESSION_MS }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function csvFor(nodes: SplicerNode[], viewer?: CrewName) {
  const header = [
    "Node",
    "Status",
    "Authorized start",
    "Due date",
    "Scheduled",
    "Completed",
    "Expected pay",
    "Payment received",
    "Generated USD",
    "Invoice",
    "Wise Job",
    "GPS",
    "Billing cut start",
    "Billing cut end",
    "Map PDF",
    "Follow-up",
    "Included in billing",
    "Completed by",
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
      viewer ? String(shareAmount(node, viewer)) : node.status === "completed" && billable(node) ? "350" : "0",
      node.invoice,
      node.job,
      node.gps,
      period?.start ?? "",
      period?.end ?? "",
      node.map || "Map still coming",
      REVIEW_LABEL[node.reviewStatus] || "",
      node.billingIncluded === false ? "No" : "Yes",
      node.completedBy || "",
    ];
  });
  return `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}`;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function downloadCsv(nodes: SplicerNode[], today: string, who = "billing") {
  const blob = new Blob([csvFor(nodes, CREW.includes(who as CrewName) ? (who as CrewName) : undefined)], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `optimum-${who.toLowerCase()}-${today}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function calendarHelp(mode: CalendarMode) {
  if (mode === "scheduled") {
    return "Automatic agenda: open nodes roll to the next day after your last report, keeping the authorized start and any date you schedule.";
  }
  if (mode === "start") {
    return "The original day each node can start. With no start date, it stays available on the automatic agenda.";
  }
  if (mode === "due") {
    return "Original due dates. Overdue nodes stay open until you confirm the work.";
  }
  if (mode === "completed") return "Nodes grouped by the day they were actually finished.";
  return "Expected payments. They count as received only after you confirm them.";
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

function squaredDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return (a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2;
}

function centroid(codes: string[], byCode: Map<string, SplicerNode>) {
  const points = codes.map((code) => parseGps(byCode.get(code)?.gps || "")).filter((point): point is { lat: number; lng: number } => Boolean(point));
  if (!points.length) return null;
  return {
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
    lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length,
  };
}

function farthestNodes(nodes: SplicerNode[], count: number) {
  const located = nodes.filter((node) => parseGps(node.gps));
  if (!count || !located.length) return [];
  const chosen: SplicerNode[] = [
    located.reduce((west, node) => (parseGps(node.gps)!.lng < parseGps(west.gps)!.lng ? node : west)),
  ];
  while (chosen.length < Math.min(count, located.length)) {
    let best = located[0];
    let bestDistance = -1;
    for (const node of located) {
      if (chosen.some((pick) => pick.code === node.code)) continue;
      const point = parseGps(node.gps)!;
      const distance = Math.min(...chosen.map((pick) => squaredDistance(point, parseGps(pick.gps)!)));
      if (distance > bestDistance) {
        bestDistance = distance;
        best = node;
      }
    }
    if (chosen.some((pick) => pick.code === best.code)) break;
    chosen.push(best);
  }
  return chosen;
}

export function normalizePlan(plan: Partial<RoutePlan> & { day: string }): RoutePlan {
  const seen = new Set<string>();
  const take = (codes: string[] | undefined) =>
    (codes ?? []).filter((code) => {
      const clean = code.trim().toUpperCase();
      if (!clean || seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });
  return {
    day: plan.day,
    Daniel: take(plan.Daniel),
    Iván: take(plan.Iván),
    Chris: take(plan.Chris),
    saved: Boolean(plan.saved),
  };
}

export function buildDayRoute(day: string, nodes: SplicerNode[], previous: RoutePlan | null): RoutePlan {
  const open = nodes.filter(
    (node) => node.status !== "completed" && node.status !== "excluded" && (!node.start || node.start <= day),
  );
  const byCode = new Map(open.map((node) => [node.code, node]));
  const lists: Record<CrewName, string[]> = { Daniel: [], Iván: [], Chris: [] };
  if (previous) {
    const carried = normalizePlan(previous);
    for (const person of CREW) {
      lists[person] = carried[person].filter((code) => byCode.has(code)).slice(0, STOPS_PER_DAY);
    }
  }
  const taken = new Set(CREW.flatMap((person) => lists[person]));
  let pool = open.filter((node) => !taken.has(node.code));
  const seeds = farthestNodes(
    pool,
    CREW.filter((person) => lists[person].length === 0).length,
  );
  CREW.filter((person) => lists[person].length === 0).forEach((person, index) => {
    const seed = seeds[index];
    if (!seed) return;
    lists[person].push(seed.code);
    pool = pool.filter((node) => node.code !== seed.code);
  });

  let guard = 0;
  while (pool.length && CREW.some((person) => lists[person].length < STOPS_PER_DAY) && guard < 400) {
    guard += 1;
    const picks: { person: CrewName; index: number; distance: number }[] = [];
    for (const person of CREW) {
      if (lists[person].length >= STOPS_PER_DAY) continue;
      const anchor = centroid(lists[person], byCode);
      let bestIndex = -1;
      let bestDistance = Number.POSITIVE_INFINITY;
      pool.forEach((node, index) => {
        const point = parseGps(node.gps);
        const distance = point && anchor ? squaredDistance(point, anchor) : point ? 1_000_000 : 1_000_000_000;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      if (bestIndex >= 0) picks.push({ person, index: bestIndex, distance: bestDistance });
    }
    if (!picks.length) break;
    picks.sort((a, b) => a.distance - b.distance);
    const claimed = new Set<number>();
    for (const pick of picks) {
      if (claimed.has(pick.index)) continue;
      claimed.add(pick.index);
      lists[pick.person].push(pool[pick.index].code);
    }
    pool = pool.filter((_, index) => !claimed.has(index));
  }

  for (const person of CREW) {
    const previousCodes = new Set(previous?.[person] ?? []);
    let prefix = 0;
    for (const code of lists[person]) {
      if (!previousCodes.has(code)) break;
      prefix += 1;
    }
    const head = lists[person].slice(0, prefix);
    const tail = lists[person].slice(prefix);
    const ordered = orderByProximity(
      tail.map((code) => byCode.get(code)).filter((node): node is SplicerNode => Boolean(node)),
      centroid(head, byCode),
    ).map((node) => node.code);
    const unlocated = tail.filter((code) => !ordered.includes(code));
    lists[person] = [...head, ...ordered, ...unlocated].slice(0, STOPS_PER_DAY);
  }

  return normalizePlan({ day, ...lists, saved: false });
}

export function routeForDay(day: string, nodes: SplicerNode[], plans: Record<string, RoutePlan>, depth = 0): RoutePlan {
  const stored = plans[day] ? normalizePlan({ ...plans[day], day }) : null;
  if (stored?.saved) return stored;
  if (depth >= 21) return buildDayRoute(day, nodes, null);
  const previous = routeForDay(addDays(day, -1), nodes, plans, depth + 1);
  return buildDayRoute(day, nodes, previous);
}

export function readRoutePlans(): Record<string, RoutePlan> {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(ROUTES_KEY) || "null") as Record<string, Partial<RoutePlan>> | null;
    if (!raw) return {};
    return Object.fromEntries(Object.entries(raw).map(([day, plan]) => [day, normalizePlan({ ...plan, day })]));
  } catch {
    return {};
  }
}

export function writeRoutePlans(plans: Record<string, RoutePlan>) {
  localStorage.setItem(ROUTES_KEY, JSON.stringify(plans));
}
