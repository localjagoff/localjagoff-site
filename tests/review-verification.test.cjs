const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

async function invoke({ env = {}, token, body = {}, method = "POST", sdk } = {}) {
  let calls = 0;
  const sandbox = { module: { exports: {} }, Buffer, URL,
    process: { env: { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "fix/checkout-draft-integrity",
      STRIPE_SECRET_KEY: "sk_test_fixture", SITE_URL: "https://review-example.vercel.app",
      VERCEL_AUTOMATION_BYPASS_SECRET: "fixture-token", ...env } },
    require(name) { if (name === "node:crypto") return crypto;
      if (name === "stripe") return function () { calls++; return sdk; };
      throw new Error("Unexpected dependency"); } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../api/review-verification.js"), "utf8"), sandbox);
  const response = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await sandbox.module.exports({ method, headers: { "x-commerce-verification-token": token }, body }, response);
  return { ...response, calls };
}

test("temporary review tooling fails closed before provider access", async () => {
  for (const env of [{ VERCEL_ENV: "production" }, { VERCEL_GIT_COMMIT_REF: "main" },
    { STRIPE_SECRET_KEY: "sk_live_fixture" }]) {
    const r = await invoke({ env, token: "fixture-token" });
    assert.equal(r.statusCode, 404); assert.equal(r.calls, 0);
  }
  for (const token of [undefined, "bad", "fixture-tokem"]) {
    const r = await invoke({ token }); assert.equal(r.statusCode, 403); assert.equal(r.calls, 0);
  }
  const r = await invoke({ token: "fixture-token", method: "GET" });
  assert.equal(r.statusCode, 405); assert.equal(r.calls, 0);
});

test("review webhook update is restricted to existing same-origin TEST destination and redacts access", async () => {
  let updated;
  const sdk = { webhookEndpoints: {
    retrieve: async () => ({ id: "we_fixture", livemode: false, url: "https://review-example.vercel.app/api/webhook" }),
    update: async (id, value) => { updated = value; return { id, livemode: false, status: "enabled", enabled_events: value.enabled_events }; },
  } };
  const r = await invoke({ token: "fixture-token", body: { action: "configure-test-webhook", endpointId: "we_fixture" }, sdk });
  assert.equal(r.statusCode, 200);
  assert.match(updated.url, /x-vercel-protection-bypass=fixture-token$/);
  assert.equal(JSON.stringify(r.body).includes("fixture-token"), false);
  assert.equal(r.body.events.length, 2);
  sdk.webhookEndpoints.retrieve = async () => ({ livemode: false, url: "https://www.example.com/api/webhook" });
  assert.equal((await invoke({ token: "fixture-token", body: { action: "configure-test-webhook", endpointId: "we_fixture" }, sdk })).statusCode, 409);
});
