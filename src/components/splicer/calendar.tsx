"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Radio } from "lucide-react";
import { NodeNotices } from "./notices";
import { useSplicer } from "./provider";
import {
  PAY_PER_NODE,
  STATUS_LABEL,
  activeNodes,
  addDays,
  calendarHelp,
  formatLong,
  formatMonth,
  formatShort,
  isoFromDate,
  money,
  monthGrid,
  placedOn,
  urgency,
  weekBounds,
  type CalendarMode,
} from "@/lib/splicer";

export function WeekCharts() {
  const { nodes, today } = useSplicer();
  const active = activeNodes(nodes);
  const completed = active.filter((node) => node.status === "completed");
  const bounds = weekBounds(today);
  const weekStart = new Date(`${bounds.start}T12:00:00`);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = isoFromDate(date);
    const label = date.toLocaleDateString("en-US", { weekday: "short" });
    return { key, label, count: completed.filter((node) => node.completed === key).length };
  });
  const doneThisWeek = completed.filter((node) => node.completed >= bounds.start && node.completed <= today).length;
  const plan = active.filter(
    (node) =>
      (node.completed >= bounds.start && node.completed <= today) ||
      (node.status !== "completed" && node.due >= bounds.start && node.due <= bounds.end),
  ).length;
  const percent = plan ? Math.min(100, Math.round((doneThisWeek / plan) * 100)) : 0;
  const max = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <div className="progress-charts">
      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <h2>Nodes completed by day</h2>
            <p>This billing week only · {formatShort(bounds.start)}–{formatShort(bounds.end)} · {total} finished. Friday through Thursday. All-time is the other number.</p>
          </div>
        </div>
        <div className="bar-chart" role="img" aria-label="Nodes completed by day this week">
          {days.map((day) => (
            <div className="bar-column" key={day.key}>
              <strong>{day.count || ""}</strong>
              <i style={{ height: `${Math.max(4, Math.round((day.count / max) * 100))}%` }} />
              <span>{day.label}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <h2>Weekly progress</h2>
            <p>Completed vs this week’s plan</p>
          </div>
        </div>
        <div className="week-progress">
          <div className="week-ring" style={{ ["--progress" as string]: `${percent}%` }}>
            <strong>{percent}%</strong>
          </div>
          <div className="week-legend">
            <span>
              <i />
              Completed <b>{doneThisWeek}</b>
            </span>
            <span>
              <i className="pending-key" />
              Still on the plan <b>{Math.max(0, plan - doneThisWeek)}</b>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CalendarView() {
  const splicer = useSplicer();
  const [span, setSpan] = useState<"week" | "month">("week");
  const active = activeNodes(splicer.nodes);
  const open = active.filter((node) => node.status !== "completed");
  const missing = active.filter((node) => !node.map);
  const cells = monthGrid(splicer.month);
  const weekStart = weekBounds(splicer.selectedDay).start;
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const agenda = active
    .filter((node) => placedOn(node, splicer.calendarMode, splicer.anchor) === splicer.selectedDay)
    .sort((a, b) => Number(a.status === "completed") - Number(b.status === "completed") || (a.due || "9999").localeCompare(b.due || "9999") || a.code.localeCompare(b.code));

  return (
    <div className="calendar-layout">
      <section className="panel calendar">
        <div className="calendar-toolbar">
          <div className="month">
            <h2>{span === "week" ? `${formatShort(weekStart)} – ${formatShort(addDays(weekStart, 6))}` : formatMonth(splicer.month)}</h2>
            <div>
              <button
                aria-label={span === "week" ? "Previous week" : "Previous month"}
                onClick={() => {
                  if (span === "week") {
                    const next = addDays(splicer.selectedDay, -7);
                    splicer.setSelectedDay(next);
                    splicer.setMonth(new Date(`${next}T12:00:00`));
                    return;
                  }
                  splicer.setMonth(new Date(splicer.month.getFullYear(), splicer.month.getMonth() - 1, 1));
                }}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                aria-label={span === "week" ? "Next week" : "Next month"}
                onClick={() => {
                  if (span === "week") {
                    const next = addDays(splicer.selectedDay, 7);
                    splicer.setSelectedDay(next);
                    splicer.setMonth(new Date(`${next}T12:00:00`));
                    return;
                  }
                  splicer.setMonth(new Date(splicer.month.getFullYear(), splicer.month.getMonth() + 1, 1));
                }}
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <button
              className="today-btn"
              onClick={() => {
                splicer.setMonth(new Date(`${splicer.today}T12:00:00`));
                splicer.setSelectedDay(splicer.today);
              }}
            >
              Today
            </button>
            <button className={span === "week" ? "primary span-toggle" : "text-button span-toggle"} type="button" onClick={() => setSpan("week")}>
              Week
            </button>
            <button className={span === "month" ? "primary span-toggle" : "text-button span-toggle"} type="button" onClick={() => setSpan("month")}>
              Month
            </button>
          </div>
          <select aria-label="Date type" value={splicer.calendarMode} onChange={(event) => splicer.setCalendarMode(event.target.value as CalendarMode)}>
            <option value="scheduled">Automatic agenda</option>
            <option value="start">Available start</option>
            <option value="due">Due dates</option>
            <option value="completed">Completed</option>
            <option value="payment">Expected payments</option>
          </select>
        </div>
        <div className="agenda-notice">
          Open-node agenda: <strong>{formatShort(splicer.anchor)}</strong> · {open.length} nodes left. Red: overdue or within 2 days of the due date.{" "}
          {missing.length ? (
            <button
              className="notice-link"
              onClick={() => {
                splicer.setTab("nodes");
                splicer.setFilter("map_pending");
                splicer.setQuery("");
              }}
            >
              {missing.length} maps still coming · See list
            </button>
          ) : null}
        </div>
        <div className="calendar-help">{calendarHelp(splicer.calendarMode)}</div>
        {span === "week" ? (
          <div className="week-days" role="list">
            {weekDays.map((iso) => {
              const date = new Date(`${iso}T12:00:00`);
              const count = active.filter((node) => placedOn(node, splicer.calendarMode, splicer.anchor) === iso).length;
              return (
                <button key={iso} type="button" className={iso === splicer.selectedDay ? "selected" : iso === splicer.today ? "is-today" : ""} onClick={() => splicer.setSelectedDay(iso)}>
                  <small>{date.toLocaleDateString("en-US", { weekday: "short" })}</small>
                  <strong>{date.getDate()}</strong>
                  <span>{count || ""}</span>
                </button>
              );
            })}
          </div>
        ) : (
        <>
        <div className="weekdays">
          {"Mon Tue Wed Thu Fri Sat Sun".split(" ").map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="days">
          {cells.map((date) => {
            const iso = isoFromDate(date);
            const events = active
              .filter((node) => placedOn(node, splicer.calendarMode, splicer.anchor) === iso)
              .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || a.code.localeCompare(b.code));
            const reference = iso > splicer.today ? iso : splicer.today;
            return (
              <div
                key={iso}
                role="button"
                tabIndex={0}
                className={["day", date.getMonth() === splicer.month.getMonth() ? "" : "outside", iso === splicer.selectedDay ? "selected" : "", iso === splicer.today ? "is-today" : ""].join(" ")}
                onClick={() => splicer.setSelectedDay(iso)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") splicer.setSelectedDay(iso);
                }}
              >
                <span className="day-number">{date.getDate()}</span>
                {events.slice(0, 3).map((node) => {
                  const flag = urgency(node, reference);
                  return (
                    <button
                      key={node.code}
                      className={`event ${node.status} ${flag.kind}${node.map ? "" : " missing-map-event"}`}
                      title={`${node.code} · ${flag.label || STATUS_LABEL[node.status]} · Due: ${formatShort(node.due)}${node.map ? "" : " · Map still coming"}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        splicer.setEditing({ ...node });
                      }}
                    >
                      <span />
                      {node.code}
                      {!node.map ? (
                        <small className="map-question" aria-label="Map still coming">
                          PDF?
                        </small>
                      ) : null}
                      {node.night ? <small>☾</small> : null}
                    </button>
                  );
                })}
                {events.length > 3 ? <small className="more">+{events.length - 3} nodes</small> : null}
              </div>
            );
          })}
        </div>
        </>
        )}
        <div className="legend">
          <span>
            <i />
            Pending
          </span>
          <span>
            <i className="blue" />
            In progress
          </span>
          <span>
            <i className="green-dot" />
            Completed
          </span>
          <span>
            <i className="red-dot" />
            Overdue or due within 2 days
          </span>
          <span>
            <i className="yellow-dot" />
            Map still coming
          </span>
          <span>☾ Night cut</span>
        </div>
      </section>
      <section className="panel agenda">
        <div className="agenda-head">
          <span>DAY AGENDA</span>
          <h2>{formatLong(splicer.selectedDay)}</h2>
          <p>
            {agenda.length} nodes · {splicer.calendarMode === "payment" ? "expected pay" : "on the agenda"}
          </p>
        </div>
        <button
          className="text-button agenda-route-button"
          onClick={() => {
            splicer.setTab("routes");
            splicer.setRouteMode("team");
          }}
        >
          Open the map and build the route ↗
        </button>
        <div className="agenda-list">
          {agenda.length ? (
            agenda.map((node) => {
              const reference = splicer.selectedDay > splicer.today ? splicer.selectedDay : splicer.today;
              const flag = urgency(node, reference);
              return (
                <button key={node.code} className={`agenda-item ${flag.kind}`} onClick={() => splicer.setEditing({ ...node })}>
                  <div className="node-symbol">
                    <Radio size={19} />
                  </div>
                  <div>
                    <strong>
                      {node.code}
                      <span className={`pill ${node.status}`}>{STATUS_LABEL[node.status]}</span>
                    </strong>
                    <NodeNotices node={node} />
                    <small>
                      Start: {node.start ? formatShort(node.start) : "No date given"} · Due: {formatShort(node.due)}
                    </small>
                    {node.night ? <small>00:00–06:00 · Night cut</small> : null}
                    {flag.label ? <small className="deadline-label">{flag.label}</small> : null}
                    <small>
                      <MapPin size={12} />
                      {node.address || node.gps || "Location to confirm"}
                    </small>
                  </div>
                  <ChevronRight size={15} />
                </button>
              );
            })
          ) : (
            <div className="empty">
              <CalendarDaysIcon />
              <strong>Nothing scheduled</strong>
              <p>
                Pick another date, or schedule
                <br />
                a node from its sheet.
              </p>
            </div>
          )}
        </div>
        {splicer.person === "Chris" ? (
          <div className="agenda-total">
            <span>Stops this day</span>
            <strong>{agenda.length}</strong>
          </div>
        ) : (
          <div className="agenda-total">
            <span>{splicer.calendarMode === "payment" ? "Expected pay" : "Node value"}</span>
            <strong>
              {money(agenda.length * PAY_PER_NODE)} <small>USD</small>
            </strong>
          </div>
        )}
      </section>
    </div>
  );
}

function CalendarDaysIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}
