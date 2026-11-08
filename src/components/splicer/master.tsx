"use client";
import { CREW, ROUTE_TARGETS, billingWeeks, completedBetween, money, routeForDay, weekBounds, formatShort } from "@/lib/splicer";
import { useSplicer } from "./provider";
import "./workspace.css";

export function MasterOverview() {
  const s = useSplicer();
  const bounds = weekBounds(s.today);
  const weekly = completedBetween(s.nodes, bounds.start, s.today);
  const plan = routeForDay(s.today, s.nodes, s.routePlans);
  return <div className="workspace-overview">
    <section className="panel workspace-panel"><h2>Everyone in one place</h2><p>All crew production, today’s routes, and personal balances. Chris’s information is node counts only.</p><div className="workspace-crew">{CREW.map((person) => {
      const own = s.nodes.filter((node) => node.status === "completed" && node.completedBy === person);
      const weeks = billingWeeks(s.nodes, s.today, person, s.cyclePayments);
      return <section key={person} aria-label={`${person} master summary`}><h3>{person}</h3><strong>{own.length} <small>completed nodes · all time</small></strong><p>{weekly.filter((node) => node.completedBy === person).length} completed this week</p><p>{plan[person].length} / {ROUTE_TARGETS[person]} stops today</p>{person !== "Chris" ? <><p>Earned share: <b>{money(weeks.reduce((sum, week) => sum + week.earned, 0))}</b></p><p>Received: <b>{money(weeks.reduce((sum, week) => sum + week.received, 0))}</b></p><p>Remaining: <b>{money(weeks.reduce((sum, week) => sum + week.receivable, 0))}</b></p></> : <p>Production counts only</p>}</section>;
    })}</div><div className="workspace-heading"><button className="text-button" onClick={() => s.setTab("routes")}>All routes</button><button className="text-button" onClick={() => s.setTab("billing")}>All billing cycles</button><button className="text-button" onClick={() => s.setTab("stats")}>Compare everyone</button></div></section>
    <MasterBillingSummary />
    <section className="panel"><div className="panel-heading"><div><h2>Every person’s completions</h2><p>Open a name to see their node records, completion dates, and job numbers.</p></div></div><div className="weekly-details">{CREW.map((person) => {
      const nodes = s.nodes.filter((node) => node.status === "completed" && node.completedBy === person).sort((a, b) => b.completed.localeCompare(a.completed) || a.code.localeCompare(b.code));
      return <details key={person}><summary>{person} · {nodes.length} completed nodes</summary><div className="table-scroll"><table><thead><tr><th>NODE</th><th>COMPLETED</th><th>WISE JOB</th></tr></thead><tbody>{nodes.map((node) => <tr key={node.code}><td><button className="node-link" onClick={() => s.setEditing({ ...node })}>{node.code}</button></td><td>{node.completed || "Not recorded"}</td><td>{node.job || "Not recorded"}</td></tr>)}</tbody></table></div></details>;
    })}</div></section>
  </div>;
}

export function MasterBillingSummary() {
  const s = useSplicer();
  return <section className="panel"><div className="panel-heading"><div><h2>Daniel & Iván · All cycle balances</h2><p>Each row is that person’s individual share. Use Billing to update a cycle payment.</p></div></div><div className="table-scroll"><table><thead><tr><th>PERSON</th><th>CYCLE</th><th>NODES</th><th>EARNED</th><th>RECEIVED</th><th>REMAINING</th><th>PAYMENT</th></tr></thead><tbody>{(["Daniel", "Iván"] as const).flatMap((person) => billingWeeks(s.nodes, s.today, person, s.cyclePayments).filter((week) => week.count).map((week) => <tr key={`${person}:${week.start}`}><td>{person}</td><td>{formatShort(week.start)}–{formatShort(week.end)}</td><td>{week.count}</td><td>{money(week.earned)}</td><td>{money(week.received)}</td><td>{money(week.receivable)}</td><td>{week.receivable === 0 ? "Fully paid" : week.received > 0 ? "Partially paid" : "Unpaid"}</td></tr>))}</tbody></table></div></section>;
}
