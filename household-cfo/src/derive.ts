import { round2, utcToday } from "./format";
import {
  budgetRows,
  cashflow,
  cumulativeSpend,
  detectRecurring,
  goalViews,
  lastFullSurplus,
  savingsRate,
  spendingLeaks,
  type BudgetRow,
  type GoalView,
  type Leak,
  type MonthFlow,
  type RecurringItem,
} from "./insights";
import { alertSignals, computeSignals } from "./signals";
import type { Account, Holding, Quote, QuoteBook, Signal, Store } from "./types";

export interface HoldingView {
  holding: Holding;
  accountName: string;
  name: string;
  price: number | null;
  dayPct: number | null;
  dayChange: number | null;
  value: number;
  cost: number;
  gain: number;
  gainPct: number | null;
  live: boolean;
  source: Quote["source"] | null;
  spark: number[];
  signal: Signal | null;
}

export interface AccountView {
  account: Account;
  holdingsValue: number;
  total: number;
  live: boolean;
}

export interface SeriesPoint {
  date: string;
  label: string;
  value: number;
}

export interface Model {
  todayLabel: string;
  monthLabel: string;
  monthKey: string;
  netWorth: number;
  assets: number;
  liabilities: number;
  cash: number;
  investments: number;
  homeEquity: number;
  otherDebt: number;
  dayChange: number | null;
  priced: boolean;
  usingCost: boolean;
  accounts: AccountView[];
  holdings: HoldingView[];
  signals: Signal[];
  alerts: Signal[];
  budgets: BudgetRow[];
  hotBudgets: BudgetRow[];
  leaks: Leak[];
  recurring: RecurringItem[];
  goals: GoalView[];
  flows: MonthFlow[];
  surplus: { surplus: number; label: string; key: string } | null;
  savingsRate: number | null;
  spendSeries: SeriesPoint[];
  netSeries: SeriesPoint[];
  monthSpend: number;
  monthIncome: number;
}

function priceOf(quotes: Record<string, Quote>, holding: Holding, allowCost: boolean): number | null {
  const live = quotes[holding.symbol]?.price;
  if (live != null) return live;
  return allowCost ? holding.costBasis : null;
}

