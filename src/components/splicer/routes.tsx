"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSplicer } from "./provider";
import {
  CREW,
  ROUTE_FOCUS_DAY,
  STOPS_PER_DAY,
  agendaDate,
  directionLegs,
  googleDirections,
  googleSearch,
  orderByProximity,
  parseGps,
  routeForDay,
  type RoutePlan,
  type SplicerNode,
} from "@/lib/splicer";

type LeafletMap = {
  remove: () => void;
  setView: (center: [number, number], zoom: number) => LeafletMap;
  fitBounds: (bounds: [number, number][], options?: { padding: [number, number] }) => void;
};

type LeafletLib = {
  map: (element: HTMLElement) => LeafletMap;
  tileLayer: (url: string, options: Record<string, unknown>) => { addTo: (map: unknown) => { on: (event: string, cb: () => void) => void } };
  marker: (latlng: [number, number], options: Record<string, unknown>) => { addTo: (map: unknown) => { bindPopup: (html: string) => void } };
  polyline: (latlngs: [number, number][], options: Record<string, unknown>) => { addTo: (map: unknown) => void };
  divIcon: (options: Record<string, unknown>) => unknown;
  circleMarker: (latlng: [number, number], options: Record<string, unknown>) => { addTo: (map: unknown) => void };
};

declare global {
  interface Window {
    L?: LeafletLib;
  }
}

let leafletPromise: Promise<LeafletLib> | null = null;

function loadLeaflet() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.L) return Promise.resolve(window.L);
  leafletPromise ??= new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error("Couldn’t load the map. Reload the page.")));
    script.onerror = () => reject(new Error("Couldn’t load the map. Reload the page."));
    document.body.appendChild(script);
  });
  return leafletPromise;
}

function nodesFor(codes: string[], nodes: SplicerNode[]) {
  return codes.map((code) => nodes.find((node) => node.code === code)).filter((node): node is SplicerNode => Boolean(node));
}

export function RoutesView() {
  const splicer = useSplicer();
  const initialDay = splicer.today <= ROUTE_FOCUS_DAY ? ROUTE_FOCUS_DAY : splicer.selectedDay < splicer.anchor ? splicer.anchor : splicer.selectedDay;
  const [day, setDay] = useState(initialDay);
  const plan = routeForDay(day, splicer.nodes, splicer.routePlans);

  return (
    <>
      <div className="team-mode">
        <button className={splicer.routeMode === "team" ? "primary" : "text-button"} onClick={() => splicer.setRouteMode("team")}>
          Daniel, Iván, and Chris
        </button>
        <button className={splicer.routeMode === "individual" ? "primary" : "text-button"} onClick={() => splicer.setRouteMode("individual")}>
          Individual route / All nodes
        </button>
      </div>
      {splicer.routeMode === "team" ? (
        <TeamRoute day={day} setDay={setDay} plan={plan} />
      ) : (
        <IndividualRoute day={day} setDay={setDay} />
      )}
    </>
  );
}

