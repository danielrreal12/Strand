import assert from "node:assert/strict";
import test from "node:test";
import { mailToNode } from "./parse";

test("reads start, due, map coordinates, and access notes", () => {
  const node = mailToNode({
    id: "m1",
    from: "Anthoney <anthoney@example.com>",
    subject: "Week of Nov 2",
    date: "Sun, 1 Nov 2026",
    body: `Node 14B
Address: 418 Cascade Ave
Can start: Nov 3
Due: Nov 7, 2026
https://www.google.com/maps/place/418+Cascade+Ave/@29.76040,-95.36980,17z
Gate code 4412`,
  });

  assert.equal(node.node, "14B");
  assert.equal(node.address, "418 Cascade Ave");
  assert.equal(node.canStart, "Nov 3");
  assert.equal(node.due, "Nov 7, 2026");
  assert.equal(node.latitude, 29.7604);
  assert.equal(node.longitude, -95.3698);
  assert.equal(node.pay, 350);
  assert.match(node.access ?? "", /Gate code 4412/);
  assert.match(node.mapUrl ?? "", /google\.com\/maps/);
});

test("does not invent a date or coordinate that is not in the mail", () => {
  const node = mailToNode({
    id: "m2",
    from: "Anthoney <anthoney@example.com>",
    subject: "Node 3",
    date: "Mon, 2 Nov 2026",
    body: "Node 3 is on the list. No schedule in this note.",
  });
  assert.equal(node.node, "3");
  assert.equal(node.canStart, "—");
  assert.equal(node.due, "—");
  assert.equal(node.latitude, null);
  assert.equal(node.longitude, null);
  assert.equal(node.mapUrl, undefined);
});
