/**
 * Verify the HMAC signing helper matches the algorithm in
 * spec/ROUTES_AND_CHANNELS.md §1/§7. The expected digest below was generated
 * with the same input fed to a Python `hmac.new(...).hexdigest()` — if these
 * ever drift apart, Fly will start rejecting every request.
 *
 * Run with: node --test lib/flyClient.test.ts
 * (Node 22+ strips TS types natively.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { signForFly } from "./flyClient.ts";

test("signForFly produces the spec-defined HMAC digest", () => {
  const secret = "test-secret";
  const userId = "user-abc";
  const body = '{"topic":"python"}';
  const ts = "1700000000";

  const { sig, ts: returnedTs } = signForFly(userId, body, secret, ts);

  assert.equal(returnedTs, ts);
  assert.equal(
    sig,
    "45b67f96aa2792397eb54695896d02c99de7189b1990ba1f74247643196e4e73",
  );
});

test("signForFly defaults ts to current unix seconds when omitted", () => {
  const before = Math.floor(Date.now() / 1000);
  const { ts } = signForFly("u", "{}", "s");
  const after = Math.floor(Date.now() / 1000);
  const n = Number(ts);
  assert.ok(n >= before && n <= after, `ts ${ts} outside [${before}, ${after}]`);
});
