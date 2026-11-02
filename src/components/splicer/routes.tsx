"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSplicer } from "./provider";
import {
  PREPARED_ROUTE,
  agendaDate,
  directionLegs,
  googleDirections,
  googleSearch,
  orderByProximity,
  parseGps,
  type CrewName,
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
  if (typeof window === "undefined") return Promise.reject(new Error("sin ventana"));
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
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error("No se pudo cargar el mapa. Recarga la página.")));
    script.onerror = () => reject(new Error("No se pudo cargar el mapa. Recarga la página."));
    document.body.appendChild(script);
  });
  return leafletPromise;
}

function nodesFor(codes: string[], nodes: SplicerNode[]) {
  return codes.map((code) => nodes.find((node) => node.code === code)).filter((node): node is SplicerNode => Boolean(node));
}

export function RoutesView() {
  const splicer = useSplicer();
  const initialDay = splicer.today <= PREPARED_ROUTE.day ? PREPARED_ROUTE.day : splicer.selectedDay < splicer.anchor ? splicer.anchor : splicer.selectedDay;
  const [day, setDay] = useState(initialDay);
  const plan = splicer.routePlans[day] ?? {
    day,
    Daniel: [],
    Iván: [],
    extra: day === PREPARED_ROUTE.day ? PREPARED_ROUTE.extra : ("Iván" as CrewName),
    nextExtra: day === PREPARED_ROUTE.day ? PREPARED_ROUTE.nextExtra : ("Daniel" as CrewName),
    saved: false,
  };

  return (
    <>
      <div className="team-mode">
        <button className={splicer.routeMode === "team" ? "primary" : "text-button"} onClick={() => splicer.setRouteMode("team")}>
          Daniel e Iván
        </button>
        <button className={splicer.routeMode === "individual" ? "primary" : "text-button"} onClick={() => splicer.setRouteMode("individual")}>
          Ruta individual / Todos los nodos
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
  const [mapError, setMapError] = useState("");
  const daniel = nodesFor(plan.Daniel, splicer.nodes).filter((node) => node.status !== "completed");
  const ivan = nodesFor(plan.Iván, splicer.nodes).filter((node) => node.status !== "completed");
  const routeKey = `${daniel.map((node) => `${node.code}:${node.gps}`).join("|")}#${ivan.map((node) => `${node.code}:${node.gps}`).join("|")}`;

  useEffect(() => {
    setDanielText(plan.Daniel.join(", "));
    setIvanText(plan.Iván.join(", "));
  }, [plan.Daniel, plan.Iván, day]);

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
          .on("tileerror", () => setMapError("No se pudo cargar parte del mapa. La lista y los enlaces de navegación siguen disponibles."));
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
              .bindPopup(`<strong>${node.code}</strong><br>${node.address || node.gps}<br><a target="_blank" rel="noreferrer" href="${googleSearch(node.gps)}">Abrir en Google Maps</a>`);
          });
          if (line.length > 1) L.polyline(line, { color, dashArray: "6 8", weight: 3 }).addTo(created);
        };
        paint(daniel, "D", "#2563eb", "crew-daniel");
        paint(ivan, "I", "#c2410c", "crew-ivan");
        if (bounds.length > 1) created.fitBounds(bounds, { padding: [28, 28] });
        else if (bounds.length === 1) created.setView(bounds[0], 13);
      })
      .catch((caught) => setMapError(caught instanceof Error ? caught.message : "No se pudo cargar el mapa. Recarga la página."));
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
    splicer.saveRoute({ ...plan, day, Daniel: nextDaniel, Iván: ivan, saved: true });
    setEditing(false);
  }

  return (
    <>
      <div className="panel route-toolbar">
        <div>
          <h2>Daniel e Iván · Rutas del día</h2>
          <p>Reparto diario a las 8 p. m. para la jornada siguiente · Hora de Houston</p>
        </div>
        <label>
          Fecha de trabajo
          <input type="date" value={day} onChange={(event) => event.target.value && setDay(event.target.value)} />
        </label>
        <label>
          Mostrar
          <select defaultValue="both" aria-label="Mostrar">
            <option value="both">Ambas rutas</option>
          </select>
        </label>
      </div>
      {mapError ? (
        <p className="error" role="alert">
          {mapError}
        </p>
      ) : null}
      <div className="panel route-map-panel team-map">
        <div ref={mapRef} className="route-map" role="region" aria-label="Mapa de las rutas de Daniel e Iván" />
        <div className="route-legend">
          <strong className="daniel-label">● Daniel · Azul</strong>
          <strong className="ivan-label">● Iván · Naranja</strong>
        </div>
        <p className="route-help">Agrupadas por cercanía entre coordenadas. Líneas punteadas: orden de paradas; Google Maps calcula las calles y el tráfico. Los números D e I identifican a cada persona.</p>
      </div>
      <div className="panel team-status">
        <strong>{plan.saved ? "Reparto guardado en este dispositivo" : "Vista previa · Aún no guardada"}</strong>
        <p>
          {plan.extra ? `Nodo extra de este reparto: ${plan.extra}.` : "Reparto sin nodo extra."} Próximo extra: {plan.nextExtra}.
        </p>
        {!plan.saved ? (
          <button className="primary" onClick={() => splicer.saveRoute({ ...plan, day, saved: true })}>
            Guardar reparto de este día
          </button>
        ) : null}
        <button className="text-button" onClick={() => setEditing((current) => !current)}>
          {editing ? "Cancelar edición" : "Editar reparto manualmente"}
        </button>
        {editing ? (
          <div className="team-manual-editor">
            <p>Escribe los nodos en el orden de visita, separados por comas. Se guardarán para la fecha seleccionada.</p>
            <label>
              Daniel
              <textarea rows={3} value={danielText} onChange={(event) => setDanielText(event.target.value)} />
            </label>
            <label>
              Tu ruta · Iván
              <textarea rows={3} value={ivanText} onChange={(event) => setIvanText(event.target.value)} />
            </label>
            <button className="primary" onClick={saveManual}>
              Guardar reparto de este día
            </button>
          </div>
        ) : null}
      </div>
      <div className="team-cards">
        <CrewCard title="Daniel" className="crew-card-daniel" nodes={daniel} />
        <CrewCard title="Tu ruta · Iván" className="crew-card-ivan" nodes={ivan} />
      </div>
      <p className="route-help">Los completados se ocultan de la ruta activa sin cambiar la asignación guardada. El reparto del 3 de noviembre deja B619A con Iván: es el único nodo pendiente y su inicio autorizado es el 27 de octubre.</p>
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
          <p>{nodes.length ? `${nodes.length} paradas` : "Sin paradas en esta fecha"}</p>
        </div>
      </div>
      <ol className="route-stop-list">
        {nodes.map((node, index) => (
          <li key={node.code}>
            <span className="stop-number">{index + 1}</span>
            <div>
              <strong>{node.code}</strong>
              <small>{node.address || node.gps || "Ubicación por confirmar"}</small>
              {node.gps ? (
                <a href={googleSearch(node.gps)} target="_blank" rel="noreferrer">
                  Navegar a esta parada
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      <div className="route-navigation">
        {url ? (
          <a className="primary" href={url} target="_blank" rel="noreferrer">
            Abrir ruta en Google Maps
          </a>
        ) : (
          <p className="route-help">Esta ruta no tiene paradas con coordenadas.</p>
        )}
        {legs.length > 1 ? (
          <>
            <p className="route-help">En navegador móvil, usa estos tramos para conservar todas las paradas:</p>
            {legs.map((leg) => (
              <a key={leg.start} className="text-button" href={leg.url} target="_blank" rel="noreferrer">
                Tramo {leg.start}–{leg.end} ↗
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
          L.circleMarker([origin.lat, origin.lng], { radius: 8, color: "#214c3b", fillColor: "#d3eea5", fillOpacity: 1 }).addTo(created);
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
            .bindPopup(`<strong>${node.code}</strong><br><a target="_blank" rel="noreferrer" href="${googleSearch(node.gps)}">Abrir en Google Maps</a>`);
        });
        if (line.length > 1) L.polyline(line, { color: "#597a42", dashArray: "6 8", weight: 3 }).addTo(created);
        if (bounds.length > 1) created.fitBounds(bounds, { padding: [28, 28] });
      })
      .catch(() => setMessage("No se pudo cargar el mapa. Recarga la página."));
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
      setMessage("Este navegador no ofrece ubicación. Puedes ordenar las paradas manualmente.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({ lat: position.coords.latitude, lng: position.coords.longitude });
        setMessage("Salida actualizada. Pulsa “Ordenar por cercanía” para reorganizar.");
      },
      () => setMessage("No se obtuvo tu ubicación. Puedes continuar y elegir la salida en Google Maps."),
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
          <h2>Ruta individual</h2>
          <p>Orden sugerido por distancia entre coordenadas, sin tráfico. Puedes ajustarlo con las flechas.</p>
        </div>
        <label>
          Fecha de trabajo
          <input type="date" value={day} onChange={(event) => event.target.value && setDay(event.target.value)} />
        </label>
        <label>
          Mostrar
          <select value={scope} onChange={(event) => setScope(event.target.value as "day" | "all")}>
            <option value="day">Pendientes del día</option>
            <option value="all">Todos los nodos</option>
          </select>
        </label>
        <button className="text-button" onClick={() => setOrder(orderByProximity(ordered, origin).map((node) => node.code))}>
          Ordenar por cercanía
        </button>
        <button className="text-button" onClick={useLocation}>
          Usar mi ubicación de salida
        </button>
        {origin ? (
          <button className="text-button" onClick={() => setOrigin(null)}>
            Quitar salida
          </button>
        ) : null}
      </div>
      {message ? <p className="route-help">{message}</p> : null}
      <div className="route-layout">
        <div className="panel route-map-panel">
          <div ref={mapRef} className="route-map" role="region" aria-label="Mapa de la ruta" />
          <p className="route-help">Salida: Google Maps usará tu ubicación o te pedirá elegirla. La selección y el orden se guardan por fecha en este dispositivo mientras la página sigue abierta.</p>
        </div>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{ordered.length} paradas</h2>
              <p>{scope === "day" ? "Pendientes de la fecha elegida" : "Todos los nodos activos con coordenadas"}</p>
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
                    Navegar
                  </a>
                </div>
                <div className="route-order">
                  <button aria-label={`Subir ${node.code}`} onClick={() => move(index, -1)} disabled={index === 0}>
                    ↑
                  </button>
                  <button aria-label={`Bajar ${node.code}`} onClick={() => move(index, 1)} disabled={index === ordered.length - 1}>
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {!ordered.length ? <div className="empty">No hay nodos activos con coordenadas para esta vista.</div> : null}
          <div className="route-navigation">
            {points.length ? (
              <a className="primary" href={googleDirections(points)} target="_blank" rel="noreferrer">
                Abrir en Google Maps
              </a>
            ) : null}
            {legs.length > 1
              ? legs.map((leg) => (
                  <a key={leg.start} className="text-button" href={leg.url} target="_blank" rel="noreferrer">
                    Tramo {leg.start}–{leg.end} ↗
                  </a>
                ))
              : null}
          </div>
        </section>
      </div>
    </>
  );
}
