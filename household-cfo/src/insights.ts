import { addDays, formatDay, formatMonth, pctAbs, round2, utcToday } from "./format";
import type { Budget, Store, Transaction } from "./types";

export interface BudgetRow {
  category: string;
  kind: Budget["kind"];
  limit: number;
  spent: number;
  projected: number;
  overshootDay: number | null;
  alreadyOver: boolean;
  status: "over" | "hot" | "ok";
  message: string;
}

export interface Leak {
  id: string;
  title: string;
  detail: string;
  monthly: number;
}

export interface RecurringItem {
  merchant: string;
  category: string;
  cadence: "weekly" | "semimonthly" | "monthly" | "annual";
  typical: number;
  direction: "in" | "out";
  count: number;
  lastDate: string;
  nextDate: string;
  annual: number;
}

export interface MonthFlow {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  partial: boolean;
}

export interface GoalView {
  id: string;
  name: string;
  target: number;
  current: number;
  gap: number;
  progress: number;
  linked: boolean;
  months: number | null;
  surplus: number;
  surplusMonth: string;
}

const MEDIA = ["netflix", "hulu", "disney+", "disney plus", "spotify", "max", "hbo", "youtube"];

function monthTransactions(txs: Transaction[], key: string): Transaction[] {
  return txs.filter((t) => t.date.startsWith(key));
}

export function spentByCategory(txs: Transaction[], key: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const tx of monthTransactions(txs, key)) {
    if (tx.amount >= 0) continue;
    out[tx.category] = round2((out[tx.category] ?? 0) + Math.abs(tx.amount));
  }
  return out;
}

export function budgetRows(store: Store, today = utcToday()): BudgetRow[] {
  const key = today.iso.slice(0, 7);
  const spentMap = spentByCategory(store.transactions, key);
  const dim = new Date(Date.UTC(today.y, today.m + 1, 0)).getUTCDate();
  const day = today.d;
  return store.budgets.map((budget) => {
    const spent = spentMap[budget.category] ?? 0;
    if (budget.kind === "fixed") {
      const alreadyOver = spent > budget.limit + 0.5;
      const status = alreadyOver ? "over" : "ok";
      const message = alreadyOver
        ? `${budget.category} is already ${moneyGap(spent - budget.limit)} over the monthly bill budget.`
        : spent <= 0
          ? "Nothing posted yet. This bucket is treated as a bill, not a daily pace."
          : "On track. This posts as a bill, so it isn't spread across the month.";
      return {
        category: budget.category,
        kind: budget.kind,
        limit: budget.limit,
        spent,
        projected: spent,
        overshootDay: null,
        alreadyOver,
        status,
        message,
      };
    }
    const daily = day > 0 ? spent / day : 0;
    const projected = round2(daily * dim);
    const alreadyOver = spent > budget.limit + 0.5;
    let overshootDay: number | null = null;
    if (!alreadyOver && daily > 0) {
      const hit = budget.limit / daily;
      if (hit <= dim + 1e-9) overshootDay = Math.max(day, Math.ceil(hit - 1e-9));
    }
    const hot = alreadyOver || (overshootDay != null && overshootDay <= dim);
    const monthName = formatMonth(`${today.y}-${String(today.m + 1).padStart(2, "0")}`, true);
    let message: string;
    if (alreadyOver) {
      message = `${budget.category} is already ${moneyGap(spent - budget.limit)} over the ${monthName} budget.`;
    } else if (overshootDay != null) {
      const when = formatDay(`${today.iso.slice(0, 8)}${String(overshootDay).padStart(2, "0")}`);
      message = `You'll overshoot ${budget.category.toLowerCase()} by ${when}.`;
    } else if (spent <= 0) {
      message = "No spending yet this month.";
    } else {
      message = `On pace for about ${moneyGap(projected)}, under the ${moneyGap(budget.limit)} budget.`;
    }
    return {
      category: budget.category,
      kind: budget.kind,
      limit: budget.limit,
      spent,
      projected,
      overshootDay,
      alreadyOver,
      status: alreadyOver ? "over" : hot ? "hot" : "ok",
      message,
    };
  });
}

