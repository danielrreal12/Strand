"use client";

import { ArrowUpRight, Wallet } from "lucide-react";
import { useSplicer } from "./provider";
import {
  PAY_PER_NODE,
  STATUS_LABEL,
  billable,
  billingWeeks,
  formatShort,
  money,
} from "@/lib/splicer";

export function BillingView() {
  const splicer = useSplicer();
  const weeks = billingWeeks(splicer.nodes, splicer.today);
  const completed = splicer.nodes.filter((node) => node.status === "completed");
  const receivable = completed.filter((node) => billable(node) && !node.paidDate);
  const byPay = receivable.reduce<Record<string, typeof receivable>>((groups, node) => {
    const key = node.payDate || "Sin fecha";
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
  const detail = completed.filter(billable);

  return (
    <div className="billing-grid">
      <section className="panel weekly-billing">
        <div className="panel-heading">
          <div>
            <h2>Billing por semana</h2>
            <p>$350 USD / nodo</p>
          </div>
        </div>
        <p className="production-rule">Los reasignados y los marcados fuera de billing quedan fuera de producción cobrable. El pago se confirma sólo cuando lo registras.</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>PERIODO DE PRODUCCIÓN</th>
                <th>PAGO PROGRAMADO</th>
                <th>NODOS</th>
                <th>GENERADO USD</th>
                <th>RECIBIDO USD</th>
                <th>POR COBRAR USD</th>
                <th>ESTADO DEL CORTE</th>
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
                  <td>{week.payDate ? formatShort(week.payDate) : "Por confirmar"}</td>
                  <td>{week.count}</td>
                  <td className="amount">{money(week.earned)}</td>
                  <td>{money(week.received)}</td>
                  <td className="amount">{money(week.receivable)}</td>
                  <td>
                    <span className={`pill ${week.end < splicer.today ? "completed" : "progress"}`}>
                      {week.start > splicer.today ? "Próximo" : week.end < splicer.today ? "Periodo terminado" : "En curso"}
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
                  Ver nodos · {formatShort(week.start)} – {formatShort(week.end)} · {week.count} nodos · {money(week.earned)}
                </summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>NODO</th>
                        <th>WISE JOB</th>
                        <th>COMPLETADO</th>
                        <th>PAGO PREVISTO</th>
                        <th>PAGO RECIBIDO</th>
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
                          <td>{node.job || "Sin número WISE"}</td>
                          <td>{formatShort(node.completed)}</td>
                          <td>{formatShort(node.payDate)}</td>
                          <td>{node.paidDate ? formatShort(node.paidDate) : "Pendiente"}</td>
                          <td className="amount">$350</td>
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
                    Asignar fecha de pago a este corte <ArrowUpRight size={14} />
                  </button>
                </div>
              </details>
            ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Próximos pagos</h2>
            <p>Lo que vas a recibir, agrupado por fecha.</p>
          </div>
          <button className="text-button" onClick={() => splicer.openBatch({ mode: "payment", codes: receivable.map((node) => node.code) })}>
            Asignar fecha <ArrowUpRight size={16} />
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
                    <strong>{day === "Sin fecha" ? "Sin fecha de pago" : new Date(`${day}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</strong>
                    <small>
                      {group.length} nodos · {day !== "Sin fecha" && day < splicer.today ? "Pago previsto vencido" : "Pendiente de recibir"}
                    </small>
                  </div>
                  <strong>{money(group.length * PAY_PER_NODE)}</strong>
                </div>
                <div className="chips">
                  {group.map((node) => (
                    <button key={node.code} onClick={() => splicer.setEditing({ ...node })}>
                      {node.code}
                    </button>
                  ))}
                </div>
                <button className="text-button" onClick={() => splicer.openBatch({ mode: "received", codes: group.map((node) => node.code) })}>
                  Registrar pago recibido
                </button>
              </div>
            ))
        ) : (
          <div className="empty">
            <Wallet size={30} />
            <strong>Aquí verás tus próximos pagos</strong>
            <p>
              Registra tus primeros nodos completados
              <br />y asigna la fecha en que te pagarán.
            </p>
          </div>
        )}
      </section>
      <section className="panel production">
        <div className="panel-heading">
          <div>
            <h2>Producción por día</h2>
            <p>El valor del trabajo completado.</p>
          </div>
        </div>
        {Object.keys(byDay).length ? (
          Object.entries(byDay)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([day, group]) => (
              <div className="production-row" key={day}>
                <div>
                  <strong>{new Date(`${day}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</strong>
                  <small>{group.map((node) => node.code).join(" · ")}</small>
                </div>
                <span>
                  {group.length} nodos
                  <strong>{money(group.filter(billable).length * PAY_PER_NODE)}</strong>
                </span>
              </div>
            ))
        ) : (
          <div className="empty">
            <strong>Listo para tu primera jornada</strong>
          </div>
        )}
        <div className="rate">
          <span>Tarifa por nodo</span>
          <strong>
            $350 <small>USD</small>
          </strong>
          <p>Cada nodo completado e incluido en billing suma $350. Los reasignados y los marcados fuera de billing siguen en producción, sin cobro.</p>
        </div>
      </section>
      <section className="panel billing-table">
        <div className="panel-heading">
          <div>
            <h2>Detalle de billing</h2>
            <p>Trabajo, factura y pago en una misma vista.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>NODO / FACTURA</th>
                <th>COMPLETADO</th>
                <th>FACTURACIÓN</th>
                <th>PAGO PREVISTO</th>
                <th>RECIBIDO</th>
                <th>IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((node) => (
                <tr key={node.code}>
                  <td>
                    <button className="node-link" onClick={() => splicer.setEditing({ ...node })}>
                      {node.code}
                    </button>
                    <small className="sub">{node.invoice ? `Factura ${node.invoice}` : node.job || "Sin factura"}</small>
                  </td>
                  <td>{formatShort(node.completed)}</td>
                  <td>
                    <span className="pill completed">{STATUS_LABEL.completed}</span>
                    <small className="sub">{node.invoiceStatus === "pending" ? "Factura pendiente" : node.invoiceStatus === "sent" ? "Factura enviada" : "Factura aprobada"}</small>
                  </td>
                  <td>{formatShort(node.payDate)}</td>
                  <td>{node.paidDate ? formatShort(node.paidDate) : "Pendiente"}</td>
                  <td className="amount">$350</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!detail.length ? <div className="empty">Aún no hay nodos con completado confirmado.</div> : null}
        </div>
        <div className="table-foot">Los pagos se confirman manualmente.</div>
      </section>
    </div>
  );
}
