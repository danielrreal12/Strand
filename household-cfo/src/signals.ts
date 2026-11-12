import { BROAD_SYMBOLS, pct, pctAbs } from "./format";
import type { Quote, Signal, Store } from "./types";

function sma(values: number[], n: number): number | null {
  if (values.length < n) return null;
  let sum = 0;
  for (let i = values.length - n; i < values.length; i += 1) sum += values[i];
  return sum / n;
}

function change(values: number[], sessions: number): number | null {
  if (values.length <= sessions) return null;
  const then = values[values.length - 1 - sessions];
  const now = values[values.length - 1];
  if (!then) return null;
  return now / then - 1;
}

function cross(values: number[]): "golden" | "death" | "none" {
  if (values.length < 60) return "none";
  const spread = (arr: number[]) => {
    const a = sma(arr, 20);
    const b = sma(arr, 50);
    if (a == null || b == null) return 0;
    return a - b;
  };
  const then = spread(values.slice(0, -8));
  const now = spread(values);
  if (then <= 0 && now > 0) return "golden";
  if (then >= 0 && now < 0) return "death";
  return "none";
}

function accountValue(
  store: Store,
  accountId: string,
  quotes: Record<string, Quote>,
): number {
  const account = store.accounts.find((a) => a.id === accountId);
  const cash = account?.balance ?? 0;
  const holdings = store.holdings
    .filter((h) => h.accountId === accountId)
    .reduce((sum, h) => {
      const price = quotes[h.symbol]?.price ?? h.costBasis;
      return sum + h.shares * price;
    }, 0);
  return cash + holdings;
}

