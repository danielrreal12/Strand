"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { PRODUCTION } from "@/lib/data";
import type { SpliceGrade } from "@/lib/types";
import { GradeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";

const FILTERS: Array<{ id: "all" | SpliceGrade; label: string }> = [
  { id: "all", label: "All" },
  { id: "A", label: "Grade A" },
  { id: "B", label: "Grade B" },
  { id: "C", label: "Grade C" },
  { id: "fail", label: "Re-splice" },
];

export function ProductionView() {
  const [filter, setFilter] = useState<"all" | SpliceGrade>("all");

  const rows = useMemo(
    () =>
      PRODUCTION.filter((p) => (filter === "all" ? true : p.grade === filter)).sort(
        (a, b) => (a.timestamp < b.timestamp ? 1 : -1),
      ),
    [filter],
  );

  const avgLoss =
    rows.length === 0
      ? 0
      : rows.reduce((n, r) => n + r.lossDb, 0) / rows.length;
  const passRate =
    rows.length === 0
      ? 0
      : Math.round((rows.filter((r) => r.grade !== "fail").length / rows.length) * 100);

  return (
    <div className="space-y-6">
      <header className="rise-in">
        <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Production
        </h2>
        <p className="mt-1 text-muted-foreground">
          Every fusion logged with loss — catch weak splices before the vault closes.
        </p>
      </header>

      <div className="rise-in rise-in-delay-1 grid gap-3 sm:grid-cols-3">
        <Stat label="Logged splices" value={String(rows.length)} />
        <Stat label="Avg loss" value={`${avgLoss.toFixed(2)} dB`} />
        <Stat label="Pass rate" value={`${passRate}%`} />
      </div>

      <div className="rise-in rise-in-delay-2 flex flex-wrap items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "secondary"}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="rise-in rise-in-delay-3 overflow-hidden rounded-xl border border-border/70 bg-card/50">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No splices match this filter yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border/70 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Fiber</th>
                  <th className="px-4 py-3 font-medium">Tech</th>
                  <th className="px-4 py-3 font-medium">Loss</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {new Date(row.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">{row.jobTitle}</td>
                    <td className="px-4 py-3">{row.fiber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.tech}</td>
                    <td className="px-4 py-3 font-mono">{row.lossDb.toFixed(2)} dB</td>
                    <td className="px-4 py-3">
                      <GradeBadge grade={row.grade} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="font-heading mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
