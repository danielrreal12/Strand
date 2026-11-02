"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CREW, JOBS } from "@/lib/data";
import type { Job } from "@/lib/types";
import { JobBadge } from "@/components/status-badge";

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday start
  d.setDate(d.getDate() - day);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDay(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

export function CalendarView() {
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [selectedId, setSelectedId] = useState<string | null>(
    () => JOBS.find((j) => j.status === "in_progress")?.id ?? JOBS[0]?.id ?? null,
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)),
    [anchor],
  );

  const selected = JOBS.find((j) => j.id === selectedId) ?? null;
  const today = toIso(new Date());

  return (
    <div className="space-y-6">
      <header className="rise-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Calendar
          </h2>
          <p className="mt-1 text-muted-foreground">
            Week of{" "}
            {anchor.toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            aria-label="Previous week"
            onClick={() => setAnchor((a) => addDays(a, -7))}
          >
            <ChevronLeft />
          </Button>
          <Button variant="secondary" onClick={() => setAnchor(startOfWeek(new Date()))}>
            This week
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Next week"
            onClick={() => setAnchor((a) => addDays(a, 7))}
          >
            <ChevronRight />
          </Button>
        </div>
      </header>

      <div className="rise-in rise-in-delay-1 grid gap-3 md:grid-cols-7">
        {days.map((day) => {
          const iso = toIso(day);
          const jobs = JOBS.filter((j) => j.date === iso);
          const isToday = iso === today;
          return (
            <div
              key={iso}
              className={`min-h-[160px] rounded-xl border p-3 ${
                isToday
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/70 bg-card/40"
              }`}
            >
              <p
                className={`text-xs font-medium tracking-wide uppercase ${
                  isToday ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {formatDay(day)}
              </p>
              <ul className="mt-2 space-y-1.5">
                {jobs.length === 0 ? (
                  <li className="pt-6 text-center text-[11px] text-muted-foreground/70">
                    Clear
                  </li>
                ) : (
                  jobs.map((job) => (
                    <li key={job.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(job.id)}
                        className={`w-full rounded-lg border px-2 py-1.5 text-left transition hover:border-primary/40 ${
                          selectedId === job.id
                            ? "border-primary/50 bg-primary/10"
                            : "border-transparent bg-muted/40"
                        }`}
                      >
                        <p className="truncate text-xs font-medium">{job.title}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {job.start}
                        </p>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>

      <JobDetail job={selected} />
    </div>
  );
}

function JobDetail({ job }: { job: Job | null }) {
  if (!job) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Select a job to see crew, address, and splice progress.
      </div>
    );
  }

  const crew = CREW.filter((c) => job.crewIds.includes(c.id));

  return (
    <section className="rise-in rise-in-delay-2 rounded-xl border border-border/70 bg-card/60 p-5 backdrop-blur-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-xl font-semibold">{job.title}</h3>
            <JobBadge status={job.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.client} · {job.date} · {job.start}–{job.end}
          </p>
        </div>
        <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 text-copper" />
          {job.address}
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Progress
          </p>
          <p className="font-heading mt-1 text-2xl font-bold">
            {job.splicesDone}
            <span className="text-base font-normal text-muted-foreground">
              /{job.splicesPlanned}
            </span>
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Crew</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {crew.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-sm"
              >
                {c.name}
                <span className="text-muted-foreground"> · {c.role}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {job.notes ? (
        <p className="mt-4 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {job.notes}
        </p>
      ) : null}
    </section>
  );
}