export function computeSignals(store: Store, quotes: Record<string, Quote>): Signal[] {
  const symbols = [...new Set(store.holdings.map((h) => h.symbol.toUpperCase()))];
  const invested = store.accounts
    .filter((a) => a.type === "investment" || a.type === "retirement")
    .reduce((sum, a) => sum + accountValue(store, a.id, quotes), 0);

  return symbols.map((symbol) => {
    const quote = quotes[symbol];
    const lots = store.holdings.filter((h) => h.symbol === symbol);
    const held = lots.length > 0;
    const broad = lots.some((h) => h.kind === "etf-broad") || BROAD_SYMBOLS.has(symbol);
    const name = quote?.name ?? symbol;
    if (!quote) {
      return {
        symbol,
        name,
        action: "hold",
        summary: `${symbol} has no live price, so it isn't scored.`,
        detail: "The quote feed didn't return this symbol. Nothing is flagged until a price loads.",
        held,
        broad,
        price: 0,
        dayPct: 0,
        ret20: null,
        ret60: null,
        drawdown: null,
        sma20: null,
        sma50: null,
        maCross: "none",
        weightAccount: null,
        accountName: null,
        weightPortfolio: null,
        score: 0,
        unpriced: true,
      };
    }

    const closes = quote.bars.map((b) => b.close);
    const price = quote.price;
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    const ret20 = change(closes, 20);
    const ret60 = change(closes, 60);
    const high = Math.max(...closes, price);
    const drawdown = high > 0 ? price / high - 1 : 0;
    const maCross = cross(closes);
    const history = closes.length;
    const historyPhrase = history >= 200 ? "the past year" : "the loaded history";

    let bestWeight: number | null = null;
    let accountName: string | null = null;
    let positionValue = 0;
    for (const lot of lots) {
      const value = lot.shares * price;
      positionValue += value;
      const total = accountValue(store, lot.accountId, quotes);
      const weight = total > 0 ? value / total : 0;
      if (bestWeight == null || weight > bestWeight) {
        bestWeight = weight;
        accountName = store.accounts.find((a) => a.id === lot.accountId)?.name ?? null;
      }
    }
    const weightPortfolio = invested > 0 && held ? positionValue / invested : held ? 0 : null;
    const room = !held || (bestWeight != null && bestWeight < 0.12);

    const base = {
      symbol,
      name,
      held,
      broad,
      price,
      dayPct: quote.dayPct,
      ret20,
      ret60,
      drawdown,
      sma20,
      sma50,
      maCross,
      weightAccount: bestWeight,
      accountName,
      weightPortfolio,
      unpriced: false,
    };

    if (history < 50 || sma20 == null || sma50 == null) {
      return {
        ...base,
        action: "hold",
        summary: `${name} doesn't have enough history to score.`,
        detail: "The fallback feed returned a price but not enough daily bars for the moving averages.",
        score: 0,
      };
    }

    const broken =
      price < sma50 && sma20 < sma50 && drawdown <= -0.15 && (ret20 ?? 0) <= -0.08;
    const death = maCross === "death" && price < sma50;
    const golden = maCross === "golden" && price > sma50 && (ret20 ?? 0) > 0;
    const momentum =
      price > sma20 &&
      price > sma50 &&
      (ret20 ?? 0) >= 0.05 &&
      (ret60 ?? 0) >= 0.05 &&
      drawdown >= -0.08;
    const dip =
      drawdown <= -0.12 && drawdown >= -0.3 && price > sma50 && (ret60 ?? 0) > 0;
    const trendUp = price > sma50 && (ret60 ?? 0) > 0;

    const offHigh = `${pctAbs(drawdown, 0)} off the high of ${historyPhrase}`;
    const ret20Text = ret20 == null ? "the 20-session change isn't available" : `${pct(ret20, 0)} over 20 sessions`;
    const ret60Text = ret60 == null ? "" : `${pct(ret60, 0)} over 60`;

    if (held && broken) {
      return {
        ...base,
        action: "sell",
        score: 80 + Math.abs(drawdown) * 100,
        summary: `Sell ${symbol} — ${offHigh}, and under both averages.`,
        detail: `${name} is ${offHigh}. The price is under the 20-day and the 50-day averages, and it's ${ret20Text}. That's a broken trend. The rule says sell the shares you hold instead of averaging down. This ignores taxes.`,
      };
    }

    if (held && !broad && bestWeight != null && bestWeight >= 0.5) {
      return {
        ...base,
        action: "sell",
        score: 70 + bestWeight * 20,
        summary: `Sell ${symbol} — ${pctAbs(bestWeight, 0)} of ${accountName ?? "the account"}.`,
        detail: `${name} is ${pctAbs(bestWeight, 0)} of ${accountName ?? "that account"}. Half an account in one stock is past a trim. The rule says sell it down hard. ${trendUp ? `The trend is still up (${ret60Text}).` : ""} This ignores taxes.`,
      };
    }

    if (held && !broad && bestWeight != null && bestWeight >= 0.25) {
      return {
        ...base,
        action: "trim",
        score: 60 + bestWeight * 20,
        summary: `Trim ${symbol} — ${pctAbs(bestWeight, 0)} of ${accountName ?? "the account"}, over the 25% cap.`,
        detail: `${name} is ${pctAbs(bestWeight, 0)} of ${accountName ?? "that account"}. Any single stock at 25% or more trips the concentration rule. ${
          trendUp
            ? `The trend is still up (${ret60Text}, above the 50-day average), so this is a trim, not a liquidation.`
            : "The trend is not strong enough to ignore the size."
        } Broad funds are exempt from this cap. This ignores taxes.`,
      };
    }

    if (held && death && (drawdown <= -0.1 || (ret20 ?? 0) <= -0.08)) {
      const hard = drawdown <= -0.18 && (ret20 ?? 0) <= -0.1;
      return {
        ...base,
        action: hard ? "sell" : "trim",
        score: 55 + Math.abs(drawdown) * 40,
        summary: `${hard ? "Sell" : "Trim"} ${symbol} — the 20-day average crossed under the 50-day.`,
        detail: `${name}'s 20-day average crossed below the 50-day average in the last 8 sessions, and the price is ${offHigh}. It's ${ret20Text}. The rule says ${hard ? "sell" : "trim"} rather than add. This ignores taxes.`,
      };
    }

    if (broad) {
      const share =
        weightPortfolio != null ? ` It's ${pctAbs(weightPortfolio, 0)} of invested assets.` : "";
      return {
        ...base,
        action: "hold",
        score: 0,
        summary: `Hold ${symbol} — broad fund, no single-stock timing rule.`,
        detail: `${name} is a broad fund, so the concentration cap and the buy/sell timing rules leave it alone.${share} That size is market exposure, not one company.`,
      };
    }

    if (room && golden) {
      return {
        ...base,
        action: "buy",
        score: 40 + (ret20 ?? 0) * 100,
        summary: `Buy ${symbol} — 20-day average crossed above the 50-day.`,
        detail: `${name}'s 20-day average crossed above the 50-day average in the last 8 sessions. It's ${ret20Text}${ret60Text ? ` and ${ret60Text}` : ""}. ${
          held ? "The position is still small enough that the rule allows adding." : "You don't own it yet."
        }`,
      };
    }

    if (room && momentum) {
      return {
        ...base,
        action: "buy",
        score: 30 + (ret60 ?? 0) * 100,
        summary: `Buy ${symbol} — up ${pct(ret20 ?? 0, 0)} in 20 sessions and above both averages.`,
        detail: `${name} is ${ret20Text} and ${ret60Text}, with the price above both the 20-day and 50-day averages and only ${pctAbs(drawdown, 0)} off the high. ${
          held ? "You already own a small piece, and the rule says it's small enough to add." : "You don't own it yet, so the rule suggests a starter buy."
        }`,
      };
    }

    if (room && dip) {
      return {
        ...base,
        action: "buy",
        score: 20 + Math.abs(drawdown) * 40,
        summary: `Buy ${symbol} — ${offHigh}, still above the 50-day average.`,
        detail: `${name} is ${offHigh}, but the price is still above the 50-day average and the 60-session change is ${ret60 == null ? "positive" : pct(ret60, 0)}. The rule treats that as a pullback inside an uptrend, not a breakdown. ${
          held ? "The current stake is small." : "You don't own it yet."
        }`,
      };
    }

    if (!held && (broken || (price < sma50 && drawdown <= -0.2))) {
      return {
        ...base,
        action: "hold",
        score: 0,
        summary: `Stay out of ${symbol} — ${offHigh} and under the 50-day average.`,
        detail: `${name} is not in the portfolio. It's ${offHigh} and under the 50-day average, so the rules say stay out rather than buy the dip.`,
      };
    }

    const maNote =
      price > sma50
        ? "Price is still above the 50-day average."
        : "Price is under the 50-day average, but not enough of the other sell rules fired.";
    return {
      ...base,
      action: "hold",
      score: 0,
      summary: `Hold ${symbol} — no buy or sell setup.`,
      detail: `${name} doesn't clear a buy or a sell. ${maNote} ${ret20 == null ? "" : `The 20-session change is ${pct(ret20, 0)}.`}`.trim(),
    };
  });
}

export function alertSignals(signals: Signal[]): Signal[] {
  const rank = { sell: 0, trim: 1, buy: 2, hold: 3 };
  return signals
    .filter((s) => s.action !== "hold" && !s.unpriced)
    .sort((a, b) => rank[a.action] - rank[b.action] || b.score - a.score);
}
