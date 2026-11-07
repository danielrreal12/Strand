import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { memberByPin } from "./crew.server.ts";
import { judgeAttempt, readToken, signToken } from "./session.server.ts";
import { billingPeriod, billingWeeks, buildDayRoute, completedBetween, csvFor, mergeNodeEdit, mineNodes, payrollWeek, personalTotal, presentNodes, routeForDay, seedNodesList, shareAmount, weekBounds, type SplicerNode } from "./splicer.ts";

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

test("weekly pay covers the Friday–Thursday cycle paid two weeks out", () => {
  for (const today of ["2026-11-20", "2026-11-21", "2026-11-26"]) {
    assert.deepEqual(payrollWeek(today), { start: "2026-10-30", end: "2026-11-05", payDate: "2026-11-20" });
  }
  assert.equal(payrollWeek("2026-11-27").start, "2026-11-06");
  assert.equal(payrollWeek("2026-11-19").payDate, "2026-11-13");
  const nodes = ["2026-10-29", "2026-10-30", "2026-11-05", "2026-11-06"].map((completed, index) => ({
    ...sample(`PAY${index}`, 30, -96, "completed"), completed, completedBy: "Daniel" as const,
  }));
  const period = payrollWeek("2026-11-20");
  const payable = completedBetween(nodes, period.start, period.end);
  assert.deepEqual(payable.map((node) => node.completed), ["2026-10-30", "2026-11-05"]);
  assert.equal(personalTotal(payable, "Daniel"), 350);
});

test("Chris's completions never enter Daniel and Iván's shared billing", () => {
  const chris = { ...sample("CHRIS", 30, -96, "completed"), completedBy: "Chris" as const };
  for (const billingIncluded of [undefined, true, false]) {
    const node = { ...chris, billingIncluded };
    assert.equal(shareAmount(node, "Daniel"), 0);
    assert.equal(shareAmount(node, "Iván"), 0);
    assert.equal(shareAmount(node, "Chris"), 300);
  }
  assert.equal(csvFor([chris], "Daniel").split("\n")[1].split(",")[8], '"0"');
  assert.equal(csvFor([chris], "Iván").split("\n")[1].split(",")[8], '"0"');
  assert.equal(csvFor([chris], "Chris").split("\n")[1].split(",")[8], '"300"');
  const daniel = { ...sample("DANIEL", 30, -96, "completed"), completedBy: "Daniel" as const };
  const ivan = { ...sample("IVAN", 30, -96, "completed"), completedBy: "Iván" as const };
  const nodes = [chris, daniel, ivan];
  assert.equal(personalTotal(nodes, "Daniel"), 350);
  assert.equal(personalTotal(nodes, "Iván"), 350);
  assert.equal(personalTotal(nodes, "Chris"), 300);
  const weeks = billingWeeks(nodes, "2026-11-20", "Daniel");
  assert.equal(weeks.reduce((sum, week) => sum + week.earned, 0), 350);
  assert.ok(weeks.every((week) => week.nodes.every((node) => node.completedBy !== "Chris")));
});

test("live board totals stay at 97 completed and $30,800 generated", () => {
  const nodes = seedNodesList();
  assert.equal(nodes.length, 119);
  const active = nodes.filter((node) => node.status !== "excluded");
  const completed = active.filter((node) => node.status === "completed");
  const generated = completed.filter((node) => node.billingIncluded !== false);
  assert.equal(active.length, 117);
  assert.equal(completed.length, 97);
  assert.equal(generated.length * 350, 30800);
  const weeks = billingWeeks(nodes, "2026-11-02");
  const earned = weeks.reduce((sum, week) => sum + week.earned, 0);
  assert.equal(earned, 30800);
  assert.equal(nodes.find((node) => node.code === "B619A")?.status, "completed");
  assert.equal(nodes.find((node) => node.code === "B619A")?.completedBy, "Chris");
  assert.equal(nodes.find((node) => node.code === "B619A")?.completed, "2026-10-30");
  assert.equal(mineNodes(nodes, "Daniel").length, 45);
  assert.equal(mineNodes(nodes, "Iván").length, 43);
  assert.equal(mineNodes(nodes, "Chris").length, 9);
  assert.equal(nodes.filter((node) => node.status === "completed" && !node.completedBy).length, 0);
  assert.equal(nodes.find((node) => node.code === "B214A")?.completed, "2026-10-27");
  assert.equal(nodes.find((node) => node.code === "B214A")?.completedBy, "Daniel");
  assert.equal(nodes.find((node) => node.code === "B165A")?.completedBy, "Chris");
  assert.equal(nodes.find((node) => node.code === "B210A")?.completed, "2026-10-30");
  assert.equal(personalTotal(nodes, "Daniel"), 15400);
  assert.equal(personalTotal(nodes, "Iván"), 15400);
  assert.equal(personalTotal(nodes, "Chris"), 2700);
  const unnamed = { ...sample("Z9A", 30, -96, "completed"), completedBy: "", billingIncluded: true };
  assert.equal(shareAmount(unnamed, "Daniel"), 175);
  assert.equal(shareAmount(unnamed, "Chris"), 0);
  const offBilling = { ...sample("Z9B", 30, -96, "completed"), completedBy: "Chris", billingIncluded: false };
  assert.equal(shareAmount(offBilling, "Daniel"), 0);
  assert.equal(shareAmount(offBilling, "Chris"), 300);
  const added = [
    "B220A",
    "B223A",
    "B223B",
    "B223X",
    "B224A",
    "B224X",
    "B227A",
    "B227B",
    "B227C",
    "B227X",
    "B230A",
    "B287A",
    "B287X",
    "B374A",
    "B379A",
    "B383A",
    "B384A",
    "B445X",
    "B555A",
    "B567A",
  ];
  const jobs: Record<string, string> = {
    B220A: "WISE-001970",
    B223A: "WISE-001978",
    B223B: "WISE-001979",
    B223X: "WISE-001980",
    B224A: "WISE-001982",
    B224X: "WISE-002095",
    B227A: "WISE-001989",
    B227B: "WISE-001990",
    B227C: "WISE-001991",
    B227X: "WISE-001992",
    B230A: "WISE-001995",
    B287A: "WISE-001997",
    B287X: "WISE-001998",
    B374A: "WISE-001969",
    B379A: "WISE-001973",
    B383A: "WISE-001981",
    B384A: "WISE-001996",
    B445X: "WISE-001993",
    B555A: "WISE-001984",
    B567A: "WISE-001983",
  };
  for (const code of added) {
    const node = nodes.find((item) => item.code === code);
    assert.ok(node, code);
    assert.equal(node.status, "pending");
    assert.equal(node.completed, "");
    assert.equal(node.completedBy, "");
    assert.equal(node.start, "2026-11-03");
    assert.equal(node.due, "2026-11-10");
    assert.equal(node.job, jobs[code]);
    assert.match(node.gps, /^-?\d+\.\d+, -?\d+\.\d+$/);
    assert.equal(node.map, `${code}_Overall Map.pdf`);
  }
  const monday = routeForDay("2026-11-02", nodes, {});
  assert.equal([...monday.Daniel, ...monday.Iván, ...monday.Chris].length, 0);
  const tuesday = routeForDay("2026-11-03", nodes, {});
  const assigned = [...tuesday.Daniel, ...tuesday.Iván, ...tuesday.Chris];
  assert.equal(assigned.length, 18);
  assert.ok(assigned.every((code) => added.includes(code)));
  assert.equal(memberByPin("5796")?.id, "Daniel");
  assert.equal(memberByPin("6841")?.role, "splicer");
  assert.equal(memberByPin("0000"), null);
  assert.equal(readFileSync(new URL("./splicer.ts", import.meta.url), "utf8").includes("5796"), false);
  assert.equal(weekBounds("2026-11-04").start, "2026-10-30");
  assert.equal(weekBounds("2026-11-04").end, "2026-11-05");
  assert.equal(weekBounds("2026-10-30").start, "2026-10-30");
  assert.equal(weekBounds("2026-10-29").end, "2026-10-29");
});

