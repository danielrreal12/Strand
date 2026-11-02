"use client";

import { Activity, CalendarDays, CircleDollarSign, Users } from "lucide-react";
import { CREW, INVOICES, JOBS, PRODUCTION } from "@/lib/data";
import { JobBadge, GradeBadge } from "@/components/status-badge";

function todayIso() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function OverviewView() {
  const today = todayIso();
  const todaysJobs = JOBS.filter((j) => j.date === today);
  const live = todaysJobs.filter((j) => j.status === "in_progress");
  const onSite = CREW.filter((c) => c.status === "on_site").length;
  const overdue = INVOICES.filter((i) => i.status === "overdue");
  const recent = PRODUCTION.slice(0, 4);
  const splicesToday = todaysJobs.reduce((n, j) => n + j.splicesDone, 0);
  const splicesPlanned = todaysJobs.reduce((n, j) => n + j.splicesPlanned, 0);
  const pct =
    splicesPlanned === 0 ? 0 : Math.round((splicesToday / splicesPlanned) * 100);

  return (
    <div className="space-y-8">
      <header className="rise-in">
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Today on the strand
        </h2>
        <p className="mt-1 max-w-xl text-muted-foreground">
          Live jobs, crew presence, and cash still sitting in the field.
        </p>
      </header>

      <div className="rise-in rise-in-delay-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Live jobs",
            value: String(live.length),
            hint: `${todaysJobs.length} on the board today`,
            icon: Activity,
          },
          {
            label: "Splices logged",
            value: `${splicesToday}/${splicesPlanned}`,
            hint: `${pct}% of today’s plan`,
            icon: CalendarDays,
          },
          {
            label: "Crew on site",
            value: String(onSite),
            hint: `${CREW.length} total rostered`,
            icon: Users,
          },
          {
            label: "Overdue invoices",
            value: String(overdue.length),
            hint:
              overdue.length === 0
                ? "Books are clean"
                : `$${overdue.reduce((n, i) => n + i.amount, 0).toLocaleString()} open`,
            icon: CircleDollarSign,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {stat.label}
              </p>
              <stat.icon className="size-4 text-primary/80" />
            </div>
            <p className="font-heading mt-3 text-3xl font-bold tracking-tight">
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="rise-in rise-in-delay-2 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h3 className="font-heading text-lg font-semibold">Today’s jobs</h3>
          <ul className="mt-3 space-y-2">
            {todaysJobs.length === 0 ? (
              <li className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No jobs scheduled for today — enjoy the quiet window.
              </li>
            ) : (
              todaysJobs.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{job.title}</p>
                      <JobBadge status={job.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {job.start}–{job.end} · {job.client} · {job.address}
                    </p>
                  </div>
                  <div className="min-w-[140px]">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Splices</span>
                      <span>
                        {job.splicesDone}/{job.splicesPlanned || "—"}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${
                            job.splicesPlanned
                              ? Math.min(
                                  100,
                                  (job.splicesDone / job.splicesPlanned) * 100,
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="lg:col-span-2">
          <h3 className="font-heading text-lg font-semibold">Latest splices</h3>
          <ul className="mt-3 space-y-2">
            {recent.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-border/70 bg-card/50 p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{entry.fiber}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.tech} · {entry.lossDb.toFixed(2)} dB
                    </p>
                  </div>
                  <GradeBadge grade={entry.grade} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
