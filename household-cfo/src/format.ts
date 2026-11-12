export function utcToday(): { y: number; m: number; d: number; iso: string } {
  const n = new Date();
  const y = n.getUTCFullYear();
  const m = n.getUTCMonth();
  const d = n.getUTCDate();
  return { y, m, d, iso: isoDate(y, m, d) };
}

export function isoDate(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function formatDay(iso: string, withYear = false): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

export function formatMonth(key: string, withYear = false): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: withYear ? "long" : "short",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

export function formatMonthLong(y: number, m: number): string {
  return new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function money(n: number, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function moneyWhole(n: number): string {
  return money(n, Math.abs(n) >= 1000 ? 0 : 2);
}

export function moneySigned(n: number, digits = 2): string {
  const core = money(Math.abs(n), digits);
  if (n > 0) return `+${core}`;
  if (n < 0) return `−${core}`;
  return core;
}

export function compactMoney(n: number): string {
  const sign = n < 0 ? "−" : "";
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 10_000) return `${sign}$${Math.round(a / 1000)}k`;
  if (a >= 1000) return `${sign}$${(a / 1000).toFixed(1)}k`;
  return `${sign}$${Math.round(a)}`;
}

export function pct(n: number, digits = 1): string {
  const v = n * 100;
  const body = `${Math.abs(v).toFixed(digits)}%`;
  if (v > 0) return `+${body}`;
  if (v < 0) return `−${body}`;
  return body;
}

export function pctAbs(n: number, digits = 0): string {
  return `${(Math.abs(n) * 100).toFixed(digits)}%`;
}

export function signedClass(n: number | null | undefined): string {
  if (n == null || n === 0 || Number.isNaN(n)) return "flat";
  return n > 0 ? "up" : "down";
}

export function parseNumber(raw: string): number | null {
  const n = Number(String(raw).replace(/[$,\s]/g, "").replace(/−/g, "-"));
  return Number.isFinite(n) ? n : null;
}

export function formatAsOf(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const CATEGORIES = [
  "Income",
  "Housing",
  "Debt",
  "Utilities",
  "Subscriptions",
  "Groceries",
  "Dining",
  "Transport",
  "Shopping",
  "Health",
  "Entertainment",
  "Personal",
  "Travel",
] as const;

export function creditLabel(score: number): string {
  if (score >= 800) return "Excellent";
  if (score >= 740) return "Very good";
  if (score >= 670) return "Good";
  if (score >= 580) return "Fair";
  return "Poor";
}

export const DISPLAY_NAMES: Record<string, string> = {
  AAPL: "Apple",
  MSFT: "Microsoft",
  GOOGL: "Alphabet",
  AMZN: "Amazon",
  NVDA: "NVIDIA",
  META: "Meta",
  JPM: "JPMorgan",
  JNJ: "Johnson & Johnson",
  XOM: "Exxon Mobil",
  KO: "Coca-Cola",
  VTI: "Total stock market",
  VXUS: "Total international",
  BND: "Total bond market",
  TSLA: "Tesla",
  NFLX: "Netflix",
  COST: "Costco",
  UNH: "UnitedHealth",
  AVGO: "Broadcom",
  "BRK-B": "Berkshire Hathaway",
  SPY: "S&P 500",
  QQQ: "Nasdaq 100",
};

export const BROAD_SYMBOLS = new Set([
  "VTI",
  "VXUS",
  "BND",
  "SPY",
  "QQQ",
  "ITOT",
  "IXUS",
  "AGG",
  "BNDX",
  "VT",
  "VOO",
  "VEA",
  "VWO",
]);
