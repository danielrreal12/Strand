import assert from "node:assert/strict";
import test from "node:test";
import { billingPeriod, billingWeeks, buildDayRoute, crewByPin, mineNodes, personalTotal, routeForDay, seedNodesList, type SplicerNode } from "./splicer.ts";

function sample(code: string, lat: number, lng: number, status: SplicerNode["status"] = "pending"): SplicerNode {
  return {
    code,
    start: "2026-10-27",
    due: "2026-11-03",
    night: false,
    status,
    gps: `${lat}, ${lng}`,
    address: "",
    map: "",
    source: "",
    completed: status === "completed" ? "2026-10-30" : "",
    scheduled: "",
    payDate: "",
    paidDate: "",
    invoice: "",
    job: "",
    invoiceStatus: "pending",
    notes: "",
    reviewStatus: "",
    billingIncluded: true,
    completedBy: "",
  };
}

test("billing periods match the Optimum cuts", () => {
  assert.equal(billingPeriod("2026-10-13").payDate, "2026-10-30");
  assert.equal(billingPeriod("2026-10-20").label, "Second cut · Monday to Thursday");
  const friday = billingPeriod("2026-10-27");
  assert.equal(friday.start, "2026-10-23");
  assert.equal(friday.end, "2026-10-29");
  assert.equal(friday.payDate, "2026-11-13");
  assert.equal(billingPeriod("2026-10-30").payDate, "2026-11-20");
});

test("live board totals stay at 94 completed and $30,800 generated", () => {
  const nodes = seedNodesList();
  assert.equal(nodes.length, 99);
  const active = nodes.filter((node) => node.status !== "excluded");
  const completed = active.filter((node) => node.status === "completed");
  const generated = completed.filter((node) => node.billingIncluded !== false);
  assert.equal(active.length, 97);
  assert.equal(completed.length, 96);
  assert.equal(generated.length * 350, 30800);
  const weeks = billingWeeks(nodes, "2026-11-02");
  const earned = weeks.reduce((sum, week) => sum + week.earned, 0);
  assert.equal(earned, 30800);
  assert.equal(nodes.find((node) => node.code === "B619A")?.status, "pending");
  assert.equal(mineNodes(nodes, "Daniel").length, 17);
  assert.equal(mineNodes(nodes, "Iván").length, 15);
  assert.equal(mineNodes(nodes, "Chris").length, 8);
  assert.equal(nodes.find((node) => node.code === "B214A")?.completed, "2026-10-27");
  assert.equal(nodes.find((node) => node.code === "B214A")?.completedBy, "Daniel");
  assert.equal(nodes.find((node) => node.code === "B165A")?.completedBy, "Chris");
  assert.equal(nodes.find((node) => node.code === "B210A")?.completed, "2026-10-30");
  assert.equal(personalTotal(nodes, "Daniel"), 5600);
  assert.equal(personalTotal(nodes, "Iván"), 5600);
  assert.equal(personalTotal(nodes, "Chris"), 2400);
  assert.equal(crewByPin("5796")?.id, "Daniel");
  assert.equal(crewByPin("0000"), null);
});

test("each person gets at most six nearby stops, and unfinished stops stay first", () => {
  const west = Array.from({ length: 6 }, (_, index) => sample(`W${index}`, 30.6, -96.7 - index * 0.01));
  const mid = Array.from({ length: 6 }, (_, index) => sample(`M${index}`, 30.62, -96.35 - index * 0.01));
  const east = Array.from({ length: 6 }, (_, index) => sample(`E${index}`, 30.58, -96.05 - index * 0.01));
  const nodes = [...west, ...mid, ...east];
  const first = buildDayRoute("2026-11-03", nodes, null);
  for (const person of ["Daniel", "Iván", "Chris"] as const) {
    assert.ok(first[person].length <= 6);
  }
  const assigned = [...first.Daniel, ...first.Iván, ...first.Chris];
  assert.equal(new Set(assigned).size, assigned.length);
  assert.equal(assigned.length, 18);

  const previous = {
    day: "2026-11-03",
    Daniel: ["W0", "W1", "W2", "W3", "W4", "W5"],
    Iván: ["M0", "M1", "M2", "M3", "M4", "M5"],
    Chris: ["E0", "E1", "E2", "E3", "E4", "E5"],
    saved: true,
  };
  const nextNodes = nodes.map((node) => (["E2", "E3", "E4", "E5"].includes(node.code) ? { ...node, status: "completed" as const } : node));
  const extra = Array.from({ length: 4 }, (_, index) => sample(`N${index}`, 30.581, -96.02 - index * 0.01));
  const second = buildDayRoute("2026-11-04", [...nextNodes, ...extra], previous);
  assert.deepEqual(second.Chris.slice(0, 2), ["E0", "E1"]);
  assert.equal(second.Chris.length, 6);
  assert.ok(second.Chris.slice(2).every((code) => code.startsWith("N")));
  assert.deepEqual(second.Daniel, ["W0", "W1", "W2", "W3", "W4", "W5"]);

  const chained = routeForDay("2026-11-04", [...nextNodes, ...extra], { "2026-11-03": previous });
  assert.deepEqual(chained.Chris.slice(0, 2), ["E0", "E1"]);
});
