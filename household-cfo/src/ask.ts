import { creditLabel, money, moneySigned, pct } from "./format";
import type { Model } from "./derive";
import { formatMonths, rateText } from "./insights";
import type { QuoteBook, Store } from "./types";

export interface AskContext {
  store: Store;
  model: Model;
  book: QuoteBook | null;
}

function findCategory(text: string, store: Store): string | null {
  const lower = text.toLowerCase();
  const categories = store.budgets.map((b) => b.category);
  return categories.find((category) => lower.includes(category.toLowerCase())) ?? null;
}

function findSymbols(text: string, store: Store): string[] {
  const symbols = [...new Set(store.holdings.map((h) => h.symbol))];
  return symbols.filter((symbol) => new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
}

export function answerQuestion(raw: string, ctx: AskContext): string {
  const text = raw.trim();
  const lower = text.toLowerCase();
  if (!text) return "Ask about net worth, a budget, a goal, subscriptions, or a ticker.";
  const { model, store, book } = ctx;
  const symbols = findSymbols(text, store);

  if (/\b(help|what can i ask|examples)\b/.test(lower)) {
    return [
      "Try one of these:",
      "• What's my net worth?",
      "• Will I overshoot dining?",
      "• What should I sell?",
      "• What should I buy?",
      "• How much are subscriptions?",
      "• What's the emergency fund gap?",
      "• Price of AAPL",
    ].join("\n");
  }

  if (/\b(sell|trim)\b/.test(lower) && !/\bbuy\b/.test(lower)) {
    const rows = model.alerts.filter((s) => s.action === "sell" || s.action === "trim");
    if (!rows.length) return "No sell or trim rule is firing on the current prices. That can change when the quotes refresh.";
    return rows.map((s) => s.detail).join("\n\n");
  }

  if (/\bbuy\b/.test(lower) || /what should i (add|own)/.test(lower)) {
    const rows = model.alerts.filter((s) => s.action === "buy");
    if (!store.holdings.length) return "There are no holdings yet, so the buy rules have nothing to score. Add a ticker under Investments.";
    if (!rows.length) return "No buy rule is firing on your holdings. Nothing you own cleared momentum, a moving-average cross, or a pullback that is still above the 50-day average.";
    return rows.map((s) => s.detail).join("\n\n");
  }

  if (symbols.length && /\b(price|quote|how is|how's|trading)\b/.test(lower)) {
    return symbols
      .map((symbol) => {
        const quote = book?.bySymbol[symbol];
        if (!quote) return `${symbol}: no live price right now.`;
        return `${quote.name} (${symbol}) is ${money(quote.price)} today, ${pct(quote.dayPct)} versus the prior close. Source: ${quote.source === "nasdaq" ? "Nasdaq" : quote.source === "saved" ? "saved price" : "Yahoo Finance"}.`;
      })
      .join("\n");
  }

  if (/\bnet worth\b/.test(lower) || /\bhow much am i worth\b/.test(lower) || /\bwhat's my worth\b/.test(lower)) {
    if (!store.accounts.length && !store.holdings.length) {
      return "No accounts or holdings are saved yet, so there isn't a net worth to report.";
    }
    const move = model.dayChange == null ? "" : ` Investments moved ${moneySigned(model.dayChange)} today on live prices.`;
    return `Net worth is ${money(model.netWorth, 0)}. Assets ${money(model.assets, 0)}, liabilities ${money(model.liabilities, 0)}. Cash is ${money(model.cash, 0)}, investments ${money(model.investments, 0)}, home equity ${money(model.homeEquity, 0)}.${move} ${model.priced ? "Investment values use live prices." : "Investment values use your cost until a live price loads."}`;
  }

  if (/\bcredit\b/.test(lower)) {
    const score = store.profile.creditScore;
    if (score == null) {
      return "No credit score is saved. This app cannot look one up. You can type one on the dashboard. It is not from a bureau.";
    }
    const prior = store.profile.creditPrior;
    const delta = prior == null ? null : score - prior;
    const versus = delta == null ? "No earlier score is saved." : `${delta >= 0 ? "+" : ""}${delta} versus the prior saved score of ${prior}.`;
    return `The saved score is ${score} (${creditLabel(score)}). ${versus} It is not a bureau score.`;
  }

  if (/\b(subscri|recurring|netflix|bills)\b/.test(lower)) {
    const bills = model.recurring.filter((item) => item.direction === "out");
    const monthly = bills.reduce((sum, item) => sum + item.annual / 12, 0);
    const top = bills.slice(0, 6).map((item) => `${item.merchant} ${money(item.typical)} ${item.cadence}`).join("; ");
    return `Detected ${bills.length} outgoing repeats, about ${money(monthly)} a month and ${money(bills.reduce((s, i) => s + i.annual, 0))} a year. ${top}.`;
  }

  if (/\b(leak|waste|drip)\b/.test(lower)) {
    if (!model.leaks.length) return "No spending leak is flagged this month.";
    return model.leaks.map((leak) => `${leak.title}. ${leak.detail}`).join("\n");
  }

  if (/\b(goal|emergency|italy|trip|principal)\b/.test(lower)) {
    const wanted = model.goals.filter((goal) => lower.includes(goal.name.toLowerCase().split(" ")[0]) || /\bgoals?\b/.test(lower));
    const rows = wanted.length ? wanted : model.goals;
    return rows
      .map((goal) => {
        if (goal.gap <= 0) return `${goal.name} is funded at ${money(goal.current, 0)} of ${money(goal.target, 0)}.`;
        const pace =
          goal.months == null
            ? `${goal.surplusMonth || "Last month"} didn't leave a surplus, so the gap doesn't close on its own.`
            : `${formatMonths(goal.months)} of ${goal.surplusMonth}'s ${money(goal.surplus, 0)} surplus. That surplus can't fund every goal at once.`;
        return `${goal.name} is ${money(goal.current, 0)} of ${money(goal.target, 0)}, a gap of ${money(goal.gap, 0)}. ${pace}`;
      })
      .join("\n");
  }

  const category = findCategory(text, store);
  if (category || /\b(budget|pace|overshoot|spend)\b/.test(lower)) {
    const rows = category ? model.budgets.filter((row) => row.category === category) : model.hotBudgets.length ? model.hotBudgets : model.budgets;
    return rows
      .map((row) => `${row.category}: spent ${money(row.spent)} of ${money(row.limit)}. ${row.message}`)
      .join("\n");
  }

  if (symbols.length) {
    return symbols
      .map((symbol) => {
        const signal = model.signals.find((s) => s.symbol === symbol);
        const quote = book?.bySymbol[symbol];
        if (!quote) return `${symbol}: no live price yet.`;
        return `${quote.name} is ${money(quote.price)} (${pct(quote.dayPct)} today). ${signal ? signal.detail : ""}`.trim();
      })
      .join("\n\n");
  }

  if (/\b(cash|checking|savings)\b/.test(lower)) {
    const rows = store.accounts.filter((a) => a.type === "cash");
    return `Cash accounts total ${money(model.cash, 0)}, including brokerage cash. ${rows.map((a) => `${a.name} ${money(a.balance)}`).join(". ")}.`;
  }

  if (/\b(income|cash flow|savings rate|save)\b/.test(lower)) {
    const flow = model.flows[model.flows.length - 1];
    const last = model.surplus;
    return `${model.monthLabel} so far: income ${money(flow.income)}, spending ${money(flow.expense)}, net ${moneySigned(flow.net)}. Savings rate ${rateText(model.savingsRate)} on a partial month. ${
      last ? `${last.label} surplus was ${money(last.surplus, 0)}.` : ""
    }`;
  }

  return "I can answer from the numbers saved in this browser and the live quotes. Try “what should I sell”, “dining budget”, “net worth”, or “price of AAPL”.";
}
