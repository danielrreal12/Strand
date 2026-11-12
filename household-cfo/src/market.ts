import { DISPLAY_NAMES, formatAsOf } from "./format";
import type { Quote, QuoteBook, QuoteSource } from "./types";

const CACHE_KEY = "household-cfo.quotes.v1";

interface YahooChart {
  chart?: {
    result?: Array<{
      meta?: {
        shortName?: string;
        longName?: string;
        currency?: string;
        regularMarketPrice?: number;
        regularMarketChangePercent?: number;
        regularMarketTime?: number;
        fiftyTwoWeekHigh?: number;
      };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
    error?: { description?: string };
  };
}

function sourceLabel(source: QuoteSource): string {
  if (source === "yahoo" || source === "yahoo-backup") return "Yahoo Finance";
  if (source === "nasdaq") return "Nasdaq";
  return "saved prices";
}

export function quoteSourceLabel(source: QuoteSource): string {
  return sourceLabel(source);
}

function parseMoney(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const n = Number(raw.replace(/[$,]/g, "").replace(/[()]/g, ""));
  if (!Number.isFinite(n)) return null;
  return raw.includes("(") ? -Math.abs(n) : n;
}

function parsePct(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw / 100;
  if (typeof raw !== "string") return null;
  const n = Number(raw.replace("%", "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n / 100 : null;
}

function withLiveBar(bars: { date: string; close: number }[], price: number, asOf: number) {
  const today = new Date(asOf * 1000).toISOString().slice(0, 10);
  if (!bars.length || bars[bars.length - 1].date !== today) {
    bars.push({ date: today, close: price });
  } else {
    bars[bars.length - 1] = { date: today, close: price };
  }
  return bars;
}

function parseYahoo(symbol: string, data: YahooChart, source: QuoteSource): Quote | null {
  const result = data.chart?.result?.[0];
  const meta = result?.meta;
  const price = meta?.regularMarketPrice;
  if (!result || !meta || price == null || !Number.isFinite(price)) return null;
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const stamps = result.timestamp ?? [];
  const bars: { date: string; close: number }[] = [];
  for (let i = 0; i < stamps.length; i += 1) {
    const close = closes[i];
    if (close == null || !Number.isFinite(close)) continue;
    bars.push({ date: new Date(stamps[i] * 1000).toISOString().slice(0, 10), close });
  }
  const dayPctRaw = meta.regularMarketChangePercent;
  const dayPct = dayPctRaw == null || !Number.isFinite(dayPctRaw) ? 0 : dayPctRaw / 100;
  const previousClose =
    Math.abs(dayPct) > 1e-8
      ? price / (1 + dayPct)
      : bars.length
        ? bars[bars.length - 1].close
        : price;
  const asOf = meta.regularMarketTime ?? Math.floor(Date.now() / 1000);
  return {
    symbol,
    name: DISPLAY_NAMES[symbol] || meta.shortName || meta.longName || symbol,
    price,
    previousClose,
    dayChange: price - previousClose,
    dayPct,
    currency: meta.currency || "USD",
    asOf,
    bars: withLiveBar(bars, price, asOf),
    source,
  };
}

async function fetchYahoo(symbol: string, prefix: string, source: QuoteSource): Promise<Quote | null> {
  const url = `${prefix}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y&includePrePost=false`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) return null;
  const data = (await res.json()) as YahooChart;
  if (data.chart?.error) return null;
  return parseYahoo(symbol, data, source);
}

function nasdaqDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchNasdaq(symbol: string): Promise<Quote | null> {
  for (const asset of ["stocks", "etf"]) {
    const infoRes = await fetch(
      `/api/nasdaq/api/quote/${encodeURIComponent(symbol)}/info?assetclass=${asset}`,
      { signal: AbortSignal.timeout(12000) },
    );
    if (!infoRes.ok) continue;
    const info = (await infoRes.json()) as {
      data?: {
        companyName?: string;
        primaryData?: {
          lastSalePrice?: string;
          netChange?: string;
          percentageChange?: string;
          lastTradeTimestamp?: string;
        };
      };
    };
    const primary = info.data?.primaryData;
    const price = parseMoney(primary?.lastSalePrice);
    if (price == null) continue;
    const dayChange = parseMoney(primary?.netChange) ?? 0;
    const dayPct = parsePct(primary?.percentageChange) ?? (price - dayChange !== 0 ? dayChange / (price - dayChange) : 0);
    const to = new Date();
    const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 420);
    const histRes = await fetch(
      `/api/nasdaq/api/quote/${encodeURIComponent(symbol)}/historical?assetclass=${asset}&fromdate=${nasdaqDate(from)}&todate=${nasdaqDate(to)}&limit=400`,
      { signal: AbortSignal.timeout(12000) },
    );
    const bars: { date: string; close: number }[] = [];
    if (histRes.ok) {
      const hist = (await histRes.json()) as {
        data?: { tradesTable?: { rows?: Array<{ date?: string; close?: string }> } };
      };
      const rows = hist.data?.tradesTable?.rows ?? [];
      for (const row of rows) {
        const close = parseMoney(row.close);
        if (!row.date || close == null) continue;
        const [mm, dd, yy] = row.date.split("/");
        if (!yy || !mm || !dd) continue;
        bars.push({ date: `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`, close });
      }
      bars.reverse();
    }
    const asOf = Math.floor(Date.now() / 1000);
    return {
      symbol,
      name: DISPLAY_NAMES[symbol] || info.data?.companyName || symbol,
      price,
      previousClose: price - dayChange,
      dayChange,
      dayPct,
      currency: "USD",
      asOf,
      bars: withLiveBar(bars, price, asOf),
      source: "nasdaq",
    };
  }
  return null;
}

async function fetchOne(symbol: string): Promise<Quote | null> {
  const primary = await fetchYahoo(symbol, "/api/yahoo", "yahoo").catch(() => null);
  if (primary && primary.bars.length >= 2) return primary;
  const backup = await fetchYahoo(symbol, "/api/yahoo2", "yahoo-backup").catch(() => null);
  if (backup && backup.bars.length >= 2) return backup;
  return fetchNasdaq(symbol).catch(() => null);
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      out[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function readCache(): QuoteBook | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuoteBook;
    if (!parsed || typeof parsed.bySymbol !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(book: QuoteBook): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(book));
  } catch {
    /* ignore quota */
  }
}

function summarize(book: Omit<QuoteBook, "summary">, symbols: string[]): string {
  const quotes = Object.values(book.bySymbol);
  if (!quotes.length) {
    return "Live quotes didn't load, and there are no saved prices on this device.";
  }
  const asOf = quotes.reduce((max, q) => Math.max(max, q.asOf), 0);
  const when = asOf ? ` as of ${formatAsOf(asOf)} ET` : "";
  if (book.stale) {
    const saved = new Date(book.fetchedAt).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `Couldn't reach a live feed. Showing prices saved ${saved}.`;
  }
  const yahoo = quotes.filter((q) => q.source === "yahoo" || q.source === "yahoo-backup").length;
  const nasdaq = quotes.filter((q) => q.source === "nasdaq").length;
  const saved = quotes.filter((q) => q.source === "saved").length;
  const missing = symbols.filter((s) => !book.bySymbol[s]);
  let text: string;
  if (yahoo && !nasdaq && !saved) text = `Live prices from Yahoo Finance${when}.`;
  else if (nasdaq && !yahoo && !saved) {
    text = `Yahoo Finance didn't respond. Live prices are from Nasdaq's public quote feed${when}.`;
  } else if (yahoo && nasdaq) {
    text = `Live prices from Yahoo Finance${when}. ${nasdaq} ${nasdaq === 1 ? "symbol came" : "symbols came"} from Nasdaq instead.`;
  } else text = `Prices are a mix of live feeds and saved data${when}.`;
  if (saved) text += ` ${saved} still using a saved price.`;
  if (missing.length) text += ` No price for ${missing.join(", ")}.`;
  return text;
}

export function loadCachedQuotes(): QuoteBook | null {
  const cached = readCache();
  if (!cached) return null;
  return { ...cached, stale: true, summary: summarize({ ...cached, stale: true }, Object.keys(cached.bySymbol)) };
}

export function clearQuoteCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export async function loadQuotes(symbols: string[]): Promise<QuoteBook> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()).filter(Boolean))];
  if (!unique.length) {
    return {
      bySymbol: {},
      errors: {},
      fetchedAt: Date.now(),
      stale: false,
      summary: "No tickers yet. Add a holding to load a live price.",
    };
  }
  const cached = readCache();
  const fetched = await mapPool(unique, 4, async (symbol) => {
    const quote = await fetchOne(symbol);
    return [symbol, quote] as const;
  });
  const bySymbol: Record<string, Quote> = {};
  const errors: Record<string, string> = {};
  for (const [symbol, quote] of fetched) {
    if (quote) bySymbol[symbol] = quote;
    else if (cached?.bySymbol[symbol]) {
      bySymbol[symbol] = { ...cached.bySymbol[symbol], source: "saved" };
      errors[symbol] = "Live quote failed. Using the last saved price.";
    } else errors[symbol] = "No public quote returned.";
  }
  const liveCount = Object.values(bySymbol).filter((q) => q.source !== "saved").length;
  const stale = liveCount === 0 && Object.keys(bySymbol).length > 0;
  const book: QuoteBook = {
    bySymbol,
    errors,
    fetchedAt: liveCount ? Date.now() : cached?.fetchedAt ?? Date.now(),
    stale,
    summary: "",
  };
  book.summary = summarize(book, unique);
  if (liveCount) writeCache({ ...book, stale: false });
  return book;
}