function moneyGap(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function cashflow(store: Store, today = utcToday()): MonthFlow[] {
  const months: MonthFlow[] = [];
  for (let back = 5; back >= 0; back -= 1) {
    const cursor = new Date(Date.UTC(today.y, today.m - back, 1));
    const key = cursor.toISOString().slice(0, 7);
    const txs = monthTransactions(store.transactions, key);
    const income = round2(txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0));
    const expense = round2(txs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0));
    months.push({
      key,
      label: formatMonth(key),
      income,
      expense,
      net: round2(income - expense),
      partial: back === 0,
    });
  }
  return months;
}

export function lastFullSurplus(flows: MonthFlow[]): { surplus: number; label: string; key: string } | null {
  const full = [...flows].reverse().find((m) => !m.partial);
  if (!full) return null;
  return { surplus: full.net, label: formatMonth(full.key, true), key: full.key };
}

export function goalViews(store: Store, flows: MonthFlow[]): GoalView[] {
  const last = lastFullSurplus(flows);
  return store.goals.map((goal) => {
    const linked = goal.linkedAccountId
      ? store.accounts.find((a) => a.id === goal.linkedAccountId)
      : undefined;
    const current = linked ? Math.max(0, linked.balance) : goal.current;
    const gap = Math.max(0, round2(goal.target - current));
    const progress = goal.target > 0 ? Math.min(1, current / goal.target) : 0;
    const surplus = last?.surplus ?? 0;
    const months = gap <= 0 ? 0 : surplus > 0 ? gap / surplus : null;
    return {
      id: goal.id,
      name: goal.name,
      target: goal.target,
      current,
      gap,
      progress,
      linked: Boolean(linked),
      months,
      surplus,
      surplusMonth: last?.label ?? "",
    };
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function classify(gaps: number[]): RecurringItem["cadence"] | null {
  const bands: Array<[RecurringItem["cadence"], number, number]> = [
    ["weekly", 6, 9],
    ["semimonthly", 12, 18],
    ["monthly", 26, 35],
    ["annual", 350, 380],
  ];
  for (const [name, lo, hi] of bands) {
    if (gaps.every((gap) => gap >= lo && gap <= hi)) return name;
  }
  return null;
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

export function detectRecurring(store: Store): RecurringItem[] {
  const groups = new Map<string, Transaction[]>();
  for (const tx of store.transactions) {
    const key = tx.merchant.trim().toLowerCase();
    const list = groups.get(key) ?? [];
    list.push(tx);
    groups.set(key, list);
  }
  const billCategories = new Set(["Income", "Housing", "Debt", "Utilities", "Subscriptions"]);
  const items: RecurringItem[] = [];
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 3) continue;
    const amounts = sorted.map((t) => t.amount);
    const sign = amounts[0] >= 0 ? 1 : -1;
    if (amounts.some((a) => (a >= 0 ? 1 : -1) !== sign)) continue;
    if (!billCategories.has(sorted[sorted.length - 1].category)) continue;
    const abs = amounts.map((a) => Math.abs(a));
    const typical = median(abs);
    if (typical <= 0) continue;
    if (abs.some((a) => Math.abs(a - typical) / typical > 0.12)) continue;
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    const cadence = classify(gaps);
    if (!cadence) continue;
    const perYear = { weekly: 52, semimonthly: 24, monthly: 12, annual: 1 }[cadence];
    const gapDays = Math.round(median(gaps));
    const lastDate = sorted[sorted.length - 1].date;
    items.push({
      merchant: sorted[sorted.length - 1].merchant,
      category: sorted[sorted.length - 1].category,
      cadence,
      typical: round2(typical),
      direction: sign > 0 ? "in" : "out",
      count: sorted.length,
      lastDate,
      nextDate: addDays(lastDate, gapDays),
      annual: round2(typical * perYear),
    });
  }
  items.sort((a, b) => b.annual - a.annual);
  return items;
}

export function spendingLeaks(store: Store, rows: BudgetRow[], recurring: RecurringItem[], today = utcToday()): Leak[] {
  const leaks: Leak[] = [];
  const key = today.iso.slice(0, 7);
  const monthTx = monthTransactions(store.transactions, key);
  const media = recurring.filter(
    (item) =>
      item.direction === "out" &&
      MEDIA.some((name) => item.merchant.toLowerCase().includes(name)),
  );
  if (media.length >= 3) {
    const monthly = round2(media.reduce((s, item) => s + item.typical, 0));
    leaks.push({
      id: "streaming",
      title: "Streaming is stacked",
      detail: `${media.map((m) => m.merchant).join(", ")} bill ${moneyGap(monthly)} a month. Dropping one service is the cleanest cut.`,
      monthly,
    });
  }

  const byMerchant = new Map<string, Transaction[]>();
  for (const tx of monthTx) {
    if (tx.amount >= 0 || Math.abs(tx.amount) >= 20) continue;
    const name = tx.merchant.trim().toLowerCase();
    const list = byMerchant.get(name) ?? [];
    list.push(tx);
    byMerchant.set(name, list);
  }
  for (const list of byMerchant.values()) {
    if (list.length < 4) continue;
    const total = round2(list.reduce((s, tx) => s + Math.abs(tx.amount), 0));
    leaks.push({
      id: `small-${list[0].merchant}`,
      title: `${list[0].merchant} is a drip`,
      detail: `${list.length} small charges this month add up to ${moneyGap(total)}. They stay easy to miss until they are counted together.`,
      monthly: total,
    });
  }

  for (const row of rows) {
    if (row.kind !== "variable" || row.status === "ok") continue;
    leaks.push({
      id: `pace-${row.category}`,
      title: row.alreadyOver ? `${row.category} is already over` : `${row.category} is running hot`,
      detail: row.message,
      monthly: Math.max(0, row.projected - row.limit),
    });
  }
  return leaks;
}

export function cumulativeSpend(store: Store, today = utcToday()): { date: string; label: string; value: number }[] {
  const key = today.iso.slice(0, 7);
  const monthTx = monthTransactions(store.transactions, key).filter((tx) => tx.amount < 0);
  if (!monthTx.length) return [];
  const byDay = new Map<number, number>();
  for (const tx of monthTransactions(store.transactions, key)) {
    if (tx.amount >= 0) continue;
    const day = Number(tx.date.slice(8, 10));
    byDay.set(day, (byDay.get(day) ?? 0) + Math.abs(tx.amount));
  }
  const points: { date: string; label: string; value: number }[] = [];
  let run = 0;
  for (let day = 1; day <= today.d; day += 1) {
    run += byDay.get(day) ?? 0;
    const date = `${key}-${String(day).padStart(2, "0")}`;
    points.push({ date, label: formatDay(date), value: round2(run) });
  }
  return points;
}

export function categoryMax(rows: BudgetRow[]): number {
  return Math.max(1, ...rows.map((r) => Math.max(r.limit, r.spent, r.projected)));
}

export function paceFraction(today = utcToday()): number {
  const dim = new Date(Date.UTC(today.y, today.m + 1, 0)).getUTCDate();
  return today.d / dim;
}

export function formatMonths(months: number | null): string {
  if (months == null) return "no surplus last month";
  if (months <= 0) return "funded";
  if (months < 1.2) return "about a month";
  return `about ${months.toFixed(1)} months`;
}

export function savingsRate(flow: MonthFlow): number | null {
  if (flow.income <= 0) return null;
  return flow.net / flow.income;
}

export function rateText(rate: number | null): string {
  if (rate == null) return "n/a";
  return pctAbs(rate, 0);
}
