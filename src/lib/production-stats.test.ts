import assert from "node:assert/strict";
import test from "node:test";
import { productionStats } from "./production-stats.ts";
import type { SplicerNode } from "./splicer.ts";

function node(code: string, completed: string, completedBy = "Daniel", status = "completed") {
  return { code, completed, completedBy, status, billingIncluded: false } as SplicerNode;
}

test("production compares completions by worker, independent of billing flags", () => {
  const result = productionStats([node("D1", "2026-11-03"), node("D2", "2026-11-03"), node("D3", "2026-11-04"), node("I1", "2026-11-03", "Iván"), node("C1", "2026-11-04", "Chris"), node("P", "2026-11-03", "Daniel", "pending"), node("X", "2026-11-03", "Daniel", "excluded")]);
  assert.equal(result.total, 5);
  assert.deepEqual(result.people.map((person) => person.count), [3, 1, 1]);
  assert.equal(result.people[0].activeDays, 2);
  assert.equal(result.people[0].average, 1.5);
  assert.equal(result.people[0].bestDay, 2);
  assert.equal(result.people[0].share, 60);
  assert.deepEqual(result.days.map((day) => day.day), ["2026-11-04", "2026-11-03"]);
});

test("production filters include boundary dates and keep unknown workers separate", () => {
  const result = productionStats([node("EARLY", "2026-11-02"), node("START", "2026-11-03"), node("END", "2026-11-05", "Chris"), node("LATE", "2026-11-06"), node("UNKNOWN", "2026-11-04", ""), node("UNDATED", "")], "2026-11-03", "2026-11-05");
  assert.equal(result.total, 3);
  assert.equal(result.attributed, 2);
  assert.equal(result.unassigned, 1);
  assert.equal(result.undated, 1);
  assert.deepEqual(result.people.map((person) => person.count), [1, 0, 1]);
  assert.equal(result.days.reduce((sum, day) => sum + day.total, 0), result.total);
  assert.equal(result.days.find((day) => day.day === "2026-11-04")?.unassigned, 1);
});

test("empty production periods have zero metrics", () => {
  const result = productionStats([]);
  assert.equal(result.total, 0);
  assert.deepEqual(result.days, []);
  assert.ok(result.people.every((person) => person.count === 0 && person.average === 0 && person.share === 0 && person.bestDay === 0));
});
