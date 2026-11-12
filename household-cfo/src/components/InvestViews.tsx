import { useState, type FormEvent } from "react";
import { useHousehold } from "../context";
import { BROAD_SYMBOLS, money, moneySigned, pct, signedClass } from "../format";
import { quoteSourceLabel } from "../market";
import type { Holding } from "../types";
import { AskBox, Disclaimer, EditableNumber, PageHead, Spark, Tag } from "./ui";

export function InvestmentsView() {
  const { store, model, actions, book, loading, refresh } = useHousehold();
  const sells = model.alerts.filter((alert) => alert.action === "sell" || alert.action === "trim");
  const buys = model.alerts.filter((alert) => alert.action === "buy");
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [cost, setCost] = useState("");
  const [accountId, setAccountId] = useState("");
  const accounts = store.accounts.filter((account) => account.type === "investment" || account.type === "retirement");
  const selectedAccount = accountId || accounts[0]?.id || "";

  function addHolding(event: FormEvent) {
    event.preventDefault();
    const ticker = symbol.trim().toUpperCase();
    const shareCount = Number(shares);
    const basis = Number(cost);
    if (!selectedAccount || !/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker) || !Number.isFinite(shareCount) || shareCount <= 0) return;
    const holding: Holding = {
      id: `h-${ticker}-${Date.now()}`,
      accountId: selectedAccount,
      symbol: ticker,
      shares: shareCount,
      costBasis: Number.isFinite(basis) ? basis : 0,
      kind: BROAD_SYMBOLS.has(ticker) ? "etf-broad" : "stock",
    };
    actions.addHolding(holding);
    setSymbol("");
    setShares("");
    setCost("");
  }

  return (
    <div>
      <PageHead
        title="Investments"
        lede="Prices are live public quotes for tickers you add. Signals run only on those holdings, with the reason in plain language."
        extra={
          <button type="button" className="btn ghost" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh prices"}
          </button>
        }
      />
      <p className="status-line" data-testid="quote-status">
        {loading && !book ? "Fetching live prices…" : book?.summary}
      </p>
      <Disclaimer />

      <div className="split">
        <section data-testid="sell-list">
          <h2 className="section-title">When to sell or trim</h2>
          {sells.length === 0 && <p className="empty">No sell or trim rule is firing.</p>}
          {sells.map((alert) => (
            <article key={alert.symbol} className="card signal-card" data-action={alert.action}>
              <div className="card-h">
                <h2>
                  {alert.symbol} <span className="muted">{alert.name}</span>
                </h2>
                <span className={`pill ${alert.action}`}>{alert.action}</span>
              </div>
              <p>{alert.detail}</p>
              <Metrics alert={alert} />
            </article>
          ))}
        </section>
        <section data-testid="buy-list">
          <h2 className="section-title">What to buy</h2>
          {buys.length === 0 && <p className="empty">No buy rule is firing on your holdings.</p>}
          {buys.map((alert) => (
            <article key={alert.symbol} className="card signal-card" data-action={alert.action}>
              <div className="card-h">
                <h2>
                  {alert.symbol} <span className="muted">{alert.name}</span>
                </h2>
                <span className={`pill ${alert.action}`}>{alert.action}</span>
              </div>
              <p>{alert.detail}</p>
              <Metrics alert={alert} />
            </article>
          ))}
        </section>
      </div>

      <article className="card table-card">
        <div className="card-h">
          <h2>Holdings</h2>
          <Tag kind={model.priced && !book?.stale ? "live" : "saved"}>{book?.stale ? "Saved prices" : "Live prices"}</Tag>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Today</th>
                <th>Value</th>
                <th>Gain vs cost</th>
                <th>Shares</th>
                <th>Signal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {model.holdings.map((row) => (
                <tr key={row.holding.id}>
                  <td>
                    <strong>{row.holding.symbol}</strong>
                    <span className="sub">
                      {row.name} · {row.accountName}
                    </span>
                  </td>
                  <td>
                    <span data-testid={`holding-price-${row.holding.id}`}>{row.price == null ? "—" : money(row.price)}</span>
                    {row.source && <span className="sub">{quoteSourceLabel(row.source)}</span>}
                  </td>
                  <td className={signedClass(row.dayPct)}>{row.dayPct == null ? "—" : pct(row.dayPct)}</td>
                  <td>
                    {money(row.value, 0)}
                    <Spark values={row.spark} up={(row.dayPct ?? 0) >= 0} />
                  </td>
                  <td className={signedClass(row.gain)}>
                    {moneySigned(row.gain, 0)}
                    <span className="sub">Cost {money(row.cost, 0)}</span>
                  </td>
                  <td>
                    <EditableNumber
                      value={row.holding.shares}
                      min={0}
                      ariaLabel={`${row.holding.symbol} shares`}
                      format={(n) => String(Math.round(n * 1000) / 1000)}
                      onChange={(n) => actions.setHolding(row.holding.id, { shares: n })}
                    />
                  </td>
                  <td>{row.signal && <span className={`pill ${row.signal.action}`}>{row.signal.action}</span>}</td>
                  <td>
                    <button type="button" className="text-link" onClick={() => actions.removeHolding(row.holding.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="filters" onSubmit={addHolding}>
          <input value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="Ticker" aria-label="Ticker" />
          <input value={shares} onChange={(event) => setShares(event.target.value)} inputMode="decimal" placeholder="Shares" aria-label="Shares" />
          <input value={cost} onChange={(event) => setCost(event.target.value)} inputMode="decimal" placeholder="Cost per share" aria-label="Cost per share" />
          <select value={selectedAccount} onChange={(event) => setAccountId(event.target.value)} aria-label="Account">
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <button className="btn" type="submit">
            Add holding
          </button>
        </form>
        {accounts.length === 0 && <p className="empty">Add a brokerage or retirement account before a holding.</p>}
        <p className="caption">
          Rules run only on holdings you add. A broken trend (under both averages, at least 15% off the high, and down at least 8% over 20 sessions) is a sell. A single stock at 25% or more of its account is a trim, or a sell at half the account. A 20-day average crossing the 50-day, strong momentum near the high, or a 12–30% pullback still above the 50-day is a buy when the position is under 12% of the account. Broad funds skip the single-stock cap.
        </p>
      </article>
    </div>
  );
}

function Metrics({ alert }: { alert: import("../types").Signal }) {
  const chips = [
    alert.ret20 != null ? `20d ${pct(alert.ret20, 0)}` : null,
    alert.ret60 != null ? `60d ${pct(alert.ret60, 0)}` : null,
    alert.drawdown != null ? `off high ${pct(alert.drawdown, 0)}` : null,
    alert.weightAccount != null ? `${Math.round(alert.weightAccount * 100)}% of ${alert.accountName ?? "account"}` : null,
    alert.maCross === "golden" ? "20-day crossed above 50-day" : alert.maCross === "death" ? "20-day crossed below 50-day" : null,
  ].filter((chip): chip is string => Boolean(chip));
  return (
    <ul className="chips">
      {chips.map((chip) => (
        <li key={chip}>{chip}</li>
      ))}
    </ul>
  );
}

export function AdviceView() {
  const { model, book, loading } = useHousehold();
  return (
    <div>
      <PageHead
        title="Advice"
        lede="A household read of your saved numbers plus the live quotes. The alerts are the same rules as Investments."
      />
      <Disclaimer />
      <p className="status-line">{loading && !book ? "Fetching live prices…" : book?.summary}</p>
      <AskBox />
      <section className="stack">
        <h2 className="section-title">Alerts</h2>
        <div className="alert-row" data-testid="alerts">
          {model.alerts.map((alert) => (
            <article key={`${alert.action}-${alert.symbol}`} className={`alert-card ${alert.action}`} data-action={alert.action}>
              <span className={`pill ${alert.action}`}>{alert.action}</span>
              <p>{alert.detail}</p>
            </article>
          ))}
        </div>
        {model.alerts.length === 0 && <p className="empty">No buy, trim, or sell is firing. Add a holding first.</p>}
      </section>
      <div className="split">
        <article className="card">
          <div className="card-h">
            <h2>Spending leaks</h2>
          </div>
          <ul className="leak-list">
            {model.leaks.map((leak) => (
              <li key={leak.id}>
                <strong>{leak.title}</strong>
                <p>{leak.detail}</p>
              </li>
            ))}
          </ul>
          {model.leaks.length === 0 && <p className="empty">Nothing looks leaky this month.</p>}
        </article>
        <article className="card">
          <div className="card-h">
            <h2>Goal gaps</h2>
          </div>
          <ul className="leak-list">
            {model.goals.length === 0 && <li className="empty">No goals yet.</li>}
          {model.goals.map((goal) => (
              <li key={goal.id}>
                <strong>{goal.name}</strong>
                <p>
                  {goal.gap <= 0
                    ? "Funded."
                    : `${money(goal.gap, 0)} short of ${money(goal.target, 0)}. ${
                        goal.months == null
                          ? "The last full month had no surplus."
                          : `That's about ${goal.months.toFixed(1)} months of the ${goal.surplusMonth} surplus. One surplus can't close every goal at once.`
                      }`}
                </p>
              </li>
            ))}
          </ul>
        </article>
      </div>
      <article className="card">
        <div className="card-h">
          <h2>How a signal is chosen</h2>
        </div>
        <ol className="rules">
          <li>Momentum: the 20-session and 60-session price change, and whether the price is above the 20-day average.</li>
          <li>Drawdown: how far the price sits under the high of the loaded history, about a year when Yahoo responds.</li>
          <li>Moving-average cross: the 20-day average versus the 50-day, if they flipped in the last 8 sessions.</li>
          <li>Concentration: a single stock at 25% or more of the account it sits in. Total-market and bond funds are not capped that way.</li>
        </ol>
        <p className="caption">A broken trend outranks a buy. Concentration outranks “the stock is going up.” Holds are names with no setup, including broad funds and names the rules say to stay out of.</p>
      </article>
    </div>
  );
}
