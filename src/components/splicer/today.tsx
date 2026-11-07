"use client";

import { MapPin, Navigation } from "lucide-react";
import { useSplicer } from "./provider";
import { driveTo, formatLong, formatShort, googleDriveTo, routeForDay, type SplicerNode } from "@/lib/splicer";

export function TodayView() {
  const splicer = useSplicer();
  const plan = routeForDay(splicer.today, splicer.nodes, splicer.routePlans);
  const stops = plan[splicer.person]
    .map((code) => splicer.nodes.find((node) => node.code === code))
    .filter((node): node is SplicerNode => Boolean(node));
  const nextIndex = stops.findIndex((node) => node.status !== "completed");
  const next = nextIndex >= 0 ? stops[nextIndex] : null;
  const navigate = next ? driveTo(next) : "";
  const google = next ? googleDriveTo(next) : "";
  const preferredNavigation = splicer.preferences.mapApp === "google" ? google : navigate;
  const upcoming = splicer.nodes
    .filter((node) => node.status !== "completed" && node.status !== "excluded" && node.start > splicer.today)
    .sort((a, b) => a.start.localeCompare(b.start) || a.code.localeCompare(b.code));
  const nextStart = upcoming[0]?.start ?? "";
  const starting = nextStart ? upcoming.filter((node) => node.start === nextStart) : [];
  const sharedDue = starting.length && starting.every((node) => node.due && node.due === starting[0].due) ? starting[0].due : "";

  return (
    <div className="today-layout">
      <section className="panel next-stop">
        <span className="eyebrow">{next ? "NEXT STOP" : "TODAY"} · {formatLong(splicer.today)}</span>
        {next ? (
          <>
            <h2>{next.code}</h2>
            <p>{next.address || "Address not listed on the node."}</p>
            <p className="next-meta">
              Stop {nextIndex + 1} of {stops.length}
              {next.job ? ` · ${next.job}` : ""}
              {next.due ? ` · Due ${formatShort(next.due)}` : ""}
              {next.gps ? ` · ${next.gps}` : " · Coordinates still coming"}
              {next.night ? " · Night cut" : ""}
            </p>
            {preferredNavigation ? (
              <a className="navigate" href={preferredNavigation}>
                <Navigation size={18} />
                Navigate
              </a>
            ) : (
              <p className="next-meta">No coordinates yet, so navigation isn’t ready.</p>
            )}
            <div className="next-actions">
              {google ? (
                <a href={google} target="_blank" rel="noreferrer">
                  Google Maps
                </a>
              ) : null}
              {next.map ? (
                <a href={`/maps/${encodeURIComponent(next.map)}`} target="_blank" rel="noreferrer">
                  Map PDF
                </a>
              ) : null}
              <button type="button" onClick={() => splicer.setEditing({ ...next })}>
                Open node
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>{stops.length ? "Today’s stops are finished" : nextStart ? "Nothing starts today" : "No stops on your list"}</h2>
            <p>
              {stops.length
                ? "The next open nodes will fill in tomorrow."
                : nextStart
                  ? `${starting.length} node${starting.length === 1 ? "" : "s"} start ${formatLong(nextStart)}${sharedDue ? ` and are due ${formatLong(sharedDue)}` : ""}.`
                  : "Open the map if the day’s split needs another look."}
            </p>
            <button className="primary today-map" type="button" onClick={() => splicer.setTab("routes")}>
              <MapPin size={16} />
              Open the map
            </button>
          </>
        )}
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Today’s route</h2>
            <p>
              {splicer.person} · {stops.length} stop{stops.length === 1 ? "" : "s"} · unfinished work stays first
            </p>
          </div>
        </div>
        {stops.length ? (
          <ol className="stop-list">
            {stops.map((node, index) => {
              const href = driveTo(node);
              const current = index === nextIndex;
              return (
                <li key={node.code} className={current ? "is-next" : node.status === "completed" ? "is-done" : ""}>
                  <span>{index + 1}</span>
                  <button type="button" onClick={() => splicer.setEditing({ ...node })}>
                    <strong>{node.code}</strong>
                    <small>{node.address || node.gps || "Location to confirm"}</small>
                  </button>
                  {href ? (
                    <a href={href} aria-label={`Navigate to ${node.code}`}>
                      <Navigation size={16} />
                    </a>
                  ) : (
                    <span />
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="empty">
            <strong>{nextStart ? `Starts ${formatShort(nextStart)}` : `Nothing assigned for ${formatShort(splicer.today)}`}</strong>
            <p>
              {nextStart
                ? "These nodes stay off the list until the authorized start."
                : "Finished stops drop off. Nearby open nodes fill your daily target."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
