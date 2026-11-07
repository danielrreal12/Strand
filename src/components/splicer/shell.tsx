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
  Wallet,
  X,
} from "lucide-react";
import {
  CHRIS_RATE,
  activeNodes,
  completedBetween,
  crewById,
  downloadCsv,
  expectedPayNodes,
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
  { id: "today", label: "Today", icon: Navigation },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "nodes", label: "Nodes", icon: Layers },
  { id: "routes", label: "Route", icon: MapPin },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "stats", label: "Stats", icon: BarChart3 },
];

const TABS: { id: TabId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "calendar", label: "Calendar" },
  { id: "nodes", label: "All nodes" },
  { id: "routes", label: "Map & route" },
  { id: "billing", label: "Billing & payments" },
  { id: "stats", label: "Stats" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const splicer = useSplicer();
  const profile = crewById(splicer.person);
  const active = activeNodes(splicer.nodes);
  const completed = active.filter((node) => node.status === "completed");
  const mine = payableNodes(splicer.nodes, splicer.person);
  const paid = mine.filter((node) => node.paidDate);
  const partner = splicer.person !== "Chris";
  const open = active.filter((node) => node.status !== "completed");
  const progress = active.length ? (completed.length / active.length) * 100 : 0;
  const bounds = weekBounds(splicer.today);
  const weekDone = completedBetween(splicer.nodes, bounds.start, bounds.end);
  const payableThisWeek = expectedPayNodes(splicer.nodes, splicer.today, splicer.person);
  const estimatedPayDates = payableThisWeek.filter((node) => !node.payDate).length;
  const weekLabel = `${formatShort(bounds.start)}–${formatShort(bounds.end)}`;
  const titles: Record<TabId, [string, string]> = {
    today: [
      "Today's route.",
      weekDone.length
        ? `${weekDone.length} finished this billing week (${weekLabel}). ${completed.length} all time.`
        : `0 finished this billing week (${weekLabel}). ${completed.length} all time, from earlier weeks.`,
    ],
    calendar: ["Your work, on the calendar.", "The week is the working view. The month is there when you need it."],
    routes: ["The day, stop by stop.", "Six stops each, grouped by how close the nodes are."],
    nodes: ["Every node, in one place.", "Maps, locations, and who finished each assignment."],
    stats: ["Production, side by side.", "Compare completed nodes for Daniel, Iván, and Chris by completion date."],
    billing: splicer.person === "Chris"
      ? [`Your billing, ${profile.name}.`, "Only the nodes finished in your name, at $300 each."]
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
                {item.label}
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
          {splicer.tab === "today" || splicer.tab === "stats" ? null : (
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
                Expected pay this week
                <Clock size={18} />
              </span>
              <strong>
                {money(personalTotal(payableThisWeek, splicer.person))}
                <em>USD</em>
              </strong>
              <small>{formatShort(bounds.start)}–{formatShort(bounds.end)} · {payableThisWeek.length} unpaid nodes scheduled. {estimatedPayDates ? `${estimatedPayDates} use estimated payment dates.` : "Based on scheduled payment dates."}</small>
            </div>
            <div className="stat green">
              <span>
                Your pay, all time
                <Wallet size={18} />
              </span>
              <strong>
                {money(personalTotal(splicer.nodes, splicer.person))}
                <em>USD</em>
              </strong>
              <small>
                {money(personalTotal(splicer.nodes, splicer.person, false))} still to collect · {paid.length} paid
                {partner ? "" : ` · ${mine.length} nodes × $${CHRIS_RATE}`}
              </small>
            </div>
          </div>
          )}
          {splicer.tab === "calendar" ? <WeekCharts /> : null}
          <div className="section-title">
            <div className="tabs">
              {TABS.map((item) => (
                <button key={item.id} className={splicer.tab === item.id ? "current" : ""} onClick={() => splicer.setTab(item.id)}>
                  {item.label}
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
            <span>Payments are confirmed manually.</span>
          </div>
        </main>
      </div>
    </div>
  );
}
