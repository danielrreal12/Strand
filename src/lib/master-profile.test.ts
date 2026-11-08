import assert from "node:assert/strict";
import test from "node:test";
import { memberByPin, memberById } from "./crew.server.ts";
import { readToken, signToken } from "./session.server.ts";
import { CREW, ROUTE_TARGETS } from "./splicer.ts";

test("Master has a distinct administrator login and is not a crew worker", () => {
  assert.equal(memberByPin("0000")?.id, "Master");
  assert.equal(memberById("Master")?.role, "admin");
  assert.equal(memberByPin("5796")?.id, "Daniel");
  assert.equal(memberByPin("6841")?.id, "Iván");
  assert.equal(memberByPin("9135")?.id, "Chris");
  assert.deepEqual(CREW, ["Daniel", "Iván", "Chris"]);
  assert.deepEqual(Object.values(ROUTE_TARGETS), [5, 5, 3]);
});

test("Master sessions require administrator role and retain normal expiry checks", () => {
  const token = signToken({ id: "Master", role: "admin", exp: 5000 }, "test");
  assert.equal(readToken(token, "test", 1000)?.id, "Master");
  assert.equal(readToken(token, "test", 6000), null);
  assert.equal(readToken(token, "wrong-secret", 1000), null);
  assert.equal(readToken(signToken({ id: "Master", role: "splicer", exp: 5000 }, "test"), "test", 1000), null);
});
