"use client";

import { useEffect } from "react";
import { ExternalLink, FileText, MapPin, X } from "lucide-react";
import { NodeNotices } from "./notices";
import { useSplicer } from "./provider";
import {
  CREW_MEMBERS,
  PAY_PER_NODE,
  REVIEW_LABEL,
  STATUS_LABEL,
  activeNodes,
  appleMaps,
  formatShort,
  googleSearch,
  money,
  type CrewName,
  type InvoiceStatus,
  type NodeStatus,
  type SplicerNode,
} from "@/lib/splicer";

export function Modals() {
  const splicer = useSplicer();
  useEffect(() => {
    if (!splicer.editing && !splicer.batchOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !splicer.saving) {
        splicer.setEditing(null);
        splicer.closeBatch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [splicer]);

  return (
    <>
      {splicer.editing ? <NodeModal node={splicer.editing} /> : null}
      {splicer.batchOpen ? <BatchModal /> : null}
    </>
  );
}

function NodeModal({ node }: { node: SplicerNode }) {
  const splicer = useSplicer();
  const setNode = splicer.setEditing;

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (node.status === "completed" && !node.completed) {
      splicer.setError("The completion date is required.");
      return;
    }
    splicer.saveChanges([node.code], {
      status: node.status,
      completed: node.completed,
      scheduled: node.scheduled,
      payDate: node.payDate,
      paidDate: node.paidDate,
      notes: node.notes,
      invoice: node.invoice,
      job: node.job,
      invoiceStatus: node.invoiceStatus,
      address: node.address,
      reviewStatus: node.reviewStatus,
      billingIncluded: node.billingIncluded,
      completedBy: node.completedBy || "",
    });
  }

  return (
    <div className="overlay" onClick={() => !splicer.saving && splicer.setEditing(null)}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={`Edit ${node.code}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">NODE SHEET</span>
            <h2>{node.code}</h2>
          </div>
          <button aria-label="Close" onClick={() => splicer.setEditing(null)}>
            <X />
          </button>
        </div>
        <NodeNotices node={node} />
        <div className="modal-links">
          {node.map ? (
            <a href={`/maps/${encodeURIComponent(node.map)}`} target="_blank" rel="noreferrer">
              <FileText size={16} />
              Open map PDF
            </a>
          ) : null}
          {node.gps ? (
            <a href={googleSearch(node.gps)} target="_blank" rel="noreferrer">
              <MapPin size={16} />
              Go to node
            </a>
          ) : null}
          {node.gps ? (
            <a href={appleMaps(node)} target="_blank" rel="noreferrer">
              <MapPin size={16} />
              Apple Maps
            </a>
          ) : null}
          {node.gps ? (
            <button
              className="text-button"
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(node.gps).then(
                  () => splicer.showToast("Coordinates copied"),
                  () => splicer.showToast(node.gps),
                );
              }}
            >
              Copy coordinates
            </button>
          ) : null}
          {node.source ? (
            <a href={`https://mail.google.com/mail/u/?authuser=armzglz%40gmail.com#all/${node.source}`} target="_blank" rel="noreferrer">
              Original email <ExternalLink size={14} />
            </a>
          ) : null}
        </div>
        <div className="info-line">
          Start: {formatShort(node.start)} · Due: {formatShort(node.due)} {node.night ? "· Night only 00:00–06:00" : ""}
        </div>
        <form onSubmit={save}>
          <p className="production-rule">Mark a node complete only from a confirmed production report.</p>
          <div className="form-grid">
            <label>
              Status
              <select
                disabled={node.status === "excluded"}
                value={node.status}
                onChange={(event) => {
                  const status = event.target.value as NodeStatus;
                  setNode({
                    ...node,
                    status,
                    ...(status === "completed" ? { completedBy: node.completedBy || splicer.person } : { completed: "", payDate: "", paidDate: "", completedBy: "" }),
                  });
                }}
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Scheduled date
              <input type="date" min={node.start || undefined} value={node.scheduled} onChange={(event) => setNode({ ...node, scheduled: event.target.value })} />
            </label>
            <label>
              Completed by
              <select
                value={node.completedBy || ""}
                onChange={(event) => setNode({ ...node, completedBy: event.target.value as CrewName | "" })}
              >
                <option value="">Not recorded</option>
                {CREW_MEMBERS.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <small>Daniel and Iván split each day’s $350 nodes in half. Chris is paid $300 for his own nodes.</small>
            </label>
            <label>
              Completion date
              <input type="date" disabled={node.status !== "completed"} required={node.status === "completed"} value={node.completed} onChange={(event) => setNode({ ...node, completed: event.target.value })} />
            </label>
            <label>
              Expected pay
              <input type="date" disabled={node.status !== "completed"} min={node.completed || undefined} value={node.payDate} onChange={(event) => setNode({ ...node, payDate: event.target.value })} />
            </label>
            <label>
              Payment received (confirmed)
              <input type="date" disabled={node.status !== "completed"} min={node.completed || undefined} value={node.paidDate} onChange={(event) => setNode({ ...node, paidDate: event.target.value })} />
            </label>
            <label>
              Invoice status
              <select value={node.invoiceStatus} onChange={(event) => setNode({ ...node, invoiceStatus: event.target.value as InvoiceStatus })}>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="approved">Approved</option>
              </select>
            </label>
            <label>
              Invoice number
              <input value={node.invoice} onChange={(event) => setNode({ ...node, invoice: event.target.value })} />
            </label>
            <label>
              Wise Job #
              <input value={node.job} onChange={(event) => setNode({ ...node, job: event.target.value })} />
            </label>
            <label className="wide">
              Address / reference
              <input value={node.address} onChange={(event) => setNode({ ...node, address: event.target.value })} />
            </label>
            <label>
              Include in billing
              <select value={node.billingIncluded === false ? "no" : "yes"} onChange={(event) => setNode({ ...node, billingIncluded: event.target.value === "yes" })}>
                <option value="yes">Yes, billable</option>
                <option value="no">No, out of billing</option>
              </select>
              <small>Completed nodes kept out of billing stay on the production record. Completed nodes drop off the route.</small>
            </label>
            <label className="wide">
              Follow-up
              <select value={node.reviewStatus || ""} onChange={(event) => setNode({ ...node, reviewStatus: event.target.value })}>
                <option value="">No extra note</option>
                <option value="review_data">Review data</option>
                <option value="check_reassignment">Check reassignment</option>
              </select>
              <small>This note does not change production status. A missing map is flagged on its own.</small>
            </label>
            <label className="wide">
              Notes
              <textarea rows={4} value={node.notes} onChange={(event) => setNode({ ...node, notes: event.target.value })} />
            </label>
          </div>
          {splicer.error ? (
            <p className="form-error" role="alert">
              {splicer.error}
            </p>
          ) : null}
          <div className="modal-footer">
            <span>{REVIEW_LABEL[node.reviewStatus] || "No note"}</span>
            <button className="primary" type="submit" disabled={splicer.saving}>
              {splicer.saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BatchModal() {
  const splicer = useSplicer();
  const active = activeNodes(splicer.nodes);
  const choices = active.filter((node) =>
    splicer.batchMode === "payment" || splicer.batchMode === "received" ? node.status === "completed" && !node.paidDate : node.status !== "completed",
  );
  const dateLabel =
    splicer.batchMode === "complete" ? "Completion date" : splicer.batchMode === "schedule" ? "Work date" : splicer.batchMode === "payment" ? "Expected pay date" : "Date the payment arrived";

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (splicer.batchMode === "complete") {
      splicer.saveChanges(splicer.selectedCodes, {
        status: "completed",
        completed: splicer.batchDate,
        completedBy: splicer.batchPerson,
        ...(splicer.batchPay ? { payDate: splicer.batchPay } : {}),
      });
      return;
    }
    if (splicer.batchMode === "payment") {
      splicer.saveChanges(splicer.selectedCodes, { payDate: splicer.batchDate });
      return;
    }
    if (splicer.batchMode === "received") {
      splicer.saveChanges(splicer.selectedCodes, { paidDate: splicer.batchDate });
      return;
    }
    splicer.saveChanges(splicer.selectedCodes, { scheduled: splicer.batchDate });
  }

  return (
    <div className="overlay" onClick={() => !splicer.saving && splicer.closeBatch()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label="Log a day" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">BATCH UPDATE</span>
            <h2>Log a day</h2>
          </div>
          <button aria-label="Close" onClick={splicer.closeBatch}>
            <X />
          </button>
        </div>
        <form onSubmit={save}>
          <div className="form-grid">
            <label className="wide">
              What do you want to record
              <select value={splicer.batchMode} onChange={(event) => splicer.setBatchMode(event.target.value as typeof splicer.batchMode)}>
                <option value="complete">Nodes completed</option>
                <option value="schedule">Schedule work</option>
                <option value="payment">Expected pay date</option>
                <option value="received">Payment received and confirmed</option>
              </select>
            </label>
            <label>
              {dateLabel}
              <input type="date" required value={splicer.batchDate} onChange={(event) => splicer.setBatchDate(event.target.value)} />
            </label>
            {splicer.batchMode === "complete" ? (
              <>
                <label>
                  Completed by
                  <select value={splicer.batchPerson} onChange={(event) => splicer.setBatchPerson(event.target.value as CrewName)}>
                    {CREW_MEMBERS.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Expected pay (optional)
                  <input type="date" min={splicer.batchDate} value={splicer.batchPay} onChange={(event) => splicer.setBatchPay(event.target.value)} />
                </label>
              </>
            ) : null}
          </div>
          <p className="production-rule">Select only the nodes on your production report.</p>
          <p className="select-heading">
            Select nodes <span>{splicer.selectedCodes.length} selected</span>
          </p>
          <div className="node-picker">
            {choices.map((node) => (
              <label key={node.code} className={splicer.selectedCodes.includes(node.code) ? "chosen" : ""}>
                <input type="checkbox" checked={splicer.selectedCodes.includes(node.code)} onChange={() => splicer.toggleCode(node.code)} />
                {node.code}
              </label>
            ))}
          </div>
          {!choices.length ? <p>No completed nodes are waiting on payment.</p> : null}
          {splicer.error ? (
            <p className="form-error" role="alert">
              {splicer.error}
            </p>
          ) : null}
          <div className="modal-footer">
            <span>
              {splicer.selectedCodes.length} nodes · <strong>{money(splicer.selectedCodes.length * PAY_PER_NODE)}</strong>
            </span>
            <button className="primary" type="submit" disabled={splicer.saving || !splicer.selectedCodes.length}>
              {splicer.saving ? "Saving…" : "Save record"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
