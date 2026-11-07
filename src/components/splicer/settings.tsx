"use client";
import { DEFAULT_PREFERENCES, type Preferences } from "@/lib/preferences";
import { ROUTE_TARGETS } from "@/lib/splicer";
import { useSplicer } from "./provider";
import "./workspace.css";

export function SettingsView() {
  const s = useSplicer();
  const p = s.preferences;
  const select = <K extends keyof Preferences,>(key: K, label: string, options: [string, string][]) => <label>{label}<select aria-label={label} value={String(p[key])} onChange={(event) => s.updatePreferences({ [key]: event.target.value })}>{options.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>;
  return <div className="workspace-grid">
    <section className="panel workspace-panel"><h2>Appearance</h2><p>Saved automatically for {s.person} on this device.</p><div className="workspace-form">
      {select("theme", "Theme", [["light", "Light"], ["dark", "Dark"], ["system", "Follow device"]])}
      {select("accent", "Accent color", [["blue", "Blue"], ["copper", "Copper"], ["teal", "Teal"]])}
      {select("density", "Layout density", [["comfortable", "Comfortable"], ["compact", "Compact"]])}
    </div></section>
    <section className="panel workspace-panel"><h2>Navigation</h2><div className="workspace-form">
      {select("defaultTab", "Open on sign-in", [["overview", "Overview"], ["routes", "Routes"], ["calendar", "Calendar"], ["nodes", "Nodes"], ["billing", s.person === "Chris" ? "Your production" : "Billing"], ["stats", "Stats"]])}
      {select("mapApp", "Overview navigation app", [["apple", "Apple Maps"], ["google", "Google Maps"]])}
    </div></section>
    <section className="panel workspace-panel"><h2>Overview</h2><div className="workspace-form"><label className="workspace-check"><input type="checkbox" checked={p.showOverviewRoute} onChange={(event) => s.updatePreferences({ showOverviewRoute: event.target.checked })} /> Show my next stop and route</label><label className="workspace-check"><input type="checkbox" checked={p.showOverviewTeam} onChange={(event) => s.updatePreferences({ showOverviewTeam: event.target.checked })} /> Show crew production snapshot</label></div></section>
    <section className="panel workspace-panel"><h2>Daily route targets</h2><p>Unfinished stops carry forward first; eligible nearby nodes fill each route.</p><div className="workspace-targets">{Object.entries(ROUTE_TARGETS).map(([person, count]) => <div key={person}><span>{person}</span><strong>{count} nodes / day</strong></div>)}</div><p>Nodes stay off routes until their authorized start date. Daniel saves the shared route.</p></section>
    <section className="panel workspace-panel"><h2>Profile & preferences</h2><p>Signed in as {s.person}. {s.person === "Chris" ? "Production is shown as node counts only." : "Billing shows your own share."}</p><button className="text-button" onClick={() => { s.updatePreferences(DEFAULT_PREFERENCES); s.showToast("Preferences reset"); }}>Reset my display preferences</button><button className="text-button" onClick={s.refresh}>Refresh server records</button><button className="text-button" onClick={s.lock}>Sign out</button></section>
  </div>;
}