test("splicers can log their own completion and cannot rewrite payment records", () => {
  const previous = sample("B1", 30.6, -96.3);
  previous.invoice = "101A";
  previous.paidDate = "";
  const incoming = { ...previous, status: "completed" as const, completed: "2026-11-02", completedBy: "Daniel" as const, payDate: "2026-11-13", paidDate: "2026-11-20", invoice: "HACK", notes: "done" };
  const merged = mergeNodeEdit(previous, incoming, "splicer", "Iván");
  assert.equal(merged.completedBy, "Iván");
  assert.equal(merged.status, "completed");
  assert.equal(merged.invoice, "101A");
  assert.equal(merged.paidDate, "");
  assert.equal(merged.payDate, "");
  assert.equal(merged.notes, "done");

  const locked = { ...previous, status: "completed" as const, completedBy: "Daniel" as const, completed: "2026-10-30", paidDate: "2026-11-01", notes: "keep" };
  const untouched = mergeNodeEdit(locked, { ...locked, notes: "changed", paidDate: "" }, "splicer", "Iván");
  assert.equal(untouched.notes, "keep");
  assert.equal(untouched.paidDate, "2026-11-01");

  const admin = mergeNodeEdit(previous, incoming, "admin", "Daniel");
  assert.equal(admin.invoice, "HACK");
  assert.equal(admin.completedBy, "Daniel");

  const hidden = presentNodes([locked], "splicer", "Chris");
  assert.equal(hidden[0]?.paidDate, "");
  assert.equal(hidden[0]?.invoice, "");
  assert.equal(presentNodes([locked], "admin", "Daniel")[0]?.paidDate, "2026-11-01");
});

test("a session token fails closed", () => {
  const token = signToken({ id: "Chris", role: "splicer", exp: 5_000 }, "test-secret");
  assert.equal(readToken(token, "test-secret", 1_000)?.id, "Chris");
  assert.equal(readToken(token, "other-secret", 1_000), null);
  assert.equal(readToken(token, "test-secret", 9_000), null);
  let state = { fails: 0, lockedUntil: 0 };
  for (let index = 0; index < 4; index += 1) state = judgeAttempt(state, false, 0).state;
  assert.equal(judgeAttempt(state, false, 0).locked, true);
  assert.equal(judgeAttempt({ fails: 2, lockedUntil: 0 }, true, 0).state.fails, 0);
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

test("Tuesday November 3 keeps the hand split and leaves Chris at zero", () => {
  const nodes = seedNodesList();
  const plan = {
    day: "2026-11-03",
    Daniel: ["B223A", "B223B", "B223X", "B379A", "B383A"],
    Iván: ["B224A", "B224X", "B230A", "B555A", "B445X"],
    Chris: [] as string[],
    saved: true,
  };
  const today = routeForDay("2026-11-03", nodes, { "2026-11-03": plan });
  assert.deepEqual(today.Daniel, plan.Daniel);
  assert.deepEqual(today.Iván, plan.Iván);
  assert.deepEqual(today.Chris, []);
  assert.equal(today.saved, true);
});
