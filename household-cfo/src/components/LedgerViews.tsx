import { useMemo, useState, type FormEvent } from "react";
import { useHousehold } from "../context";
import { CATEGORIES, formatDay, formatMonth, isoDate, money, moneySigned, moneyWhole, signedClass, utcToday } from "../format";
import { paceFraction, rateText } from "../insights";
import type { Account, AccountType, Transaction } from "../types";
import { EditableNumber, LineArea, Meter, PageHead, Tag } from "./ui";

const TYPE_LABEL: Record<Account["type"], string> = {
  cash: "Cash",
  investment: "Brokerage",
  retirement: "Retirement",
  property: "Property",
  loan: "Loan",
  credit: "Credit card",
};

export function AccountsView() {
  const { store, model, actions } = useHousehold();
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [type, setType] = useState<AccountType>("cash");
  const [balance, setBalance] = useState("");
  const owed = type === "loan" || type === "credit";

  function add(event: FormEvent) {
    event.preventDefault();
    const n = Number(balance);
    if (!name.trim() || !Number.isFinite(n)) return;
    actions.addAccount({
      id: `acct-${Date.now()}`,
      name: name.trim(),
      institution: institution.trim() || "—",
      type,
      balance: owed ? -Math.abs(n) : n,
    });
    setName("");
    setInstitution("");
    setBalance("");
  }

  return (
    <div>
      <PageHead
        title="Accounts"
        lede="Balances are saved in this browser. Brokerage and retirement totals add live market value on top of the cash you enter."
        extra={store.customized ? <Tag kind="saved">Saved here</Tag> : undefined}
      />
      {store.accounts.length > 0 && (
        <div className="stat-row">
          <Stat label="Assets" value={moneyWhole(model.assets)} />
          <Stat label="Liabilities" value={moneyWhole(model.liabilities)} />
          <Stat label="Net worth" value={moneyWhole(model.netWorth)} />
        </div>
      )}
      <div className="card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th>Holdings</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {model.accounts.map((row) => {
                const investable = row.account.type === "investment" || row.account.type === "retirement";
                return (
                  <tr key={row.account.id}>
                    <td>
                      <strong>{row.account.name}</strong>
                      <span className="sub">{row.account.institution}</span>
                    </td>
                    <td>{TYPE_LABEL[row.account.type]}</td>
                    <td>{investable ? moneyWhole(row.holdingsValue) : "—"}</td>
                    <td>
                      <EditableNumber
                        value={row.account.type === "loan" || row.account.type === "credit" ? Math.abs(row.account.balance) : row.account.balance}
                        ariaLabel={`${row.account.name} balance`}
                        format={(n) => money(row.account.type === "loan" || row.account.type === "credit" ? -Math.abs(n) : n)}
                        className={row.account.type === "loan" || row.account.type === "credit" ? "down" : ""}
                        onChange={(n) =>
                          actions.setAccount(row.account.id, {
                            balance: row.account.type === "loan" || row.account.type === "credit" ? -Math.abs(n) : n,
                          })
                        }
                      />
                      {investable && <span className="sub">Cash sleeve. Total {moneyWhole(row.total)}</span>}
                      {row.account.type === "property" && <span className="sub">Your estimate, not an appraisal</span>}
                      <button type="button" className="text-link" onClick={() => actions.removeAccount(row.account.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {store.accounts.length === 0 && <p className="empty">No accounts yet.</p>}
      </div>
      <form className="filters" onSubmit={add}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Account name" aria-label="Account name" />
        <input value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="Institution" aria-label="Institution" />
        <select value={type} onChange={(event) => setType(event.target.value as AccountType)} aria-label="Account type">
          {(Object.keys(TYPE_LABEL) as AccountType[]).map((item) => (
            <option key={item} value={item}>
              {TYPE_LABEL[item]}
            </option>
          ))}
        </select>
        <input value={balance} onChange={(event) => setBalance(event.target.value)} inputMode="decimal" placeholder={owed ? "Amount owed" : "Balance"} aria-label="Balance" />
        <button className="btn" type="submit">
          Add account
        </button>
      </form>
    </div>
  );
}

export function TransactionsView() {
  const { store, actions } = useHousehold();
  const months = useMemo(() => [...new Set(store.transactions.map((tx) => tx.date.slice(0, 7)))], [store.transactions]);
  const [month, setMonth] = useState(months[0] ?? "");
  const [query, setQuery] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[6]);
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"out" | "in">("out");
  const today = utcToday();
  const [date, setDate] = useState(isoDate(today.y, today.m, today.d));

  const rows = store.transactions.filter((tx) => {
    if (month && !tx.date.startsWith(month)) return false;
    if (query && !`${tx.merchant} ${tx.category}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  function add(event: FormEvent) {
    event.preventDefault();
    const n = Number(amount);
    if (!merchant.trim() || !Number.isFinite(n) || n === 0) return;
    const tx: Transaction = {
      id: `tx-user-${Date.now()}`,
      date,
      merchant: merchant.trim(),
      category,
      amount: direction === "out" ? -Math.abs(n) : Math.abs(n),
    };
    actions.addTransaction(tx);
    setMerchant("");
  }

  return (
    <div>
      <PageHead
        title="Transactions"
        lede="The ledger drives budgets, cash flow, and the recurring detector. It does not auto-post into account balances."
        extra={store.transactions.length ? <Tag kind="saved">Saved ledger</Tag> : undefined}
      />
      <form className="filters" onSubmit={add}>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Date" />
        <input value={merchant} onChange={(event) => setMerchant(event.target.value)} placeholder="Merchant" aria-label="Merchant" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
          {CATEGORIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={direction} onChange={(event) => setDirection(event.target.value as "in" | "out")} aria-label="Direction">
          <option value="out">Spent</option>
          <option value="in">Income</option>
        </select>
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="Amount" aria-label="Amount" />
        <button className="btn" type="submit">
          Add
        </button>
      </form>
      <div className="filters">
        <select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Month">
          <option value="">All months</option>
          {months.map((key) => (
            <option key={key} value={key}>
              {formatMonth(key, true)}
            </option>
          ))}
        </select>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search transactions" />
      </div>
      <div className="card table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th>Category</th>
                <th>Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx.id}>
                  <td>{formatDay(tx.date)}</td>
                  <td>{tx.merchant}</td>
                  <td>{tx.category}</td>
                  <td>
                    <EditableNumber
                      value={tx.amount}
                      ariaLabel={`${tx.merchant} amount`}
                      className={signedClass(tx.amount)}
                      format={(n) => moneySigned(n)}
                      onChange={(n) => actions.setTransactionAmount(tx.id, n)}
                    />
                  </td>
                  <td>
                    <button type="button" className="text-link" onClick={() => actions.removeTransaction(tx.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="empty">Nothing in this filter.</p>}
      </div>
    </div>
  );
}

export function CashFlowView() {
  const { store, model } = useHousehold();
  const max = Math.max(1, ...model.flows.flatMap((flow) => [flow.income, flow.expense]));
  return (
    <div>
      <PageHead
        title="Cash flow"
        lede="Income in, spending out, from the ledger you enter. The current month is partial."
      />
      {store.transactions.length === 0 ? (
        <p className="empty">No transactions yet, so there is no cash flow to show.</p>
      ) : (
      <>
      <div className="stat-row">
        <Stat label={`${model.monthLabel} income`} value={money(model.monthIncome)} />
        <Stat label="Spent" value={money(model.monthSpend)} />
        <Stat label="Net" value={moneySigned(model.monthIncome - model.monthSpend)} />
        <Stat label="Savings rate" value={rateText(model.savingsRate)} />
      </div>
      <div className="card flow-card">
        {model.flows.map((flow) => (
          <div key={flow.key} className="flow-col">
            <div className="flow-bars">
              <span className="in" style={{ height: `${(flow.income / max) * 100}%` }} title={`Income ${money(flow.income)}`} />
              <span className="out" style={{ height: `${(flow.expense / max) * 100}%` }} title={`Spending ${money(flow.expense)}`} />
            </div>
            <strong>{flow.label}</strong>
            <em className={signedClass(flow.net)}>{moneyWhole(flow.net)}</em>
            {flow.partial && <span className="sub">Partial</span>}
          </div>
        ))}
      </div>
      <p className="caption">Green is income, rust is spending. The number under each month is the surplus.</p>
      </>
      )}
    </div>
  );
}

export function ReportsView() {
  const { store, model } = useHousehold();
  if (!store.accounts.length && !store.transactions.length) {
    return (
      <div>
        <PageHead title="Reports" lede="A snapshot of the balances and ledger you save here." />
        <p className="empty">Nothing to report until you add an account or a transaction.</p>
      </div>
    );
  }
  const spent = [...model.budgets].sort((a, b) => b.spent - a.spent);
  const max = Math.max(1, ...spent.map((row) => row.spent));
  const groups = [
    ["Cash", model.cash],
    ["Investments", model.investments],
    ["Home equity", model.homeEquity],
    ["Other debt", -model.otherDebt],
  ] as const;
  return (
    <div>
      <PageHead
        title="Reports"
        lede="A snapshot of what the saved balances and this month's ledger add up to."
      />
      <div className="split">
        <article className="card">
          <div className="card-h">
            <h2>Where net worth sits</h2>
          </div>
          <ul className="report-list">
            {groups.map(([label, value]) => (
              <li key={label}>
                <div className="row-between">
                  <span>{label}</span>
                  <strong className={signedClass(value)}>{moneyWhole(value)}</strong>
                </div>
                <Meter value={Math.abs(value)} max={Math.max(model.assets, 1)} hot={value < 0} />
              </li>
            ))}
          </ul>
          <p className="caption">Property plus loans is shown as home equity. Investments use live prices when they have loaded.</p>
        </article>
        <article className="card">
          <div className="card-h">
            <h2>Spent this month</h2>
          </div>
          <ul className="report-list">
            {spent.map((row) => (
              <li key={row.category}>
                <div className="row-between">
                  <span>{row.category}</span>
                  <span>{money(row.spent)}</span>
                </div>
                <Meter value={row.spent} max={max} hot={row.status !== "ok"} />
              </li>
            ))}
          </ul>
        </article>
      </div>
      <article className="card">
        <div className="card-h">
          <h2>Net worth path</h2>
        </div>
        {model.netSeries.length >= 2 ? (
          <LineArea points={model.netSeries.slice(-132)} color="#8ec5ff" label="Net worth over recent history" />
        ) : (
          <p className="empty">The path appears after a holding has price history.</p>
        )}
        <p className="caption">Today's share counts marked to past closes, plus today's cash, home, and loans. It is a reconstruction, not a downloaded statement.</p>
      </article>
    </div>
  );
}

export function BudgetView() {
  const { store, model, actions } = useHousehold();
  const pace = paceFraction();
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [kind, setKind] = useState<"fixed" | "variable">("variable");
  const openCategories = CATEGORIES.filter((item) => item !== "Income" && !store.budgets.some((budget) => budget.category === item));

  function add(event: FormEvent) {
    event.preventDefault();
    const n = Number(limit);
    if (!category || !Number.isFinite(n) || n < 0) return;
    actions.addBudget({ category, limit: n, kind });
    setCategory("");
    setLimit("");
  }

  return (
    <div>
      <PageHead
        title="Budget"
        lede={`${model.monthLabel}. Variable categories project a daily pace. Bills are compared to the limit directly, because they post in a lump.`}
      />
      <form className="filters" onSubmit={add}>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Budget category">
          <option value="">Category</option>
          {openCategories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input value={limit} onChange={(event) => setLimit(event.target.value)} inputMode="decimal" placeholder="Monthly limit" aria-label="Monthly limit" />
        <select value={kind} onChange={(event) => setKind(event.target.value as "fixed" | "variable")} aria-label="Budget kind">
          <option value="variable">Variable</option>
          <option value="fixed">Fixed bill</option>
        </select>
        <button className="btn" type="submit">
          Add budget
        </button>
      </form>
      {model.budgets.length === 0 && <p className="empty">No budgets yet.</p>}
      <div className="budget-grid">
        {model.budgets.map((row) => (
          <article key={row.category} className="card">
            <div className="card-h">
              <h2>{row.category}</h2>
              <span className={`pill ${row.status === "ok" ? "hold" : "sell"}`}>{row.kind}</span>
            </div>
            <p className="budget-spent">
              {money(row.spent)} <span>spent</span>
            </p>
            <div className="meter pace">
              <span className={row.status === "ok" ? "" : "hot"} style={{ width: `${Math.min(100, row.limit ? (row.spent / row.limit) * 100 : 0)}%` }} />
              {row.kind === "variable" && <i style={{ left: `${pace * 100}%` }} />}
            </div>
            <p className="row-between budget-limit">
              <span>Monthly limit</span>
              <EditableNumber
                value={row.limit}
                min={0}
                ariaLabel={`${row.category} budget`}
                format={(n) => money(n, 0)}
                onChange={(n) => actions.setBudgetLimit(row.category, n)}
              />
            </p>
            <p className={row.status === "ok" ? "caption" : "caption warn"}>{row.message}</p>
            <button type="button" className="text-link" onClick={() => actions.removeBudget(row.category)}>
              Remove
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

export function RecurringView() {
  const { model } = useHousehold();
  const bills = model.recurring.filter((item) => item.direction === "out");
  const income = model.recurring.filter((item) => item.direction === "in");
  const annual = bills.reduce((sum, item) => sum + item.annual, 0);
  return (
    <div>
      <PageHead
        title="Recurring"
        lede="Detected from the ledger you enter: same merchant, stable amount, and a regular gap. Nothing here is a bank feed."
      />
      {bills.length === 0 && income.length === 0 ? (
        <p className="empty">Nothing has repeated often enough to count. Add a few months of transactions first.</p>
      ) : (
      <>
      <div className="stat-row">
        <Stat label="Bills detected" value={String(bills.length)} />
        <Stat label="Annualized bills" value={moneyWhole(annual)} />
        <Stat label="About per month" value={money(annual / 12)} />
      </div>
      <RecurringTable title="Bills and subscriptions" rows={bills} />
      <RecurringTable title="Income" rows={income} />
      </>
      )}
    </div>
  );
}

function RecurringTable({ title, rows }: { title: string; rows: import("../insights").RecurringItem[] }) {
  return (
    <article className="card table-card">
      <div className="card-h">
        <h2>{title}</h2>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Merchant</th>
              <th>Cadence</th>
              <th>Typical</th>
              <th>Last</th>
              <th>Next estimate</th>
              <th>Annual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={`${item.merchant}-${item.cadence}`}>
                <td>
                  <strong>{item.merchant}</strong>
                  <span className="sub">{item.category}</span>
                </td>
                <td>{item.cadence}</td>
                <td>{money(item.typical)}</td>
                <td>{formatDay(item.lastDate)}</td>
                <td>{formatDay(item.nextDate, true)}</td>
                <td>{moneyWhole(item.annual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="empty">Nothing repeated often enough to count.</p>}
    </article>
  );
}

export function GoalsView() {
  const { store, model, actions } = useHousehold();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");

  function add(event: FormEvent) {
    event.preventDefault();
    const targetN = Number(target);
    const currentN = Number(current || 0);
    if (!name.trim() || !Number.isFinite(targetN)) return;
    actions.addGoal({
      id: `goal-${Date.now()}`,
      name: name.trim(),
      target: targetN,
      current: linkedAccountId ? 0 : currentN,
      linkedAccountId: linkedAccountId || undefined,
    });
    setName("");
    setTarget("");
    setCurrent("");
    setLinkedAccountId("");
  }

  return (
    <div>
      <PageHead
        title="Goals"
        lede="Gaps use the targets you save. Months-to-go assume last month's entire surplus goes to that one goal, so the goals can't all finish on that schedule together."
      />
      <form className="filters" onSubmit={add}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Goal name" aria-label="Goal name" />
        <input value={target} onChange={(event) => setTarget(event.target.value)} inputMode="decimal" placeholder="Target" aria-label="Target" />
        <input value={current} onChange={(event) => setCurrent(event.target.value)} inputMode="decimal" placeholder="Saved so far" aria-label="Saved so far" disabled={Boolean(linkedAccountId)} />
        <select value={linkedAccountId} onChange={(event) => setLinkedAccountId(event.target.value)} aria-label="Link an account">
          <option value="">Don't link an account</option>
          {store.accounts.filter((account) => account.type === "cash").map((account) => (
            <option key={account.id} value={account.id}>
              Track {account.name}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          Add goal
        </button>
      </form>
      {model.goals.length === 0 && <p className="empty">No goals yet.</p>}
      <div className="budget-grid">
        {model.goals.map((goal) => {
          const raw = store.goals.find((item) => item.id === goal.id);
          return (
            <article key={goal.id} className="card">
              <div className="card-h">
                <h2>{goal.name}</h2>
                {goal.linked && <Tag kind="saved">Tracks savings</Tag>}
              </div>
              <Meter value={goal.current} max={goal.target || 1} />
              <p className="budget-spent">
                {moneyWhole(goal.current)} <span>of {moneyWhole(goal.target)}</span>
              </p>
              <p className="caption">{goal.gap <= 0 ? "This goal is funded." : `${moneyWhole(goal.gap)} gap. ${goal.months == null ? "Last full month had no surplus." : `About ${goal.months.toFixed(1)} months of the ${goal.surplusMonth} surplus (${moneyWhole(goal.surplus)}).`}`}</p>
              <label className="field">
                Target
                <EditableNumber
                  value={raw?.target ?? goal.target}
                  min={0}
                  ariaLabel={`${goal.name} target`}
                  format={(n) => money(n, 0)}
                  onChange={(n) => actions.setGoal(goal.id, { target: n })}
                />
              </label>
              {!goal.linked && (
                <label className="field">
                  Saved so far
                  <EditableNumber
                    value={raw?.current ?? goal.current}
                    min={0}
                    ariaLabel={`${goal.name} saved`}
                    format={(n) => money(n, 0)}
                    onChange={(n) => actions.setGoal(goal.id, { current: n })}
                  />
                </label>
              )}
              {goal.linked && <p className="caption">This follows the linked account balance. Edit that balance on Accounts.</p>}
              <button type="button" className="text-link" onClick={() => actions.removeGoal(goal.id)}>
                Remove
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
