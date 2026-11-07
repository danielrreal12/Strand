"use client";

import { useState } from "react";
import { CREW, addDays, formatShort, weekBounds } from "@/lib/splicer";
import { productionStats, productionBuckets } from "@/lib/production-stats";
import { useSplicer } from "./provider";
import "./stats.css";

type Period = "all" | "daily" | "week" | "previous" | "month" | "month-calendar" | "custom";

export function StatsView() {
  const { nodes, today } = useSplicer();
  const [period, setPeriod] = useState<Period>("all");
  const [customStart, setCustomStart] = useState(weekBounds(today).start);
  const [customEnd, setCustomEnd] = useState(today);
  const [anchor, setAnchor] = useState(today);
  const week = weekBounds(anchor);
  const monthEnd = new Date(Date.UTC(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const start = period === "daily" ? anchor : period === "month-calendar" ? `${anchor.slice(0, 7)}-01` : period === "week" ? week.start : period === "previous" ? addDays(week.start, -7) : period === "month" ? addDays(today, -29) : period === "custom" ? customStart : "";
  const end = period === "daily" ? anchor : period === "month-calendar" ? (monthEnd < today ? monthEnd : today) : period === "week" ? (week.end < today ? week.end : today) : period === "previous" ? addDays(week.start, -1) : period === "custom" ? customEnd : today;
  const invalid = !end || ((period !== "all") && (!start || start > end || end > today));
  const scope = period === "daily" ? "daily" : period === "week" || period === "previous" ? "weekly" : period === "month" || period === "month-calendar" ? "monthly" : "all";
  const stats = productionStats(nodes, start, end);
  const buckets = invalid ? [] : productionBuckets(stats, start, end, scope);
  const graphMax = Math.max(1, ...buckets.flatMap((bucket) => CREW.map((person) => bucket.counts[person])));
  const max = Math.max(1, ...stats.people.map((person) => person.count));
  const range = period === "all" ? `All time through ${formatShort(today)}` : `${formatShort(start)}–${formatShort(end)}`;

  return (
    <div className={"production-stats-root"}>
      <div className="production-stats-subtabs" role="tablist" aria-label="Stats time scale">{([ ["daily", "Daily", "daily"], ["weekly", "Weekly", "week"], ["monthly", "Monthly", "month-calendar"], ["all", "All time", "all"] ] as const).map(([key, label, selected]) => <button role="tab" aria-selected={scope === key} key={key} onClick={() => { setPeriod(selected); setAnchor(today); }}>{label}</button>)}</div>
      <section className={`panel ${"production-stats-filters"}`} aria-label="Production filters">
        <div><strong>Compare production</strong><p>Counted by who completed the node and the day it was finished.</p></div>
        <label>Period
          <select aria-label="Period" value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
            <option value="daily">Selected day</option><option value="month-calendar">Selected month</option><option value="all">All time</option><option value="week">This billing week</option><option value="previous">Last billing week</option><option value="month">Last 30 days</option><option value="custom">Custom dates</option>
          </select>
        </label>
        {period === "daily" || period === "week" ? <label>{period === "daily" ? "Day" : "Week containing"}<input type="date" max={today} value={anchor} onChange={(event) => { if (event.target.value) setAnchor(event.target.value); }} /></label> : null}
        {period === "month-calendar" ? <label>Month<input type="month" max={today.slice(0, 7)} value={anchor.slice(0, 7)} onChange={(event) => { if (event.target.value) setAnchor(`${event.target.value}-01`); }} /></label> : null}
        {period === "custom" ? <>
          <label>From<input type="date" max={customEnd || today} value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></label>
          <label>Through<input type="date" min={customStart} max={today} value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label>
        </> : null}
      </section>
      {invalid ? <p className="error" role="alert">Choose a start date on or before the end date, with both dates no later than today.</p> : <>
        <div className={"production-stats-overview"}><span>{range} · Billing weeks run Friday–Thursday.</span><strong>{stats.total} completed nodes</strong></div>
        {stats.unassigned || stats.undated ? <p className={"production-stats-notice"}>{stats.unassigned ? `${stats.unassigned} completed ${stats.unassigned === 1 ? "node has" : "nodes have"} no recorded worker in this period and are excluded from the person comparisons. ` : ""}{stats.undated ? `${stats.undated} completed ${stats.undated === 1 ? "node has" : "nodes have"} no completion date and cannot be placed in a period.` : ""}</p> : null}
        <section className="panel production-stats-graph-panel"><div className="production-stats-sectionHeading"><h2>{scope === "all" ? "All-time" : scope.charAt(0).toUpperCase() + scope.slice(1)} production graph</h2><p>{scope === "daily" ? "Side-by-side nodes completed on the selected day." : scope === "weekly" ? "Daily comparisons within the selected billing week." : scope === "monthly" ? "Weekly comparisons within the selected month or period." : "Monthly comparisons across the selected records."}</p><div className="production-stats-legend">{CREW.map((person, index) => <span key={person}><i style={{ background: ["#477db2", "#c77c47", "#438b7e"][index] }} />{person}</span>)}</div></div><div className="production-stats-graph-scroll"><div className="production-stats-grouped-graph" role="img" aria-label={`${scope} crew production comparison graph`} style={{ minWidth: Math.max(280, buckets.length * 105) }}>{buckets.map((bucket) => <div className="production-stats-graph-group" key={bucket.key}><div className="production-stats-graph-bars">{CREW.map((person, index) => <div className="production-stats-graph-bar" key={person} title={`${bucket.label}: ${person}, ${bucket.counts[person]} nodes`}><strong>{bucket.counts[person]}</strong><i style={{ height: `${Math.max(2, bucket.counts[person] / graphMax * 160)}px`, background: ["#477db2", "#c77c47", "#438b7e"][index] }} /><span>{person === "Daniel" ? "D" : person === "Iván" ? "I" : "C"}</span></div>)}</div><span>{bucket.label}</span></div>)}</div></div></section>
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
