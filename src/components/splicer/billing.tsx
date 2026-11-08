"use client";

import { useState } from "react";
import { CyclePaymentEditor } from "./cycle-payment";
import { MasterBillingSummary } from "./master";
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
  const { person, isMaster } = useSplicer();
  return isMaster ? <><MasterBillingSummary /><PartnerBillingView /></> : person === "Chris" ? <PersonalProductionView /> : <PartnerBillingView />;
}

function PartnerBillingView() {
  const splicer = useSplicer();
  const [selectedPerson, setSelectedPerson] = useState<"Daniel" | "Iván">(splicer.person === "Iván" ? "Iván" : "Daniel");
  const viewer: "Daniel" | "Iván" = splicer.role === "admin" ? selectedPerson : "Iván";
  const profile = crewById(viewer);
  const partner = true;
  const own = payableNodes(splicer.nodes, viewer);
  const weeks = billingWeeks(splicer.nodes, splicer.today, viewer, splicer.cyclePayments);
  const completed = own.filter((node) => node.status === "completed");
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
    const data = (await response.json().catch(() => ({}))) as { error?: string; nodes?: typeof splicer.nodes; routes?: typeof splicer.routePlans; cyclePayments?: typeof splicer.cyclePayments };
    if (!response.ok || !data.nodes) {
      splicer.showToast(data.error || "Couldn’t restore that file");
      return;
    }
    splicer.replaceRecords(data.nodes, data.routes ?? {}, data.cyclePayments ?? {});
    splicer.showToast("Backup restored");
  }

  return (
    <>
    {splicer.role === "admin" ? <section className="panel workspace-panel"><label className="workspace-heading">Billing for<select aria-label="Billing for" value={viewer} onChange={(event) => setSelectedPerson(event.target.value as "Daniel" | "Iván")}><option value="Daniel">Daniel</option><option value="Iván">Iván</option></select></label></section> : null}
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
            <p>{profile.name} · half of each day’s $350 nodes with {viewer === "Daniel" ? "Iván" : "Daniel"}</p>
          </div>
        </div>
        <p className="production-rule">
          {partner
            ? `This is your half of the company week. The other board shows the full $350 total for you and ${viewer === "Daniel" ? "Iván" : "Daniel"}; this tab is your $175. Chris’s nodes stay separate. A billing week runs Friday through Thursday.`
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
                <th>CYCLE / PAYMENT</th>
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
                    <span className="cycle-payment-status">{!week.count ? "No production" : week.received >= week.earned ? "Fully paid" : week.received > 0 ? "Partially paid" : "Unpaid"}</span>
                    {splicer.cyclePayments[`${viewer}:${week.start}`]?.paidDate ? <small className="sub">Received {formatShort(splicer.cyclePayments[`${viewer}:${week.start}`].paidDate)}</small> : null}
                    {splicer.role === "admin" && week.earned > 0 ? <details className="payment-action"><summary>Update payment</summary><CyclePaymentEditor key={`${viewer}:${week.start}:${week.received}`} person={viewer} week={week} payment={splicer.cyclePayments[`${viewer}:${week.start}`]} /></details> : null}
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
                          <td className="amount">{money(shareAmount(node, viewer))}</td>
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
      <section className="panel"><div className="panel-heading"><div><h2>Outstanding cycle balances</h2><p>Remaining amounts after recorded full or partial payments.</p></div></div>
        {weeks.some((week) => week.receivable > 0) ? weeks.filter((week) => week.receivable > 0).map((week) => <div className="payment-group" key={week.start}><div className="payment-day"><span className="payment-icon"><Wallet size={20} /></span><div><strong>{formatShort(week.start)}–{formatShort(week.end)}</strong><small>Scheduled {formatShort(week.payDate)} · Received {money(week.received)}</small></div><strong>{money(week.receivable)}</strong></div><p className="sub">{week.received ? "Partially paid" : "Unpaid"} · {week.count} nodes in this cycle</p></div>) : <div className="empty">No outstanding cycle balances.</div>}
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
                  <strong>{money(group.reduce((sum, node) => sum + shareAmount(node, viewer), 0))}</strong>
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
              ? `Every node you or ${viewer === "Daniel" ? "Iván" : "Daniel"} finish is $350. That day’s total is split in half, so each node on this page is your $175.`
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
                  <td className="amount">{money(shareAmount(node, viewer))}</td>
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
