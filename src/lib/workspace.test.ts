import assert from "node:assert/strict";
import test from "node:test";
import { buildDayRoute, routeForDay, billingWeeks, expectedWeeklyAmount, type SplicerNode } from "./splicer.ts";
import { normalizePreferences } from "./preferences.ts";
import { productionStats, productionBuckets } from "./production-stats.ts";

test("daily routes respect 5/5/3 targets and authorized starts", () => {
  const nodes = Array.from({ length: 25 }, (_, index) => ({ code: `N${index}`, status: "pending", start: "2026-11-09", completed: "", gps: `30.${600000 + index * 100}, -96.${300000 + index * 100}` }) as SplicerNode);
  const plan = buildDayRoute("2026-11-09", nodes, null);
  assert.deepEqual([plan.Daniel.length, plan.Iván.length, plan.Chris.length], [5, 5, 3]);
  assert.equal(new Set([...plan.Daniel, ...plan.Iván, ...plan.Chris]).size, 13);
  const early = routeForDay("2026-11-08", nodes, { "2026-11-08": { ...plan, day: "2026-11-08", saved: true } });
  assert.equal(early.Daniel.length + early.Iván.length + early.Chris.length, 0);
  const next = buildDayRoute("2026-11-10", nodes, plan);
  assert.equal(next.Daniel[0], plan.Daniel[0]);
  assert.equal(next.Chris.length, 3);
});

test("cycle payments preserve cents, personal separation, and outstanding balances", () => {
  const nodes = ["Daniel", "Iván"].map((completedBy, index) => ({ code: `P${index}`, status: "completed", completed: "2026-11-03", completedBy, payDate: "2026-11-20", paidDate: "" }) as SplicerNode);
  const key = "Daniel:2026-10-30";
  const payments = { [key]: { amount: 100.25, paidDate: "2026-11-20", notes: "Partial" } };
  const week = billingWeeks(nodes, "2026-11-20", "Daniel", payments).find((item) => item.start === "2026-10-30")!;
  assert.equal(week.earned, 350);
  assert.equal(week.received, 100.25);
  assert.equal(week.receivable, 249.75);
  assert.equal(expectedWeeklyAmount(nodes, "2026-11-20", "Daniel", payments), 249.75);
  assert.equal(expectedWeeklyAmount(nodes, "2026-11-20", "Iván", payments), 350);
  payments[key].amount = 350;
  assert.equal(expectedWeeklyAmount(nodes, "2026-11-20", "Daniel", payments), 0);
  payments[key].amount = 0;
  assert.equal(expectedWeeklyAmount(nodes, "2026-11-20", "Daniel", payments), 350);
  assert.ok(nodes.every((node) => node.paidDate === ""));
});

test("comparison graphs retain the selected production totals", () => {
  const nodes = ["Daniel", "Iván", "Chris"].map((completedBy, index) => ({ code: `S${index}`, status: "completed", completed: "2026-11-03", completedBy }) as SplicerNode);
  const stats = productionStats(nodes, "2026-11-03", "2026-11-03");
  for (const mode of ["daily", "weekly", "monthly", "all"] as const) {
    const buckets = productionBuckets(stats, "2026-11-03", "2026-11-03", mode);
    assert.equal(buckets.reduce((sum, bucket) => sum + bucket.counts.Chris, 0), 1);
    assert.equal(buckets.reduce((sum, bucket) => sum + bucket.counts.Daniel, 0), 1);
  }
  assert.equal(normalizePreferences({ defaultTab: "stats", theme: "dark", showOverviewRoute: false }).defaultTab, "stats");
  assert.equal(normalizePreferences({ defaultTab: "settings" }).defaultTab, "overview");
});
