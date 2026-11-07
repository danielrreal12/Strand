"use client";

import {
  Activity,
  BarChart3,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock,
  Download,
  Layers,
  MapPin,
  Moon,
  Navigation,
  Plus,
  Radio,
  Receipt,
  RefreshCw,
  Sun,
  Settings,
  Wallet,
  X,
} from "lucide-react";
import {
  activeNodes,
  completedBetween,
  crewById,
  downloadCsv,
  expectedPayNodes,
  expectedWeeklyAmount,
  billingWeeks,
  formatShort,
  money,
  payableNodes,
  personalTotal,
  weekBounds,
  type TabId,
} from "@/lib/splicer";
import { WeekCharts } from "./calendar";
import { useSplicer } from "./provider";

const NAV: { id: TabId; label: string; icon: typeof CalendarDays }[] = [
  { id: "overview", label: "Overview", icon: Navigation },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "nodes", label: "Nodes", icon: Layers },
  { id: "routes", label: "Route", icon: MapPin },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "calendar", label: "Calendar" },
  { id: "nodes", label: "All nodes" },
  { id: "routes", label: "Map & route" },
  { id: "billing", label: "Billing & payments" },
  { id: "stats", label: "Stats" },
  { id: "settings", label: "Settings" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const splicer = useSplicer();
  const profile = crewById(splicer.person);
  const active = activeNodes(splicer.nodes);
  const completed = active.filter((node) => node.status === "completed");
  const mine = payableNodes(splicer.nodes, splicer.person);
  const personalWeeks = billingWeeks(splicer.nodes, splicer.today, splicer.person, splicer.cyclePayments);
  const balance = personalWeeks.reduce((sum, week) => sum + week.receivable, 0);
  const partner = splicer.person !== "Chris";
  const open = active.filter((node) => node.status !== "completed");
  const progress = active.length ? (completed.length / active.length) * 100 : 0;
  const bounds = weekBounds(splicer.today);
  const weekDone = completedBetween(splicer.nodes, bounds.start, bounds.end);
  const payableThisWeek = expectedPayNodes(splicer.nodes, splicer.today, splicer.person, splicer.cyclePayments);
  const estimatedPayDates = payableThisWeek.filter((node) => !node.payDate).length;
  const weekLabel = `${formatShort(bounds.start)}–${formatShort(bounds.end)}`;
  const titles: Record<TabId, [string, string]> = {
    overview: [
      "Your operation, at a glance.",
      weekDone.length
        ? `${weekDone.length} finished this billing week (${weekLabel}). ${completed.length} all time.`
        : `0 finished this billing week (${weekLabel}). ${completed.length} all time, from earlier weeks.`,
    ],
    calendar: ["Your work, on the calendar.", "The week is the working view. The month is there when you need it."],
    routes: ["The day, stop by stop.", "Daniel 5 · Iván 5 · Chris 3 stops, grouped by proximity."],
    nodes: ["Every node, in one place.", "Maps, locations, and who finished each assignment."],
    settings: ["Make Strand yours.", "Personalize this profile’s display and navigation."],
    stats: ["Production, side by side.", "Compare completed nodes for Daniel, Iván, and Chris by completion date."],
    billing: splicer.person === "Chris"
      ? [`Your production, ${profile.name}.`, "Your completed nodes, grouped by completion date."]
      : [`Your billing, ${profile.name}.`, "Your half of each day you and your partner finished. Chris’s pay stays off this tab."],
  };
  const [title, subtitle] = titles[splicer.tab];

  return (
    <div className="shell">
      <aside>
        <a className="brand" href="/">
          <span className="brand-icon">
            <Activity size={25} />
          </span>
          strand
          <span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="project-icon">
            <Radio size={19} />
          </span>
          <div>
            <strong>Optimum • Paige</strong>
            <small>Paige Communications</small>
          </div>
          <span className="live-dot" />
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={splicer.tab === item.id ? "nav-active" : ""} onClick={() => splicer.setTab(item.id)}>
                <Icon size={19} />
                {item.id === "billing" && !partner ? "Production" : item.label}
                {item.id === "nodes" ? <span>{active.length}</span> : null}
              </button>
            );
          })}
        </nav>
        <div className="side-note">
          <span className="live-dot" /> ACTIVE PROJECT
          <strong>Every connection counts.</strong>
          <p>
            Your work and your pay,
            <br />
            in one place.
          </p>
          <div className="fiber-lines">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="profile">
          <div>{profile.initials}</div>
          <span>
            <strong>{profile.name}</strong>
            <small>{profile.role}</small>
          </span>
        </div>
      </aside>
      <div className="main">
        <header>
          <div>
            <span className="breadcrumb">Workspace</span>
            <ChevronRight size={14} />
            <strong>Optimum • Paige</strong>
          </div>
          <span className="sync">
            <span className="live-dot" /> Saved and backed up
            <button className="theme-toggle" aria-label="Open settings" title="Settings" onClick={() => splicer.setTab("settings")}><Settings size={17} /></button>
            <button className="theme-toggle" aria-label={splicer.dark ? "Light mode" : "Dark mode"} aria-pressed={splicer.dark} title={splicer.dark ? "Light mode" : "Dark mode"} onClick={splicer.toggleTheme}>
              {splicer.dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button title="Refresh" onClick={splicer.refresh}>
              <RefreshCw size={15} />
            </button>
            <button title="Sign out" aria-label="Sign out" onClick={splicer.lock}>
              Sign out
            </button>
          </span>
        </header>
        <main>
          <div className="heading">
            <div>
              <div className="eyebrow">STRAND · OPTIMUM • PAIGE</div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <button className="primary" onClick={() => splicer.openBatch()}>
              <Plus size={18} />
              Log a day
            </button>
          </div>
          {splicer.error && !splicer.editing && !splicer.batchOpen ? (
            <div className="error" role="alert">
              {splicer.error}
              <button onClick={() => splicer.setError("")} aria-label="Close notice">
                <X size={16} />
              </button>
            </div>
          ) : null}
          {splicer.tab === "stats" || splicer.tab === "settings" ? null : (
          <div className="stats">
            <div className="stat">
              <span>
                This billing week
                <CircleCheck size={18} />
              </span>
              <strong>
                {weekDone.length}
                <em> finished</em>
              </strong>
              <small>{weekLabel}. Friday through Thursday. {weekDone.length ? "Finished this billing week only." : "New billing week. Nothing logged yet."}</small>
            </div>
            <div className="stat">
              <span>
                All time
                <ArrowUpRight size={18} />
              </span>
              <strong>
                {completed.length}
                <em>/ {active.length}</em>
              </strong>
              <div className="progress">
                <i style={{ width: `${progress}%` }} />
              </div>
              <small>Every earlier week, plus this one. {open.length} still open.</small>
            </div>
            <div className="stat">
              <span>
                {partner ? "Expected pay this week" : "Your nodes this week"}
                <Clock size={18} />
              </span>
              <strong>
                {partner ? money(expectedWeeklyAmount(splicer.nodes, splicer.today, splicer.person, splicer.cyclePayments)) : weekDone.filter((node) => node.completedBy === "Chris").length}
                <em>{partner ? "USD" : "nodes"}</em>
              </strong>
              <small>{partner ? <>{formatShort(bounds.start)}–{formatShort(bounds.end)} · {payableThisWeek.length} nodes in this week’s schedule. {estimatedPayDates ? `${estimatedPayDates} use estimated payment dates.` : "Scheduled dates, less recorded cycle payments."}</> : <>{weekLabel} · Completed in your name.</>}</small>
            </div>
            <div className="stat green">
              <span>
                {partner ? "Your pay, all time" : "Your nodes, all time"}
                <Wallet size={18} />
              </span>
              <strong>
                {partner ? money(personalTotal(splicer.nodes, splicer.person)) : mine.length}
                <em>{partner ? "USD" : "nodes"}</em>
              </strong>
              <small>
                {partner ? <>{money(balance)} still to collect · {personalWeeks.filter((week) => week.count && week.receivable === 0).length} cycles paid</> : "Your recorded completions across all dates."}
              </small>
            </div>
          </div>
          )}
          {splicer.tab === "calendar" ? <WeekCharts /> : null}
          <div className="section-title">
            <div className="tabs">
              {TABS.map((item) => (
                <button key={item.id} className={splicer.tab === item.id ? "current" : ""} onClick={() => splicer.setTab(item.id)}>
                  {item.id === "billing" && !partner ? "Your production" : item.label}
                </button>
              ))}
            </div>
            <button className="text-button" onClick={() => downloadCsv(payableNodes(splicer.nodes, splicer.person), splicer.today, splicer.person)}>
              <Download size={16} /> Export my CSV
            </button>
          </div>
          {children}
          <div className="bottom-note">
            <span>
              <Radio size={14} /> {active.length} active nodes · {active.filter((node) => node.map).length} maps available · Bryan / College Station, TX
            </span>
            <span>{partner ? "Payments are confirmed manually." : "Production counts come from recorded completions."}</span>
          </div>
        </main>
      </div>
    </div>
  );
}
