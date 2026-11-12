import { useState } from "react";
import { useHousehold } from "../context";
import { sliceSeries } from "../derive";
import { creditLabel, money, moneySigned, moneyWhole, pct, signedClass } from "../format";
import { paceFraction } from "../insights";
import { Disclaimer, EditableNumber, EditableText, LineArea, Meter, Tag } from "./ui";
import type { Signal } from "../types";

export function Dashboard({ go }: { go: (view: "investments" | "transactions" | "budget" | "goals" | "advice") => void }) {
  const { store, model, actions, book, loading } = useHousehold();
  const [range, setRange] = useState<"1M" | "3M" | "YTD" | "1Y">("1M");
  const series = sliceSeries(model.netSeries, range);
  const score = store.profile.creditScore;
  const prior = store.profile.creditPrior;
  const delta = score != null && prior != null ? score - prior : null;
  const grouped = groupHoldings(model.holdings);
  const spotlight = pickSpotlight(model.alerts);
  const pace = paceFraction();
  const hasMoney = store.accounts.length > 0 || store.holdings.length > 0;
  const hasSpend = store.transactions.some((tx) => tx.amount < 0);

  return (
    <div className="dashboard">
      <header className="welcome">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>
            <EditableText
              value={store.profile.name}
              ariaLabel="Household name"
              className="name-edit"
              onChange={(name) => actions.setProfile({ name })}
            />
          </h1>
        </div>
        <div className="welcome-meta">
          <span>{model.todayLabel}</span>
          {store.customized && <Tag kind="saved">Saved here</Tag>}
        </div>
      </header>

      {spotlight.length > 0 && (
        <div className="alert-row" data-testid="alerts">
          {spotlight.map((alert) => (
            <button key={alert.symbol} type="button" className={`alert-card ${alert.action}`} data-action={alert.action} onClick={() => go("investments")}>
              <span className={`pill ${alert.action}`}>{alert.action}</span>
              <p>{alert.summary}</p>
            </button>
          ))}
        </div>
      )}
      <Disclaimer compact />

      <div className="dash-grid">
        <section className="stack">
          <article className="card nw-card">
            <div className="nw-top">
              <div>
                <p className="kicker">Net worth</p>
                <p className="nw-value" data-testid="net-worth">
                  {hasMoney ? moneyWhole(model.netWorth) : "—"}
                </p>
                <p className={`delta ${signedClass(model.dayChange)}`}>
                  {!hasMoney
                    ? "Add an account to start"
                    : model.dayChange == null
                      ? "Today's move appears after a holding has a live price"
                      : `${moneySigned(model.dayChange)} today`}
                </p>
              </div>
              <div className="ranges" role="group" aria-label="Chart range">
                {(["1M", "3M", "YTD", "1Y"] as const).map((item) => (
                  <button key={item} type="button" className={range === item ? "on" : ""} onClick={() => setRange(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
            {series.length >= 2 ? (
              <LineArea points={series} color="#8ec5ff" label="Net worth from your saved balances and live prices" />
            ) : (
              <p className="empty">The chart starts after you add accounts or holdings with price history.</p>
            )}
            <p className="caption" data-testid="quote-status">
              {loading ? "Refreshing live prices…" : book?.summary}{" "}
              {store.holdings.length
                ? "The line uses today's share counts at past prices. Cash, home, and loans stay at the balances you saved."
                : "Quotes are requested only for tickers you add."}
            </p>
          </article>

          <article className="card">
            <div className="card-h">
              <h2>Goals</h2>
              <button type="button" className="text-link" onClick={() => go("goals")}>
                All goals
              </button>
            </div>
            {model.goals.length === 0 ? (
              <p className="empty">No goals yet.</p>
            ) : (
              <ul className="goal-list">
                {model.goals.slice(0, 2).map((goal) => (
                  <li key={goal.id}>
                    <div className="row-between">
                      <strong>{goal.name}</strong>
                      <span className="muted">
                        {moneyWhole(goal.current)} of {moneyWhole(goal.target)}
                      </span>
                    </div>
                    <Meter value={goal.current} max={goal.target} />
                    <p className="caption">{goal.gap <= 0 ? "Funded." : `${moneyWhole(goal.gap)} still to go.`}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="card">
            <div className="card-h">
              <h2>Investments · today</h2>
              <div className="row-gap">
                {grouped.length > 0 && <Tag kind={model.priced && !book?.stale ? "live" : "saved"}>{book?.stale ? "Saved" : "Live"}</Tag>}
                <button type="button" className="text-link" onClick={() => go("investments")}>
                  Holdings
                </button>
              </div>
            </div>
            {grouped.length === 0 ? (
              <p className="empty">No holdings yet. Add a ticker to load a live price.</p>
            ) : (
            <ul className="hold-list">
              {grouped.slice(0, 4).map((row) => (
                <li key={row.symbol}>
                  <div>
                    <strong>{row.symbol}</strong>
                    <span>{row.name}</span>
                  </div>
                  <div className="hold-price">
                    <span data-testid={`live-price-${row.symbol}`}>{row.price == null ? "—" : money(row.price)}</span>
                    <span className={signedClass(row.dayPct)}>{row.dayPct == null ? "" : pct(row.dayPct)}</span>
                  </div>
                  <div className="hold-value">
                    <span>{moneyWhole(row.value)}</span>
                    {row.signal && row.signal.action !== "hold" && <em className={`pill ${row.signal.action}`}>{row.signal.action}</em>}
                  </div>
                </li>
              ))}
            </ul>
            )}
          </article>
        </section>

        <section className="stack">
          <article className="card credit-card">
            <div className="card-h">
              <h2>Credit score</h2>
            </div>
            <div className="credit-body">
              {score != null && <Ring score={score} />}
              <div>
                {score == null ? (
                  <CreditEntry onSave={(n) => actions.setProfile({ creditScore: n, creditPrior: null })} />
                ) : (
                  <EditableNumber
                    value={score}
                    min={300}
                    max={850}
                    testId="credit-score"
                    ariaLabel="Credit score"
                    className="credit-score"
                    format={(n) => String(Math.round(n))}
                    onChange={(n) => actions.setProfile({ creditScore: Math.round(n), creditPrior: score })}
                  />
                )}
                <p className="credit-band">{score == null ? "Not entered" : creditLabel(score)}</p>
                {delta != null && <p className={`delta ${signedClass(delta)}`}>{delta > 0 ? `+${delta}` : delta} pts vs the prior score you saved</p>}
              </div>
            </div>
            <p className="caption">Optional. Not from a credit bureau. A score you type stays in this browser.</p>
          </article>

          <article className="card">
            <div className="card-h">
              <h2>Spending · {model.monthLabel}</h2>
              {hasSpend && <span className="muted">{money(model.monthSpend)}</span>}
            </div>
            {model.spendSeries.length >= 2 ? (
              <LineArea points={model.spendSeries} color="#e59a62" label="Spending from your transactions" />
            ) : (
              <p className="empty">No spending recorded this month.</p>
            )}
          </article>

          <article className="card">
            <div className="card-h">
              <h2>Transactions</h2>
              <button type="button" className="text-link" onClick={() => go("transactions")}>
                All
              </button>
            </div>
            {store.transactions.length === 0 ? (
              <p className="empty">No transactions yet.</p>
            ) : (
            <ul className="tx-list">
              {store.transactions.slice(0, 5).map((tx) => (
                <li key={tx.id}>
                  <span className="avatar" aria-hidden="true">
                    {tx.merchant.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{tx.merchant}</strong>
                    <span>{tx.category}</span>
                  </div>
                  <em className={signedClass(tx.amount)}>{moneySigned(tx.amount)}</em>
                </li>
              ))}
            </ul>
            )}
          </article>

          <article className="card">
            <div className="card-h">
              <h2>Budget · {model.monthLabel}</h2>
              <button type="button" className="text-link" onClick={() => go("budget")}>
                Budget
              </button>
            </div>
            {model.budgets.length === 0 ? (
              <p className="empty">No budgets yet.</p>
            ) : (
            <ul className="budget-mini">
              {model.budgets
                .filter((row) => row.kind === "variable")
                .slice(0, 4)
                .map((row) => (
                  <li key={row.category}>
                    <div className="row-between">
                      <span>{row.category}</span>
                      <span className={row.status === "ok" ? "muted" : "down"}>
                        {money(row.spent, 0)} / {money(row.limit, 0)}
                      </span>
                    </div>
                    <div className="meter pace">
                      <span className={row.status === "ok" ? "" : "hot"} style={{ width: `${Math.min(100, (row.spent / row.limit) * 100)}%` }} />
                      <i style={{ left: `${pace * 100}%` }} />
                    </div>
                  </li>
                ))}
            </ul>
            )}
            {model.hotBudgets[0] && <p className="caption warn">{model.hotBudgets[0].message}</p>}
          </article>
        </section>
      </div>
      <p className="footer-link">
        <button type="button" className="text-link" onClick={() => go("advice")}>
          Spending leaks, goal gaps, and the ask box are on Advice.
        </button>
      </p>
    </div>
  );
}

function groupHoldings(rows: import("../derive").HoldingView[]) {
  const map = new Map<string, { symbol: string; name: string; value: number; price: number | null; dayPct: number | null; signal: Signal | null }>();
  for (const row of rows) {
    const current = map.get(row.holding.symbol);
    if (!current) {
      map.set(row.holding.symbol, {
        symbol: row.holding.symbol,
        name: row.name,
        value: row.value,
        price: row.price,
        dayPct: row.dayPct,
        signal: row.signal,
      });
    } else {
      current.value += row.value;
    }
  }
  const rank = { sell: 0, trim: 1, buy: 2, hold: 3 };
  return [...map.values()].sort((a, b) => rank[a.signal?.action ?? "hold"] - rank[b.signal?.action ?? "hold"] || b.value - a.value);
}

function pickSpotlight(alerts: Signal[]): Signal[] {
  const sell = alerts.find((alert) => alert.action === "sell");
  const trim = alerts.find((alert) => alert.action === "trim");
  const buy = alerts.find((alert) => alert.action === "buy");
  const fallback = alerts.find((alert) => alert.action === "sell" || alert.action === "trim");
  return [sell ?? fallback, trim && trim !== (sell ?? fallback) ? trim : undefined, buy].filter((item): item is Signal => Boolean(item));
}

function CreditEntry({ onSave }: { onSave: (score: number) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  if (!open) {
    return (
      <button type="button" className="btn ghost" data-testid="credit-score" onClick={() => setOpen(true)}>
        Enter a score
      </button>
    );
  }
  return (
    <input
      autoFocus
      className="edit-input credit-score"
      data-testid="credit-score-input"
      aria-label="Credit score"
      inputMode="numeric"
      value={draft}
      placeholder="300–850"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const n = Number(draft);
        if (Number.isFinite(n)) onSave(Math.min(850, Math.max(300, Math.round(n))));
        setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") setOpen(false);
      }}
    />
  );
}

function Ring({ score }: { score: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, Math.max(0, score / 850));
  return (
    <svg viewBox="0 0 96 96" className="ring" aria-hidden="true">
      <circle cx="48" cy="48" r={r} className="ring-track" />
      <circle
        cx="48"
        cy="48"
        r={r}
        className="ring-value"
        strokeDasharray={`${c * frac} ${c}`}
        transform="rotate(-90 48 48)"
      />
    </svg>
  );
}
