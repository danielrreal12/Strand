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
          <input placeholder="Search node, GPS, or invoice…" value={splicer.query} onChange={(event) => splicer.setQuery(event.target.value)} />
        </div>
        <a className="text-button" href="/map-import">
          Add map PDFs
        </a>
        <select aria-label="Filter status" value={splicer.filter} onChange={(event) => splicer.setFilter(event.target.value)}>
          <option value="all">All active</option>
          <option value="map_pending">Map still coming</option>
          <option value="review">With a follow-up</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {splicer.selectedCodes.length > 0 ? (
          <button className="primary" onClick={() => splicer.openBatch()}>
            Edit {splicer.selectedCodes.length} nodes
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
                  aria-label="Select visible"
                  checked={allSelected}
                  onChange={(event) => splicer.setSelectedCodes(event.target.checked ? selectable : [])}
                />
              </th>
              <th>NODE</th>
              <th>STATUS</th>
              <th>DATES</th>
              <th>LOCATION</th>
              <th>MAP</th>
              <th>VALUE</th>
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
                      aria-label={`Select ${node.code}`}
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
                    {node.completedBy ? <small className="sub">{node.completedBy}</small> : null}
                    {flag.label ? <small className="sub deadline-label">{flag.label}</small> : null}
                    {node.night ? <small className="sub">☾ Night cut</small> : null}
                  </td>
                  <td>
                    <strong className="table-date">
                      {node.completed ? `Completed ${formatShort(node.completed)}` : node.scheduled ? `Scheduled ${formatShort(node.scheduled)}` : `Due ${formatShort(node.due)}`}
                    </strong>
                    <small className="sub">{node.start ? `From ${formatShort(node.start)}` : "No start restriction listed"}</small>
                  </td>
                  <td>
                    {node.gps ? (
                      <a className="location" href={googleSearch(node.gps)} target="_blank" rel="noreferrer">
                        <MapPin size={13} />
                        {node.gps}
                      </a>
                    ) : (
                      "To confirm"
                    )}
                    {node.address ? <small className="sub">{node.address}</small> : null}
                  </td>
                  <td>
                    {node.map ? (
                      <a className="map-link" href={`/maps/${encodeURIComponent(node.map)}`} target="_blank" rel="noreferrer">
                        <FileText size={15} /> View PDF
                      </a>
                    ) : (
                      <span className="notice-tag missing-map">Map still coming</span>
                    )}
                  </td>
                  <td className="amount">
                    {node.status === "excluded" || (splicer.person === "Chris" && node.completedBy !== "Chris")
                      ? "—"
                      : node.completedBy === "Chris"
                        ? "$300"
                        : "$350"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visible.length ? <div className="empty">No nodes match.</div> : null}
      </div>
      <div className="table-foot">
        {splicer.person === "Chris"
          ? `${visible.length} nodes · Reassigned nodes are out of production and billing`
          : `${visible.length} nodes · Flat $350 USD · Reassigned nodes are out of production and billing`}
      </div>
    </section>
  );
}
