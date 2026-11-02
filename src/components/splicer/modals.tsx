"use client";

import { useEffect } from "react";
import { ExternalLink, FileText, MapPin, X } from "lucide-react";
import { NodeNotices } from "./notices";
import { useSplicer } from "./provider";
import {
  PAY_PER_NODE,
  REVIEW_LABEL,
  STATUS_LABEL,
  activeNodes,
  appleMaps,
  formatShort,
  googleSearch,
  money,
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
      splicer.setError("La fecha de completado es obligatoria.");
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
    });
  }

  return (
    <div className="overlay" onClick={() => !splicer.saving && splicer.setEditing(null)}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={`Editar ${node.code}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">FICHA DEL NODO</span>
            <h2>{node.code}</h2>
          </div>
          <button aria-label="Cerrar" onClick={() => splicer.setEditing(null)}>
            <X />
          </button>
        </div>
        <NodeNotices node={node} />
        <div className="modal-links">
          {node.map ? (
            <a href={`/maps/${encodeURIComponent(node.map)}`} target="_blank" rel="noreferrer">
              <FileText size={16} />
              Abrir mapa PDF
            </a>
          ) : null}
          {node.gps ? (
            <a href={googleSearch(node.gps)} target="_blank" rel="noreferrer">
              <MapPin size={16} />
              Ir al nodo
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
                  () => splicer.showToast("Coordenadas copiadas"),
                  () => splicer.showToast(node.gps),
                );
              }}
            >
              Copiar coordenadas
            </button>
          ) : null}
          {node.source ? (
            <a href={`https://mail.google.com/mail/u/?authuser=armzglz%40gmail.com#all/${node.source}`} target="_blank" rel="noreferrer">
              Correo original <ExternalLink size={14} />
            </a>
          ) : null}
        </div>
        <div className="info-line">
          Inicio: {formatShort(node.start)} · Límite: {formatShort(node.due)} {node.night ? "· Sólo 00:00–06:00" : ""}
        </div>
        <form onSubmit={save}>
          <p className="production-rule">Completar únicamente con el reporte de producción confirmado por Alex.</p>
          <div className="form-grid">
            <label>
              Estado
              <select
                disabled={node.status === "excluded"}
                value={node.status}
                onChange={(event) => {
                  const status = event.target.value as NodeStatus;
                  setNode({
                    ...node,
                    status,
                    ...(status === "completed" ? {} : { completed: "", payDate: "", paidDate: "" }),
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
              Fecha programada
              <input type="date" min={node.start || undefined} value={node.scheduled} onChange={(event) => setNode({ ...node, scheduled: event.target.value })} />
            </label>
            <label>
              Fecha de completado
              <input type="date" disabled={node.status !== "completed"} required={node.status === "completed"} value={node.completed} onChange={(event) => setNode({ ...node, completed: event.target.value })} />
            </label>
            <label>
              Pago esperado
              <input type="date" disabled={node.status !== "completed"} min={node.completed || undefined} value={node.payDate} onChange={(event) => setNode({ ...node, payDate: event.target.value })} />
            </label>
            <label>
              Pago recibido (confirmado)
              <input type="date" disabled={node.status !== "completed"} min={node.completed || undefined} value={node.paidDate} onChange={(event) => setNode({ ...node, paidDate: event.target.value })} />
            </label>
            <label>
              Estado de factura
              <select value={node.invoiceStatus} onChange={(event) => setNode({ ...node, invoiceStatus: event.target.value as InvoiceStatus })}>
                <option value="pending">Pendiente</option>
                <option value="sent">Enviada</option>
                <option value="approved">Aprobada</option>
              </select>
            </label>
            <label>
              Número de factura
              <input value={node.invoice} onChange={(event) => setNode({ ...node, invoice: event.target.value })} />
            </label>
            <label>
              Wise Job #
              <input value={node.job} onChange={(event) => setNode({ ...node, job: event.target.value })} />
            </label>
            <label className="wide">
              Dirección / referencia
              <input value={node.address} onChange={(event) => setNode({ ...node, address: event.target.value })} />
            </label>
            <label>
              Incluir en billing
              <select value={node.billingIncluded === false ? "no" : "yes"} onChange={(event) => setNode({ ...node, billingIncluded: event.target.value === "yes" })}>
                <option value="yes">Sí, facturable</option>
                <option value="no">No, fuera de billing</option>
              </select>
              <small>Los completados fuera de billing siguen registrados como producción; los completados no entran al routing.</small>
            </label>
            <label className="wide">
              Aviso de seguimiento
              <select value={node.reviewStatus || ""} onChange={(event) => setNode({ ...node, reviewStatus: event.target.value })}>
                <option value="">Sin aviso adicional</option>
                <option value="review_data">Revisar datos</option>
                <option value="check_reassignment">Consultar reasignación</option>
              </select>
              <small>Este aviso no cambia el estado de producción. El mapa pendiente se identifica automáticamente.</small>
            </label>
            <label className="wide">
              Notas
              <textarea rows={4} value={node.notes} onChange={(event) => setNode({ ...node, notes: event.target.value })} />
            </label>
          </div>
          {splicer.error ? (
            <p className="form-error" role="alert">
              {splicer.error}
            </p>
          ) : null}
          <div className="modal-footer">
            <span>{REVIEW_LABEL[node.reviewStatus] || "Sin aviso"}</span>
            <button className="primary" type="submit" disabled={splicer.saving}>
              {splicer.saving ? "Guardando…" : "Guardar cambios"}
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
    splicer.batchMode === "complete" ? "Fecha de completado" : splicer.batchMode === "schedule" ? "Fecha de trabajo" : splicer.batchMode === "payment" ? "Fecha de pago previsto" : "Fecha real del pago";

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (splicer.batchMode === "complete") {
      splicer.saveChanges(splicer.selectedCodes, {
        status: "completed",
        completed: splicer.batchDate,
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
      <section className="modal" role="dialog" aria-modal="true" aria-label="Registrar jornada" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">ACTUALIZACIÓN POR LOTE</span>
            <h2>Registrar jornada</h2>
          </div>
          <button aria-label="Cerrar" onClick={splicer.closeBatch}>
            <X />
          </button>
        </div>
        <form onSubmit={save}>
          <div className="form-grid">
            <label className="wide">
              Qué quieres registrar
              <select value={splicer.batchMode} onChange={(event) => splicer.setBatchMode(event.target.value as typeof splicer.batchMode)}>
                <option value="complete">Nodos completados</option>
                <option value="schedule">Programar trabajo</option>
                <option value="payment">Fecha de pago esperado</option>
                <option value="received">Pago recibido y confirmado</option>
              </select>
            </label>
            <label>
              {dateLabel}
              <input type="date" required value={splicer.batchDate} onChange={(event) => splicer.setBatchDate(event.target.value)} />
            </label>
            {splicer.batchMode === "complete" ? (
              <label>
                Pago esperado (opcional)
                <input type="date" min={splicer.batchDate} value={splicer.batchPay} onChange={(event) => splicer.setBatchPay(event.target.value)} />
              </label>
            ) : null}
          </div>
          <p className="production-rule">Selecciona únicamente los nodos incluidos en tu reporte de producción.</p>
          <p className="select-heading">
            Selecciona los nodos <span>{splicer.selectedCodes.length} seleccionados</span>
          </p>
          <div className="node-picker">
            {choices.map((node) => (
              <label key={node.code} className={splicer.selectedCodes.includes(node.code) ? "chosen" : ""}>
                <input type="checkbox" checked={splicer.selectedCodes.includes(node.code)} onChange={() => splicer.toggleCode(node.code)} />
                {node.code}
              </label>
            ))}
          </div>
          {!choices.length ? <p>No hay nodos completados pendientes de pago.</p> : null}
          {splicer.error ? (
            <p className="form-error" role="alert">
              {splicer.error}
            </p>
          ) : null}
          <div className="modal-footer">
            <span>
              {splicer.selectedCodes.length} nodos · <strong>{money(splicer.selectedCodes.length * PAY_PER_NODE)}</strong>
            </span>
            <button className="primary" type="submit" disabled={splicer.saving || !splicer.selectedCodes.length}>
              {splicer.saving ? "Guardando…" : "Guardar registro"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
