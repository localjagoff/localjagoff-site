const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const path = require("node:path");

let server;
let exited;
let origin;
let startup = "";

before(async () => {
  const socket = net.createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  origin = `http://127.0.0.1:${port}`;
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
  for (const key of Object.keys(env)) {
    if (/^(STRIPE|PRINTFUL|RESEND|PROMO_ADMIN)/.test(key)) delete env[key];
  }
  server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start",
    "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: path.resolve(__dirname, ".."), env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  exited = once(server, "exit");
  server.stdout.on("data", data => { startup += data; });
  server.stderr.on("data", data => { startup += data; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error("Local server exited: " + startup);
    try { if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Local server did not become ready: " + startup);
});

after(async () => {
  if (server && server.exitCode === null) server.kill();
  if (exited) await exited;
});

for (const route of ["/", "/tees", "/hoodies", "/hats", "/cart", "/success", "/product/430697388"]) {
  test(`built storefront HTML responds: ${route}`, async () => {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /__NEXT_DATA__/);
  });
}

test("unused image optimization endpoint is disabled", async () => {
  const response = await fetch(origin + "/_next/image?url=%2Ffavicon.ico&w=64&q=75");
  assert.equal(response.status, 404);
});

test("promo middleware fails closed without credentials", async () => {
  const response = await fetch(origin + "/admin/promo-generator");
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
