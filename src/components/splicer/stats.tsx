"use client";

import { useState } from "react";
import { CREW, addDays, formatShort, weekBounds } from "@/lib/splicer";
import { productionStats } from "@/lib/production-stats";
import { useSplicer } from "./provider";
import "./stats.css";

type Period = "all" | "week" | "previous" | "month" | "custom";

export function StatsView() {
  const { nodes, today } = useSplicer();
  const [period, setPeriod] = useState<Period>("all");
  const [customStart, setCustomStart] = useState(weekBounds(today).start);
  const [customEnd, setCustomEnd] = useState(today);
  const week = weekBounds(today);
  const start = period === "week" ? week.start : period === "previous" ? addDays(week.start, -7) : period === "month" ? addDays(today, -29) : period === "custom" ? customStart : "";
  const end = period === "previous" ? addDays(week.start, -1) : period === "custom" ? customEnd : today;
  const invalid = period === "custom" && (!start || !end || start > end || end > today);
  const stats = productionStats(nodes, start, end);
  const max = Math.max(1, ...stats.people.map((person) => person.count));
  const range = period === "all" ? `All time through ${formatShort(today)}` : `${formatShort(start)}–${formatShort(end)}`;

  return (
    <div className={"production-stats-root"}>
      <section className={`panel ${"production-stats-filters"}`} aria-label="Production filters">
        <div><strong>Compare production</strong><p>Counted by who completed the node and the day it was finished.</p></div>
        <label>Period
          <select aria-label="Period" value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
            <option value="all">All time</option><option value="week">This billing week</option><option value="previous">Last billing week</option><option value="month">Last 30 days</option><option value="custom">Custom dates</option>
          </select>
        </label>
        {period === "custom" ? <>
          <label>From<input type="date" max={customEnd || today} value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label>
          <label>Through<input type="date" min={customStart} max={today} value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label>
        </> : null}
      </section>
      {invalid ? <p className="error" role="alert">Choose a start date on or before the end date, with both dates no later than today.</p> : <>
        <div className={"production-stats-overview"}><span>{range} · Billing weeks run Friday–Thursday.</span><strong>{stats.total} completed nodes</strong></div>
        {stats.unassigned || stats.undated ? <p className={"production-stats-notice"}>{stats.unassigned ? `${stats.unassigned} completed ${stats.unassigned === 1 ? "node has" : "nodes have"} no recorded worker in this period and are excluded from the person comparisons. ` : ""}{stats.undated ? `${stats.undated} completed ${stats.undated === 1 ? "node has" : "nodes have"} no completion date and cannot be placed in a period.` : ""}</p> : null}
        <div className={"production-stats-people"}>
          {stats.people.map((row, index) => <section className={`panel ${"production-stats-person"}`} key={row.person} style={{ ["--person-color" as string]: ["#477db2", "#c77c47", "#438b7e"][index] }} aria-label={`${row.person} production`}>
            <div className={"production-stats-personHeading"}><span className={"production-stats-avatar"}>{row.person === "Daniel" ? "DV" : row.person === "Iván" ? "IV" : "CH"}</span><h2>{row.person}</h2></div>
            <div className={"production-stats-count"}><strong>{row.count}</strong><span>nodes completed</span></div>
            <div className={"production-stats-bar"} role="img" aria-label={`${row.person}: ${row.count} completed nodes`}><i style={{ width: `${row.count / max * 100}%` }} /></div>
            <dl className={"production-stats-metrics"}><div><dt>Active days</dt><dd>{row.activeDays}</dd></div><div><dt>Nodes / active day</dt><dd>{row.average.toFixed(1)}</dd></div><div><dt>Best day</dt><dd>{row.bestDay} nodes</dd></div><div><dt>Share of team*</dt><dd>{row.share.toFixed(1)}%</dd></div></dl>
          </section>)}
        </div>
        <p className={"production-stats-footnote"}>*Share uses completions with a recorded worker. Averages use days with at least one completion, not hours worked.</p>
        <section className="panel">
          <div className={"production-stats-sectionHeading"}><h2>Daily production comparison</h2><p>{range} · Most recent day first</p></div>
          {stats.days.length ? <div className={"production-stats-tableScroll"}><table className={"production-stats-table"}><thead><tr><th>Date</th>{CREW.map((person) => <th key={person}>{person}</th>)}{stats.unassigned ? <th>Unassigned</th> : null}<th>Total</th></tr></thead><tbody>{stats.days.map((day) => <tr key={day.day}><td>{formatShort(day.day)}<small>{day.day}</small></td>{CREW.map((person) => <td key={person}>{day.counts[person]}</td>)}{stats.unassigned ? <td>{day.unassigned}</td> : null}<td><strong>{day.total}</strong></td></tr>)}</tbody><tfoot><tr><th>Total</th>{stats.people.map((row) => <th key={row.person}>{row.count}</th>)}{stats.unassigned ? <th>{stats.unassigned}</th> : null}<th>{stats.total}</th></tr></tfoot></table></div> : <div className="empty">No completed nodes in this period. Choose a different date range.</div>}
        </section>
        <section className="panel">
          <div className={"production-stats-sectionHeading"}><h2>Verify the completions</h2><p>Open a person’s list to see the nodes and completion dates behind the totals.</p></div>
          {stats.people.map((row) => <details className={"production-stats-details"} key={row.person}><summary>{row.person}<span>{row.count} completed nodes</span></summary>{row.count ? <div className={"production-stats-tableScroll"}><table className={"production-stats-table"}><thead><tr><th>Node</th><th>Completed</th><th>Wise job</th></tr></thead><tbody>{row.nodes.map((node) => <tr key={node.code}><td><strong>{node.code}</strong></td><td>{node.completed}</td><td>{node.job || "Not recorded"}</td></tr>)}</tbody></table></div> : <div className="empty">No completions recorded for {row.person} in this period.</div>}</details>)}
        </section>
      </>}
    </div>
  );
}