export function derive(store: Store, book: QuoteBook | null): Model {
  const today = utcToday();
  const quotes = book?.bySymbol ?? {};
  const priced = store.holdings.some((h) => quotes[h.symbol]?.price != null);
  const usingCost = store.holdings.some((h) => quotes[h.symbol]?.price == null);

  const accounts: AccountView[] = store.accounts.map((account) => {
    const lots = store.holdings.filter((h) => h.accountId === account.id);
    const holdingsValue = lots.reduce((sum, h) => {
      const price = priceOf(quotes, h, true) ?? 0;
      return sum + h.shares * price;
    }, 0);
    const investable = account.type === "investment" || account.type === "retirement";
    const total = investable ? account.balance + holdingsValue : account.balance;
    const live = lots.length === 0 || lots.every((h) => quotes[h.symbol]?.price != null);
    return { account, holdingsValue, total, live };
  });

  const netWorth = accounts.reduce((sum, row) => sum + row.total, 0);
  const assets = accounts.filter((row) => row.total > 0).reduce((sum, row) => sum + row.total, 0);
  const liabilities = accounts.filter((row) => row.total < 0).reduce((sum, row) => sum + Math.abs(row.total), 0);

  const cash = accounts
    .filter((row) => row.account.type === "cash" || row.account.type === "investment")
    .reduce((sum, row) => sum + (row.account.type === "investment" ? row.account.balance : row.total), 0);
  const investments = accounts
    .filter((row) => row.account.type === "investment" || row.account.type === "retirement")
    .reduce((sum, row) => sum + row.holdingsValue + (row.account.type === "retirement" ? row.account.balance : 0), 0);
  const property = accounts.filter((row) => row.account.type === "property").reduce((sum, row) => sum + row.total, 0);
  const loans = accounts.filter((row) => row.account.type === "loan").reduce((sum, row) => sum + row.total, 0);
  const homeEquity = property + loans;
  const otherDebt = accounts
    .filter((row) => row.account.type === "credit")
    .reduce((sum, row) => sum + Math.abs(row.total), 0);

  const signals = computeSignals(store, quotes);
  const bySymbol = new Map(signals.map((s) => [s.symbol, s]));

  const holdings: HoldingView[] = store.holdings.map((holding) => {
    const quote = quotes[holding.symbol];
    const price = quote?.price ?? null;
    const value = (price ?? holding.costBasis) * holding.shares;
    const cost = holding.costBasis * holding.shares;
    const gain = value - cost;
    const spark = (quote?.bars ?? []).slice(-32).map((b) => b.close);
    return {
      holding,
      accountName: store.accounts.find((a) => a.id === holding.accountId)?.name ?? holding.accountId,
      name: quote?.name ?? holding.symbol,
      price,
      dayPct: quote?.dayPct ?? null,
      dayChange: quote ? quote.dayChange * holding.shares : null,
      value,
      cost,
      gain,
      gainPct: cost !== 0 ? gain / cost : null,
      live: Boolean(quote) && quote.source !== "saved" && !book?.stale,
      source: quote?.source ?? null,
      spark,
      signal: bySymbol.get(holding.symbol) ?? null,
    };
  });

  const dayChange = holdings.every((h) => h.dayChange == null)
    ? null
    : holdings.reduce((sum, h) => sum + (h.dayChange ?? 0), 0);

  const budgets = budgetRows(store, today);
  const flows = cashflow(store, today);
  const recurring = detectRecurring(store);
  const leaks = spendingLeaks(store, budgets, recurring, today);
  const goals = goalViews(store, flows);
  const currentFlow = flows[flows.length - 1];

  return {
    todayLabel: new Date(Date.UTC(today.y, today.m, today.d)).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }),
    monthLabel: new Date(Date.UTC(today.y, today.m, 1)).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
    monthKey: today.iso.slice(0, 7),
    netWorth,
    assets,
    liabilities,
    cash,
    investments,
    homeEquity,
    otherDebt,
    dayChange: priced ? dayChange : null,
    priced,
    usingCost,
    accounts,
    holdings,
    signals,
    alerts: alertSignals(signals),
    budgets,
    hotBudgets: budgets.filter((row) => row.kind === "variable" && row.status !== "ok"),
    leaks,
    recurring,
    goals,
    flows,
    surplus: lastFullSurplus(flows),
    savingsRate: currentFlow ? savingsRate(currentFlow) : null,
    spendSeries: cumulativeSpend(store, today),
    netSeries: netWorthSeries(store, quotes, netWorth),
    monthSpend: currentFlow?.expense ?? 0,
    monthIncome: currentFlow?.income ?? 0,
  };
}

function netWorthSeries(store: Store, quotes: Record<string, Quote>, netWorthNow: number): SeriesPoint[] {
  const dated = new Map<string, Map<string, number>>();
  for (const holding of store.holdings) {
    const quote = quotes[holding.symbol];
    if (!quote) continue;
    for (const bar of quote.bars) {
      const map = dated.get(bar.date) ?? new Map<string, number>();
      map.set(holding.symbol, bar.close);
      dated.set(bar.date, map);
    }
  }
  const dates = [...dated.keys()].sort();
  if (dates.length < 5) return [];
  const symbols = [...new Set(store.holdings.map((h) => h.symbol))];
  const last = new Map<string, number>();
  let liveMv = 0;
  let haveLive = true;
  for (const holding of store.holdings) {
    const price = quotes[holding.symbol]?.price;
    if (price == null) {
      haveLive = false;
      break;
    }
    liveMv += holding.shares * price;
  }
  if (!haveLive) return [];
  const other = netWorthNow - liveMv;
  const points: SeriesPoint[] = [];
  for (const date of dates) {
    const closes = dated.get(date)!;
    for (const [symbol, close] of closes) last.set(symbol, close);
    if (symbols.some((symbol) => !last.has(symbol))) continue;
    let mv = 0;
    for (const holding of store.holdings) mv += holding.shares * (last.get(holding.symbol) ?? 0);
    points.push({
      date,
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      value: round2(other + mv),
    });
  }
  return points;
}

export function sliceSeries(points: SeriesPoint[], range: "1M" | "3M" | "YTD" | "1Y"): SeriesPoint[] {
  if (range === "1M") return points.slice(-22);
  if (range === "3M") return points.slice(-66);
  if (range === "1Y") return points.slice(-252);
  const year = utcToday().iso.slice(0, 4);
  const filtered = points.filter((point) => point.date.startsWith(year));
  return filtered.length > 2 ? filtered : points.slice(-22);
}
