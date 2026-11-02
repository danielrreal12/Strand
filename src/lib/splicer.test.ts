import assert from "node:assert/strict";
import test from "node:test";
import { billingPeriod, billingWeeks, seedNodesList } from "./splicer.ts";

test("billing periods match the Optimum cuts", () => {
  assert.equal(billingPeriod("2026-10-13").payDate, "2026-10-30");
  assert.equal(billingPeriod("2026-10-20").label, "Segundo corte · Lunes a jueves");
  const friday = billingPeriod("2026-10-27");
  assert.equal(friday.start, "2026-10-23");
  assert.equal(friday.end, "2026-10-29");
  assert.equal(friday.payDate, "2026-11-13");
  assert.equal(billingPeriod("2026-10-30").payDate, "2026-11-20");
});

test("live board totals stay at 94 completed and $30,800 generated", () => {
  const nodes = seedNodesList();
  assert.equal(nodes.length, 97);
  const active = nodes.filter((node) => node.status !== "excluded");
  const completed = active.filter((node) => node.status === "completed");
  const generated = completed.filter((node) => node.billingIncluded !== false);
  assert.equal(active.length, 95);
  assert.equal(completed.length, 94);
  assert.equal(generated.length * 350, 30800);
  const weeks = billingWeeks(nodes, "2026-11-02");
  const earned = weeks.reduce((sum, week) => sum + week.earned, 0);
  assert.equal(earned, 30800);
  assert.equal(nodes.find((node) => node.code === "B619A")?.status, "pending");
});
