"use client";
import { CREW, ROUTE_TARGETS, routeForDay, weekBounds, completedBetween } from "@/lib/splicer";
import { useSplicer } from "./provider";
import { TodayView } from "./today";
import { MasterOverview } from "./master";
import "./workspace.css";

export function OverviewView() {
  const s = useSplicer();
  if (s.isMaster) return <MasterOverview />;
  const week = weekBounds(s.today);
  const done = completedBetween(s.nodes, week.start, s.today);
  const plan = routeForDay(s.today, s.nodes, s.routePlans);
  return <div className="workspace-overview">
    {s.preferences.showOverviewTeam ? <section className="panel workspace-panel"><div className="workspace-heading"><div><h2>Crew overview</h2><p>Completions this billing week and today’s route.</p></div><button className="text-button" onClick={() => s.setTab("stats")}>Compare production</button></div><div className="workspace-crew">{CREW.map((person) => <div key={person}><h3>{person}</h3><strong>{done.filter((node) => node.completedBy === person).length} <small>completed this week</small></strong><p>{plan[person].length} / {ROUTE_TARGETS[person]} stops today</p></div>)}</div></section> : null}
    {s.preferences.showOverviewRoute ? <TodayView /> : <section className="panel workspace-panel"><h2>Your route is ready when you are</h2><p>Open Routes to review the next eligible stops.</p><button className="primary" onClick={() => s.setTab("routes")}>Open Routes</button></section>}
  </div>;
}
