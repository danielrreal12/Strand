"use client";

import { ExternalLink, FileText, MapPin, Search } from "lucide-react";
import { NodeNotices } from "./notices";
import { useSplicer } from "./provider";
import { STATUS_LABEL, formatShort, googleSearch, urgency } from "@/lib/splicer";

export function NodesView() {
  const splicer = useSplicer();
  const visible = splicer.nodes.filter((node) => {
    const matchesFilter =
      splicer.filter === "map_pending"
        ? node.status !== "excluded" && !node.map
        : splicer.filter === "review"
          ? node.status !== "excluded" && Boolean(node.reviewStatus)
          : splicer.filter === "all"
            ? node.status !== "excluded"
            : node.status === splicer.filter;
    const haystack = `${node.code} ${node.gps} ${node.address} ${node.invoice} ${node.job}`.toLowerCase();
    return matchesFilter && (!splicer.query || haystack.includes(splicer.query.toLowerCase()));
  });
  const selectable = visible.filter((node) => node.status !== "excluded").map((node) => node.code);
  const allSelected = selectable.length > 0 && selectable.every((code) => splicer.selectedCodes.includes(code));

  return (
    <section className="panel">
      <div className="table-toolbar">
        <div className="search">
          <Search size={17} />
          <input placeholder="Buscar nodo, GPS o factura…" value={splicer.query} onChange={(event) => splicer.setQuery(event.target.value)} />
        </div>
        <a className="text-button" href="/map-import">
          Agregar mapas PDF
        </a>
        <select aria-label="Filtrar estado" value={splicer.filter} onChange={(event) => splicer.setFilter(event.target.value)}>
          <option value="all">Todos los activos</option>
          <option value="map_pending">Mapa por recibir</option>
          <option value="review">Con aviso de seguimiento</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {splicer.selectedCodes.length > 0 ? (
          <button className="primary" onClick={() => splicer.openBatch()}>
            Editar {splicer.selectedCodes.length} nodos
          </button>
        ) : null}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Seleccionar visibles"
                  checked={allSelected}
                  onChange={(event) => splicer.setSelectedCodes(event.target.checked ? selectable : [])}
                />
              </th>
              <th>NODO</th>
              <th>ESTADO</th>
              <th>FECHAS</th>
              <th>UBICACIÓN</th>
              <th>MAPA</th>
              <th>VALOR</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((node) => {
              const flag = urgency(node, splicer.anchor);
              return (
                <tr key={node.code} className={flag.kind}>
                  <td>
                    <input
                      type="checkbox"
                      disabled={node.status === "excluded"}
                      checked={splicer.selectedCodes.includes(node.code)}
                      aria-label={`Seleccionar ${node.code}`}
                      onChange={() => splicer.toggleCode(node.code)}
                    />
                  </td>
                  <td>
                    <button className="node-link" onClick={() => splicer.setEditing({ ...node })}>
                      {node.code}
                      <ExternalLink size={13} />
                    </button>
                    <small className="sub">{node.job || "Optimum Fiber"}</small>
                    <NodeNotices node={node} />
                  </td>
                  <td>
                    <span className={`pill ${node.status}`}>{STATUS_LABEL[node.status]}</span>
                    {flag.label ? <small className="sub deadline-label">{flag.label}</small> : null}
                    {node.night ? <small className="sub">☾ Corte nocturno</small> : null}
                  </td>
                  <td>
                    <strong className="table-date">
                      {node.completed ? `Completado ${formatShort(node.completed)}` : node.scheduled ? `Programado ${formatShort(node.scheduled)}` : `Límite ${formatShort(node.due)}`}
                    </strong>
                    <small className="sub">{node.start ? `Desde ${formatShort(node.start)}` : "Inicio sin restricción indicada"}</small>
                  </td>
                  <td>
                    {node.gps ? (
                      <a className="location" href={googleSearch(node.gps)} target="_blank" rel="noreferrer">
                        <MapPin size={13} />
                        {node.gps}
                      </a>
                    ) : (
                      "Por confirmar"
                    )}
                    {node.address ? <small className="sub">{node.address}</small> : null}
                  </td>
                  <td>
                    {node.map ? (
                      <a className="map-link" href={`/maps/${encodeURIComponent(node.map)}`} target="_blank" rel="noreferrer">
                        <FileText size={15} /> Ver PDF
                      </a>
                    ) : (
                      <span className="notice-tag missing-map">Mapa por recibir</span>
                    )}
                  </td>
                  <td className="amount">{node.status === "excluded" ? "—" : "$350"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visible.length ? <div className="empty">No hay nodos que coincidan.</div> : null}
      </div>
      <div className="table-foot">{visible.length} nodos · Tarifa fija de $350 USD · Los reasignados quedan fuera de producción y cobro</div>
    </section>
  );
}
