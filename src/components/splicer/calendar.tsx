"use client";

import { ChevronLeft, ChevronRight, MapPin, Radio } from "lucide-react";
import { NodeNotices } from "./notices";
import { useSplicer } from "./provider";
import {
  PAY_PER_NODE,
  STATUS_LABEL,
  activeNodes,
  calendarHelp,
  formatLong,
  formatMonth,
  formatShort,
  isoFromDate,
  mondayOf,
  money,
  monthGrid,
  placedOn,
  urgency,
  type CalendarMode,
} from "@/lib/splicer";

export function WeekCharts() {
  const { nodes, today } = useSplicer();
  const active = activeNodes(nodes);
  const completed = active.filter((node) => node.status === "completed");
  const monday = mondayOf(today);
  const mondayIso = isoFromDate(monday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sundayIso = isoFromDate(sunday);
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = isoFromDate(date);
    const label = date.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "");
    return { key, label, count: completed.filter((node) => node.completed === key).length };
  });
  const doneThisWeek = completed.filter((node) => node.completed >= mondayIso && node.completed <= today).length;
  const plan = active.filter(
    (node) =>
      (node.completed >= mondayIso && node.completed <= today) ||
      (node.status !== "completed" && node.due >= mondayIso && node.due <= sundayIso),
  ).length;
  const percent = plan ? Math.min(100, Math.round((doneThisWeek / plan) * 100)) : 0;
  const max = Math.max(1, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <div className="progress-charts">
      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <h2>Nodos completados por día</h2>
            <p>Producción de esta semana · {total} nodos</p>
          </div>
        </div>
        <div className="bar-chart" role="img" aria-label="Nodos completados por día de esta semana">
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
            <h2>Avance semanal</h2>
            <p>Nodos completados frente al plan de esta semana</p>
          </div>
        </div>
        <div className="week-progress">
          <div className="week-ring" style={{ ["--progress" as string]: `${percent}%` }}>
            <strong>{percent}%</strong>
          </div>
          <div className="week-legend">
            <span>
              <i />
              Completados <b>{doneThisWeek}</b>
            </span>
            <span>
              <i className="pending-key" />
              Pendientes del plan <b>{Math.max(0, plan - doneThisWeek)}</b>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CalendarView() {
  const splicer = useSplicer();
  const active = activeNodes(splicer.nodes);
  const open = active.filter((node) => node.status !== "completed");
  const missing = active.filter((node) => !node.map);
  const cells = monthGrid(splicer.month);
  const agenda = active
    .filter((node) => placedOn(node, splicer.calendarMode, splicer.anchor) === splicer.selectedDay)
    .sort((a, b) => Number(a.status === "completed") - Number(b.status === "completed") || (a.due || "9999").localeCompare(b.due || "9999") || a.code.localeCompare(b.code));

  return (
    <div className="calendar-layout">
      <section className="panel calendar">
        <div className="calendar-toolbar">
          <div className="month">
            <h2>{formatMonth(splicer.month)}</h2>
            <div>
              <button aria-label="Mes anterior" onClick={() => splicer.setMonth(new Date(splicer.month.getFullYear(), splicer.month.getMonth() - 1, 1))}>
                <ChevronLeft size={17} />
              </button>
              <button aria-label="Mes siguiente" onClick={() => splicer.setMonth(new Date(splicer.month.getFullYear(), splicer.month.getMonth() + 1, 1))}>
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
              Hoy
            </button>
          </div>
          <select aria-label="Tipo de fecha" value={splicer.calendarMode} onChange={(event) => splicer.setCalendarMode(event.target.value as CalendarMode)}>
            <option value="scheduled">Agenda automática</option>
            <option value="start">Inicio disponible</option>
            <option value="due">Fechas límite</option>
            <option value="completed">Completados</option>
            <option value="payment">Pagos previstos</option>
          </select>
        </div>
        <div className="agenda-notice">
          Agenda de pendientes: <strong>{formatShort(splicer.anchor)}</strong> · {open.length} nodos por completar. Rojo: vencidos o a 2 días del límite.{" "}
          {missing.length ? (
            <button
              className="notice-link"
              onClick={() => {
                splicer.setTab("nodes");
                splicer.setFilter("map_pending");
                splicer.setQuery("");
              }}
            >
              {missing.length} mapas por recibir · Ver lista
            </button>
          ) : null}
        </div>
        <div className="calendar-help">{calendarHelp(splicer.calendarMode)}</div>
        <div className="weekdays">
          {"Lun Mar Mié Jue Vie Sáb Dom".split(" ").map((day) => (
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
                      title={`${node.code} · ${flag.label || STATUS_LABEL[node.status]} · Límite: ${formatShort(node.due)}${node.map ? "" : " · Mapa por recibir"}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        splicer.setEditing({ ...node });
                      }}
                    >
                      <span />
                      {node.code}
                      {!node.map ? (
                        <small className="map-question" aria-label="Mapa por recibir">
                          PDF?
                        </small>
                      ) : null}
                      {node.night ? <small>☾</small> : null}
                    </button>
                  );
                })}
                {events.length > 3 ? <small className="more">+{events.length - 3} nodos</small> : null}
              </div>
            );
          })}
        </div>
        <div className="legend">
          <span>
            <i />
            Pendiente
          </span>
          <span>
            <i className="blue" />
            En proceso
          </span>
          <span>
            <i className="green-dot" />
            Completado
          </span>
          <span>
            <i className="red-dot" />
            Vencido o vence en 2 días
          </span>
          <span>
            <i className="yellow-dot" />
            Mapa por recibir
          </span>
          <span>☾ Corte nocturno</span>
        </div>
      </section>
      <section className="panel agenda">
        <div className="agenda-head">
          <span>AGENDA DEL DÍA</span>
          <h2>{formatLong(splicer.selectedDay)}</h2>
          <p>
            {agenda.length} nodos · {splicer.calendarMode === "payment" ? "pago previsto" : "nodos en agenda"}
          </p>
        </div>
        <button
          className="text-button agenda-route-button"
          onClick={() => {
            splicer.setTab("routes");
            splicer.setRouteMode("team");
          }}
        >
          Ver mapa y armar ruta ↗
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
                      Inicio: {node.start ? formatShort(node.start) : "Sin fecha indicada"} · Límite: {formatShort(node.due)}
                    </small>
                    {node.night ? <small>00:00–06:00 · Corte nocturno</small> : null}
                    {flag.label ? <small className="deadline-label">{flag.label}</small> : null}
                    <small>
                      <MapPin size={12} />
                      {node.address || node.gps || "Ubicación por confirmar"}
                    </small>
                  </div>
                  <ChevronRight size={15} />
                </button>
              );
            })
          ) : (
            <div className="empty">
              <CalendarDaysIcon />
              <strong>Un día por organizar</strong>
              <p>
                Selecciona otra fecha o programa
                <br />
                un nodo desde su ficha.
              </p>
            </div>
          )}
        </div>
        <div className="agenda-total">
          <span>{splicer.calendarMode === "payment" ? "Pago esperado" : "Valor de los nodos"}</span>
          <strong>
            {money(agenda.length * PAY_PER_NODE)} <small>USD</small>
          </strong>
        </div>
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
