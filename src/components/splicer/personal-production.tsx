"use client";

import { formatShort, payableNodes, weekBounds, type SplicerNode } from "@/lib/splicer";
import { useSplicer } from "./provider";

export function PersonalProductionView() {
  const splicer = useSplicer();
  const own = payableNodes(splicer.nodes, "Chris").sort((a, b) => b.completed.localeCompare(a.completed) || a.code.localeCompare(b.code));
  const groups = new Map<string, { start: string; end: string; nodes: SplicerNode[] }>();
  const byDay = new Map<string, number>();
  for (const node of own) {
    if (!node.completed) continue;
    const week = weekBounds(node.completed);
    if (!groups.has(week.start)) groups.set(week.start, { ...week, nodes: [] });
    groups.get(week.start)!.nodes.push(node);
    byDay.set(node.completed, (byDay.get(node.completed) ?? 0) + 1);
  }
  const weeks = [...groups.values()].sort((a, b) => b.start.localeCompare(a.start));
  return <div className="billing-grid">
    <section className="panel weekly-billing">
      <div className="panel-heading"><div><h2>Your production by week</h2><p>{own.length} nodes completed in your name · Friday through Thursday</p></div></div>
      <div className="table-scroll"><table><thead><tr><th>COMPLETION PERIOD</th><th>NODES COMPLETED</th><th>ACTIVE DAYS</th></tr></thead><tbody>{weeks.map((week) => <tr key={week.start}><td>{formatShort(week.start)}–{formatShort(week.end)}</td><td><strong>{week.nodes.length}</strong></td><td>{new Set(week.nodes.map((node) => node.completed)).size}</td></tr>)}</tbody></table></div>
      {!own.length ? <div className="empty">Your completed nodes will show up here once you log your first day.</div> : null}
      {own.some((node) => !node.completed) ? <p className="production-rule">Some completions are missing a date and cannot be grouped by week yet.</p> : null}
      <div className="weekly-details">{weeks.map((week) => <details key={week.start}><summary>View nodes · {formatShort(week.start)}–{formatShort(week.end)} · {week.nodes.length} nodes</summary><div className="table-scroll"><table><thead><tr><th>NODE</th><th>COMPLETED</th><th>WISE JOB</th></tr></thead><tbody>{week.nodes.map((node) => <tr key={node.code}><td><button className="node-link" onClick={() => splicer.setEditing({ ...node })}>{node.code}</button></td><td>{node.completed}</td><td>{node.job || "Not recorded"}</td></tr>)}</tbody></table></div></details>)}</div>
    </section>
    <section className="panel weekly-billing"><div className="panel-heading"><div><h2>Your daily production</h2><p>Completed nodes only, counted by completion date.</p></div></div><div className="table-scroll"><table><thead><tr><th>DATE</th><th>NODES COMPLETED</th></tr></thead><tbody>{[...byDay.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([day, count]) => <tr key={day}><td>{day}</td><td>{count}</td></tr>)}</tbody><tfoot><tr><th>TOTAL</th><th>{[...byDay.values()].reduce((sum, count) => sum + count, 0)}</th></tr></tfoot></table></div></section>
  </div>;
}
