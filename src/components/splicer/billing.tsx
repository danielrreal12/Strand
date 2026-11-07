"use client";

import { ArrowUpRight, Wallet } from "lucide-react";
import { useSplicer } from "./provider";
import { PersonalProductionView } from "./personal-production";
import {
  PAY_PER_NODE,
  STATUS_LABEL,
  billingWeeks,
  crewById,
  formatShort,
  money,
  payableNodes,
  shareAmount,
} from "@/lib/splicer";

export function BillingView() {
  const { person } = useSplicer();
  return person === "Chris" ? <PersonalProductionView /> : <PartnerBillingView />;
}

function PartnerBillingView() {
  const splicer = useSplicer();
  const profile = crewById(splicer.person);
  const partner = splicer.person !== "Chris";
  const own = payableNodes(splicer.nodes, splicer.person);
  const weeks = billingWeeks(splicer.nodes, splicer.today, splicer.person);
  const completed = own.filter((node) => node.status === "completed");
  const receivable = completed.filter((node) => !node.paidDate);
  const byPay = receivable.reduce<Record<string, typeof receivable>>((groups, node) => {
    const key = node.payDate || "No date";
    groups[key] ??= [];
    groups[key].push(node);
    return groups;
  }, {});
  const byDay = completed.reduce<Record<string, typeof completed>>((groups, node) => {
    if (!node.completed) return groups;
    groups[node.completed] ??= [];
    groups[node.completed].push(node);
    return groups;
  }, {});
  const detail = completed;

  async function downloadBackup() {
    const response = await fetch("/api/backup");
    if (!response.ok) {
      splicer.showToast("Couldn’t download the backup");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `optimum-backup-${splicer.today}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function restoreBackup(file: File) {
    const raw = await file.text();
    const response = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: raw });
    const data = (await response.json().catch(() => ({}))) as { error?: string; nodes?: typeof splicer.nodes; routes?: typeof splicer.routePlans };
    if (!response.ok || !data.nodes) {
      splicer.showToast(data.error || "Couldn’t restore that file");
      return;
    }
    splicer.replaceRecords(data.nodes, data.routes ?? {});
    splicer.showToast("Backup restored");
  }

  return (
    <>
    <section className="panel records-panel">
      {splicer.role === "admin" ? (
        <>
          <div>
            <h2>Protect the records</h2>
            <p>Each save updates the server copy. Download a backup you keep. Only your sign-in can restore it.</p>
          </div>
          <button className="primary" type="button" onClick={() => void downloadBackup()}>
            Download backup
          </button>
          <label className="text-button file-button">
            Restore backup
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void restoreBackup(file);
              }}
            />
          </label>
        </>
      ) : (
        <p>You can log the nodes you finished. Daniel confirms payment dates, invoices, and backups.</p>
      )}
    </section>
    <div className="billing-grid">
      <section className="panel weekly-billing">
        <div className="panel-heading">
          <div>
            <h2>Your billing by week</h2>
            <p>{profile.name} · half of each day’s $350 nodes with {splicer.person === "Daniel" ? "Iván" : "Daniel"}</p>
          </div>
        </div>
        <p className="production-rule">
          {partner
            ? `This is your half of the company week. The other board shows the full $350 total for you and ${splicer.person === "Daniel" ? "Iván" : "Daniel"}; this tab is your $175. Chris’s nodes stay separate. A billing week runs Friday through Thursday.`
            : "Production is counted by completion date."}
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>PRODUCTION PERIOD</th>
                <th>SCHEDULED PAY</th>
                <th>NODES</th>
                <th>GENERATED USD</th>
                <th>RECEIVED USD</th>
                <th>TO COLLECT USD</th>
                <th>CUT STATUS</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week.start}>
                  <td>
                    <strong className="week-range">
                      {formatShort(week.start)} – {formatShort(week.end)} {week.end.slice(0, 4)}
                    </strong>
                    <small className="sub">{week.label}</small>
                  </td>
                  <td>{week.payDate ? formatShort(week.payDate) : "To confirm"}</td>
                  <td>{week.count}</td>
                  <td className="amount">{money(week.earned)}</td>
                  <td>{money(week.received)}</td>
                  <td className="amount">{money(week.receivable)}</td>
                  <td>
                    <span className={`pill ${week.end < splicer.today ? "completed" : "progress"}`}>
                      {week.start > splicer.today ? "Upcoming" : week.end < splicer.today ? "Cut closed" : "In progress"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="weekly-details">
          {weeks
            .filter((week) => week.count > 0)
            .map((week) => (
              <details key={week.start}>
                <summary>
                  View nodes · {formatShort(week.start)} – {formatShort(week.end)} · {week.count} nodes · {money(week.earned)}
                </summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>NODE</th>
                        <th>WISE JOB</th>
                        <th>COMPLETED</th>
                        <th>EXPECTED PAY</th>
                        <th>PAYMENT RECEIVED</th>
                        <th>USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {week.nodes.map((node) => (
                        <tr key={node.code}>
                          <td>
                            <button className="node-link" onClick={() => splicer.setEditing({ ...node })}>
                              {node.code}
                            </button>
                          </td>
                          <td>{node.job || "No Wise number"}</td>
                          <td>{formatShort(node.completed)}</td>
                          <td>{formatShort(node.payDate)}</td>
                          <td>{node.paidDate ? formatShort(node.paidDate) : "Pending"}</td>
                          <td className="amount">{money(shareAmount(node, splicer.person))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="weekly-actions">
                  <button
                    className="text-button"
                    disabled={!week.receivable}
                    onClick={() =>
                      splicer.openBatch({
                        mode: "payment",
                        codes: week.nodes.filter((node) => !node.paidDate).map((node) => node.code),
                      })
                    }
                  >
                    Set a pay date for this cut <ArrowUpRight size={14} />
                  </button>
                </div>
              </details>
            ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Your upcoming payments</h2>
            <p>What you’ll receive, grouped by date.</p>
          </div>
          <button className="text-button" onClick={() => splicer.openBatch({ mode: "payment", codes: receivable.map((node) => node.code) })}>
            Set date <ArrowUpRight size={16} />
          </button>
        </div>
        {Object.keys(byPay).length ? (
          Object.entries(byPay)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([day, group]) => (
              <div className="payment-group" key={day}>
                <div className="payment-day">
                  <span className="payment-icon">
                    <Wallet size={20} />
                  </span>
                  <div>
                    <strong>{day === "No date" ? "No pay date" : new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</strong>
                    <small>
                      {group.length} nodes · {day !== "No date" && day < splicer.today ? "Expected pay overdue" : "Waiting to be received"}
                    </small>
                  </div>
                  <strong>{money(group.reduce((sum, node) => sum + shareAmount(node, splicer.person), 0))}</strong>
                </div>
                <div className="chips">
                  {group.map((node) => (
                    <button key={node.code} onClick={() => splicer.setEditing({ ...node })}>
                      {node.code}
                    </button>
                  ))}
                </div>
                <button className="text-button" onClick={() => splicer.openBatch({ mode: "received", codes: group.map((node) => node.code) })}>
                  Record payment received
                </button>
              </div>
            ))
        ) : (
          <div className="empty">
            <Wallet size={30} />
            <strong>Your payments will show up here</strong>
            <p>
              Log a completed node in your name
              <br />
              and set the date you’ll be paid.
            </p>
          </div>
        )}
      </section>
      <section className="panel production">
        <div className="panel-heading">
          <div>
            <h2>Your production by day</h2>
            <p>The value of work finished in your name.</p>
          </div>
        </div>
        {Object.keys(byDay).length ? (
          Object.entries(byDay)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([day, group]) => (
              <div className="production-row" key={day}>
                <div>
                  <strong>{new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</strong>
                  <small>{group.map((node) => node.code).join(" · ")}</small>
                </div>
                <span>
                  {group.length} nodes
                  <strong>{money(group.reduce((sum, node) => sum + shareAmount(node, splicer.person), 0))}</strong>
                </span>
              </div>
            ))
        ) : (
          <div className="empty">
            <strong>Ready for the first day</strong>
          </div>
        )}
        <div className="rate">
          <span>{partner ? "Your half per node" : "Your rate per node"}</span>
          <strong>
            ${PAY_PER_NODE / 2} <small>USD</small>
          </strong>
          <p>
            {partner
              ? `Every node you or ${splicer.person === "Daniel" ? "Iván" : "Daniel"} finish is $350. That day’s total is split in half, so each node on this page is your $175.`
              : "Your production is tracked by completed node count."}
          </p>
        </div>
      </section>
      <section className="panel billing-table">
        <div className="panel-heading">
          <div>
            <h2>Your billing detail</h2>
            <p>Your work, invoice, and pay. Other people’s totals stay hidden.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>NODE / INVOICE</th>
                <th>COMPLETED</th>
                <th>INVOICE</th>
                <th>EXPECTED PAY</th>
                <th>RECEIVED</th>
                <th>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((node) => (
                <tr key={node.code}>
                  <td>
                    <button className="node-link" onClick={() => splicer.setEditing({ ...node })}>
                      {node.code}
                    </button>
                    <small className="sub">{node.invoice ? `Invoice ${node.invoice}` : node.job || "No invoice"}</small>
                  </td>
                  <td>{formatShort(node.completed)}</td>
                  <td>
                    <span className="pill completed">{STATUS_LABEL.completed}</span>
                    <small className="sub">{node.invoiceStatus === "pending" ? "Invoice pending" : node.invoiceStatus === "sent" ? "Invoice sent" : "Invoice approved"}</small>
                  </td>
                  <td>{formatShort(node.payDate)}</td>
                  <td>{node.paidDate ? formatShort(node.paidDate) : "Pending"}</td>
                  <td className="amount">{money(shareAmount(node, splicer.person))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!detail.length ? <div className="empty">No confirmed completions in your name yet.</div> : null}
        </div>
        <div className="table-foot">Payments are confirmed manually.</div>
      </section>
    </div>
    </>
  );
}