function TeamRoute({ day, setDay, plan }: { day: string; setDay: (day: string) => void; plan: RoutePlan }) {
  const splicer = useSplicer();
  const mapRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [danielText, setDanielText] = useState(plan.Daniel.join(", "));
  const [ivanText, setIvanText] = useState(plan.Iván.join(", "));
  const [chrisText, setChrisText] = useState(plan.Chris.join(", "));
  const [mapError, setMapError] = useState("");
  const daniel = nodesFor(plan.Daniel, splicer.nodes).filter((node) => node.status !== "completed");
  const ivan = nodesFor(plan.Iván, splicer.nodes).filter((node) => node.status !== "completed");
  const chris = nodesFor(plan.Chris, splicer.nodes).filter((node) => node.status !== "completed");
  const routeKey = [daniel, ivan, chris].map((crew) => crew.map((node) => `${node.code}:${node.gps}`).join("|")).join("#");

  useEffect(() => {
    setDanielText(plan.Daniel.join(", "));
    setIvanText(plan.Iván.join(", "));
    setChrisText(plan.Chris.join(", "));
  }, [plan.Daniel, plan.Iván, plan.Chris, day]);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    let map: LeafletMap | null = null;
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !element) return;
        const created = L.map(element).setView([30.63, -96.34], 11);
        map = created;
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
          .addTo(created)
          .on("tileerror", () => setMapError("Part of the map failed to load. The list and navigation links still work."));
        const bounds: [number, number][] = [];
        const paint = (crew: SplicerNode[], prefix: string, color: string, className: string) => {
          const line: [number, number][] = [];
          crew.forEach((node, index) => {
            const point = parseGps(node.gps);
            if (!point) return;
            const latlng: [number, number] = [point.lat, point.lng];
            line.push(latlng);
            bounds.push(latlng);
            L.marker(latlng, {
              icon: L.divIcon({
                className: "",
                html: `<div class="route-marker ${className}">${prefix}${index + 1}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
              }),
              title: node.code,
            })
              .addTo(created)
              .bindPopup(`<strong>${node.code}</strong><br>${node.address || node.gps}<br><a target="_blank" rel="noreferrer" href="${googleSearch(node.gps)}">Open in Google Maps</a>`);
          });
          if (line.length > 1) L.polyline(line, { color, dashArray: "6 8", weight: 3 }).addTo(created);
        };
        paint(daniel, "D", "#2563eb", "crew-daniel");
        paint(ivan, "I", "#c2410c", "crew-ivan");
        paint(chris, "C", "#0f766e", "crew-chris");
        if (bounds.length > 1) created.fitBounds(bounds, { padding: [28, 28] });
        else if (bounds.length === 1) created.setView(bounds[0], 13);
      })
      .catch((caught) => setMapError(caught instanceof Error ? caught.message : "Couldn’t load the map. Reload the page."));
    return () => {
      cancelled = true;
      map?.remove();
    };
  // routeKey already encodes the coordinates drawn on the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  function parseList(value: string) {
    const known = new Set(splicer.nodes.map((node) => node.code));
    return value
      .split(/[\s,;]+/)
      .map((code) => code.trim().toUpperCase())
      .filter((code, index, all) => known.has(code) && all.indexOf(code) === index);
  }

  function saveManual() {
    const nextDaniel = parseList(danielText);
    const ivan = parseList(ivanText).filter((code) => !nextDaniel.includes(code));
    const chris = parseList(chrisText).filter((code) => !nextDaniel.includes(code) && !ivan.includes(code));
    splicer.saveRoute({ ...plan, day, Daniel: nextDaniel, Iván: ivan, Chris: chris, saved: true });
    setEditing(false);
  }

  return (
    <>
      <div className="panel route-toolbar">
        <div>
          <h2>Daniel, Iván, and Chris · Today’s routes</h2>
          <p>{STOPS_PER_DAY} stops each · unfinished stops stay first the next day · Houston time</p>
        </div>
        <label>
          Work date
          <input type="date" value={day} onChange={(event) => event.target.value && setDay(event.target.value)} />
        </label>
        <label>
          Show
          <select defaultValue="both" aria-label="Show">
            <option value="both">All three routes</option>
          </select>
        </label>
      </div>
      {mapError ? (
        <p className="error" role="alert">
          {mapError}
        </p>
      ) : null}
      <div className="panel route-map-panel team-map">
        <div ref={mapRef} className="route-map" role="region" aria-label="Map of Daniel, Iván, and Chris’s routes" />
        <div className="route-legend">
          <strong className="daniel-label">● Daniel · Blue</strong>
          <strong className="ivan-label">● Iván · Orange</strong>
          <strong className="chris-label">● Chris · Teal</strong>
        </div>
        <p className="route-help">Each route stays near itself. Unfinished stops from the day before stay at the front, then the nearest open nodes fill the list back to {STOPS_PER_DAY}. Dotted lines are the stop order. D, I, and C mark each person.</p>
      </div>
      <div className="panel team-status">
        <strong>{plan.saved ? "Saved for the crew" : "Preview · Not saved yet"}</strong>
        <p>
          {CREW.map((person) => `${person} ${plan[person].length}/${STOPS_PER_DAY}`).join(" · ")}. Open nodes still waiting: {splicer.nodes.filter((node) => node.status !== "completed" && node.status !== "excluded").length}.
        </p>
        {splicer.role === "admin" ? (
        <>
        <button className="primary" onClick={() => splicer.saveRoute({ ...plan, day, saved: true })}>
          Save this day’s split
        </button>
        {plan.saved ? (
          <button
            className="text-button"
            onClick={() => {
              const rebuilt = routeForDay(day, splicer.nodes, { ...splicer.routePlans, [day]: { ...plan, saved: false } });
              splicer.saveRoute({ ...rebuilt, day, saved: true });
            }}
          >
            Rebuild from the nearest nodes
          </button>
        ) : null}
        <button className="text-button" onClick={() => setEditing((current) => !current)}>
          {editing ? "Cancel edit" : "Edit the split by hand"}
        </button>
        {editing ? (
          <div className="team-manual-editor">
            <p>Type the nodes in visit order, separated by commas. They are saved for the selected date.</p>
            <label>
              Daniel
              <textarea rows={3} value={danielText} onChange={(event) => setDanielText(event.target.value)} />
            </label>
            <label>
              Iván
              <textarea rows={3} value={ivanText} onChange={(event) => setIvanText(event.target.value)} />
            </label>
            <label>
              Chris
              <textarea rows={3} value={chrisText} onChange={(event) => setChrisText(event.target.value)} />
            </label>
            <button className="primary" onClick={saveManual}>
              Save this day’s split
            </button>
          </div>
        ) : null}
        </>
        ) : (
          <p className="route-help">Daniel saves the day’s split. Your stops are on Today.</p>
        )}
      </div>
      <div className="team-cards">
        <CrewCard title="Daniel" className="crew-card-daniel" nodes={daniel} />
        <CrewCard title="Iván" className="crew-card-ivan" nodes={ivan} />
        <CrewCard title="Chris" className="crew-card-chris" nodes={chris} />
      </div>
      <p className="route-help">Completed stops drop off the active route and that person’s next day fills back to {STOPS_PER_DAY} from the nearest open nodes. With only one open node, the other two routes stay empty until more work is assigned.</p>
    </>
  );
}

function CrewCard({ title, className, nodes }: { title: string; className: string; nodes: SplicerNode[] }) {
  const points = nodes.map((node) => parseGps(node.gps)).filter((point): point is { lat: number; lng: number } => Boolean(point));
  const url = googleDirections(points);
  const legs = directionLegs(points);
  return (
    <section className={`panel team-card ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{nodes.length ? `${nodes.length} stops` : "No stops this date"}</p>
        </div>
      </div>
      <ol className="route-stop-list">
        {nodes.map((node, index) => (
          <li key={node.code}>
            <span className="stop-number">{index + 1}</span>
            <div>
              <strong>{node.code}</strong>
              <small>{node.address || node.gps || "Location to confirm"}</small>
              {node.gps ? (
                <a href={googleSearch(node.gps)} target="_blank" rel="noreferrer">
                  Navigate to this stop
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <div className="route-navigation">
        {url ? (
          <a className="primary" href={url} target="_blank" rel="noreferrer">
            Open route in Google Maps
          </a>
        ) : (
          <p className="route-help">This route has no stops with coordinates.</p>
        )}
        {legs.length > 1 ? (
          <>
            <p className="route-help">On a phone browser, use these legs to keep every stop:</p>
            {legs.map((leg) => (
              <a key={leg.start} className="text-button" href={leg.url} target="_blank" rel="noreferrer">
                Leg {leg.start}–{leg.end} ↗
              </a>
            ))}
          </>
        ) : null}
      </div>
    </section>
  );
}

function IndividualRoute({ day, setDay }: { day: string; setDay: (day: string) => void }) {
  const splicer = useSplicer();
  const mapRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<"day" | "all">("day");
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [message, setMessage] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const pool = useMemo(() => {
    return splicer.nodes.filter((node) => {
      if (node.status === "completed" || node.status === "excluded" || !parseGps(node.gps)) return false;
      if (scope === "all") return true;
      return agendaDate(node, splicer.anchor) === day;
    });
  }, [splicer.nodes, splicer.anchor, scope, day]);

  useEffect(() => {
    setOrder(pool.map((node) => node.code));
  }, [pool]);

  const ordered = order.map((code) => pool.find((node) => node.code === code)).filter((node): node is SplicerNode => Boolean(node));
  const orderKey = `${ordered.map((node) => `${node.code}:${node.gps}`).join("|")}|${origin ? `${origin.lat},${origin.lng}` : ""}`;

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    let map: LeafletMap | null = null;
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled) return;
        const created = L.map(element).setView([30.63, -96.34], 11);
        map = created;
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(created);
        const bounds: [number, number][] = [];
        const line: [number, number][] = [];
        if (origin) {
          bounds.push([origin.lat, origin.lng]);
          line.push([origin.lat, origin.lng]);
          L.circleMarker([origin.lat, origin.lng], { radius: 8, color: "#1b3a63", fillColor: "#e0b089", fillOpacity: 1 }).addTo(created);
        }
        ordered.forEach((node, index) => {
          const point = parseGps(node.gps);
          if (!point) return;
          const latlng: [number, number] = [point.lat, point.lng];
          line.push(latlng);
          bounds.push(latlng);
          L.marker(latlng, {
            icon: L.divIcon({
              className: "",
              html: `<div class="route-marker">${index + 1}</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            }),
            title: node.code,
          })
            .addTo(created)
            .bindPopup(`<strong>${node.code}</strong><br><a target="_blank" rel="noreferrer" href="${googleSearch(node.gps)}">Open in Google Maps</a>`);
        });
        if (line.length > 1) L.polyline(line, { color: "#1b3a63", dashArray: "6 8", weight: 3 }).addTo(created);
        if (bounds.length > 1) created.fitBounds(bounds, { padding: [28, 28] });
      })
      .catch(() => setMessage("Couldn’t load the map. Reload the page."));
    return () => {
      cancelled = true;
      map?.remove();
    };
  // orderKey already encodes stops and the optional departure point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey]);

  function move(index: number, direction: -1 | 1) {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setMessage("This browser doesn’t share location. You can order the stops by hand.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({ lat: position.coords.latitude, lng: position.coords.longitude });
        setMessage("Updated start. Tap Sort by distance to reorder.");
      },
      () => setMessage("Couldn’t get your location. You can still pick the start in Google Maps."),
    );
  }

  const points = [
    ...(origin ? [origin] : []),
    ...ordered.map((node) => parseGps(node.gps)).filter((point): point is { lat: number; lng: number } => Boolean(point)),
  ];
  const legs = directionLegs(points);

  return (
    <>
      <div className="panel route-toolbar">
        <div>
          <h2>Individual route</h2>
          <p>Suggested order by straight-line distance, not traffic. Adjust it with the arrows.</p>
        </div>
        <label>
          Work date
          <input type="date" value={day} onChange={(event) => event.target.value && setDay(event.target.value)} />
        </label>
        <label>
          Show
          <select value={scope} onChange={(event) => setScope(event.target.value as "day" | "all")}>
            <option value="day">Stops for the day</option>
            <option value="all">All nodes</option>
          </select>
        </label>
        <button className="text-button" onClick={() => setOrder(orderByProximity(ordered, origin).map((node) => node.code))}>
          Sort by distance
        </button>
        <button className="text-button" onClick={useLocation}>
          Use my location as the start
        </button>
        {origin ? (
          <button className="text-button" onClick={() => setOrigin(null)}>
            Clear start
          </button>
        ) : null}
      </div>
      {message ? <p className="route-help">{message}</p> : null}
      <div className="route-layout">
        <div className="panel route-map-panel">
          <div ref={mapRef} className="route-map" role="region" aria-label="Route map" />
          <p className="route-help">Start: Google Maps will use your location or ask you to pick one. The selection and order stay on this device for the date while the page is open.</p>
        </div>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{ordered.length} stops</h2>
              <p>{scope === "day" ? "Open nodes for the chosen date" : "Every active node with coordinates"}</p>
            </div>
          </div>
          <ol className="route-stop-list">
            {ordered.map((node, index) => (
              <li key={node.code}>
                <span className="stop-number">{index + 1}</span>
                <div>
                  <strong>{node.code}</strong>
                  <small>{node.address || node.gps}</small>
                  <a href={googleSearch(node.gps)} target="_blank" rel="noreferrer">
                    Navigate
                  </a>
                </div>
                <div className="route-order">
                  <button aria-label={`Move ${node.code} up`} onClick={() => move(index, -1)} disabled={index === 0}>
                    ↑
                  </button>
                  <button aria-label={`Move ${node.code} down`} onClick={() => move(index, 1)} disabled={index === ordered.length - 1}>
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {!ordered.length ? <div className="empty">No active nodes with coordinates in this view.</div> : null}
          <div className="route-navigation">
            {points.length ? (
              <a className="primary" href={googleDirections(points)} target="_blank" rel="noreferrer">
                Open in Google Maps
              </a>
            ) : null}
            {legs.length > 1
              ? legs.map((leg) => (
                  <a key={leg.start} className="text-button" href={leg.url} target="_blank" rel="noreferrer">
                    Leg {leg.start}–{leg.end} ↗
                  </a>
                ))
              : null}
          </div>
        </section>
      </div>
    </>
  );
}
