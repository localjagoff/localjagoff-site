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
    if (/^(STRIPE|PRINTFUL|RESEND|PROMO_ADMIN|COMMUNICATIONS|CUSTOMER_EMAIL|DATABASE|CRON_SECRET)/.test(key)) delete env[key];
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

for (const route of ["/", "/tees", "/hoodies", "/hats", "/stuff-nat", "/cart", "/success", "/review", "/arcade", "/jagoff-jump", "/yinzer-invaders"]) {
  test(`built storefront HTML responds: ${route}`, async () => {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /__NEXT_DATA__/);
  });
}

test('retired arcade routes redirect without loading their old game', async () => {
  for (const route of ['/bridge-rage','/fry-catcher','/pothole-patrol','/parking-chair-panic']) {
    const response = await fetch(origin + route, { redirect: 'manual' });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), '/arcade');
  }
});

test('communication APIs fail closed without configuration or authentication',async()=>{
  for(const [route,method,status] of [['/api/contact','GET',503],['/api/reviews?productId=430697388','GET',503],['/api/printful-events','POST',400],['/api/communications/run','GET',401]]){
    const r=await fetch(origin+route,{method});assert.equal(r.status,status,route);assert.match(r.headers.get('cache-control'),/no-store/);
  }
  for(const route of ['/admin/reviews','/api/reviews/moderation'])assert.equal((await fetch(origin+route)).status,500);
});
test('checkout return does not claim a URL proves payment',async()=>{
  const html=await (await fetch(origin+'/success')).text();assert.match(html,/confirmed by Stripe, not by this page/);
});

test("product SSR fails closed without provider configuration", async () => {
  const response = await fetch(origin + "/product/430697388");
  assert.equal(response.status, 503);
  const html = await response.text();
  assert.match(html, /Temporarily unavailable/);
  assert.doesNotMatch(html, /schema.org\/InStock/);
});

test("hidden product does not reach a provider or expose an offer", async () => {
  assert.equal((await fetch(origin + "/product/430925200")).status, 404);
});

test("Meta checkout renders a safe error for malformed/hidden carts before provider access", async () => {
  for (const products of ["invalid", "lj_430925200_1:1", "lj_430964873_5292830954:100"]) {
    const response = await fetch(origin + "/checkout?products=" + encodeURIComponent(products));
    assert.equal(response.status, 400);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
    const html = await response.text();
    assert.match(html, /Cart unavailable/);
    assert.doesNotMatch(html, /PRIVATE_PROVIDER|PRINTFUL_API_KEY|STRIPE_SECRET_KEY/);
  }
});

test("Meta checkout provider failure is not an empty purchasable cart", async () => {
  const response = await fetch(origin + "/checkout?products=lj_430964873_5292830954%3A1");
  assert.equal(response.status, 503);
  assert.match(await response.text(), /Checkout is temporarily unavailable/);
});

test("unused image optimization endpoint is disabled", async () => {
  const response = await fetch(origin + "/_next/image?url=%2Ffavicon.ico&w=64&q=75");
  assert.equal(response.status, 404);
});

test("promo middleware fails closed without credentials", async () => {
  const response = await fetch(origin + "/admin/promo-generator");
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("Contact renders branded accessible fields and a direct support fallback", async () => {
  const response = await fetch(origin + "/contact");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /LET&#x27;S SORT IT OUT\./);
  assert.match(html, /mailto:hello@localjagoff.com/);
  for (const name of ["name", "email", "topic", "message", "website"]) assert.ok(html.includes(`name="${name}"`), name);
  assert.match(html, /aria-labelledby="message-heading"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /disabled=""[^>]*>SEND MESSAGE/);
});

test("customer-facing footer and legal contact references use the official inbox", async () => {
  for (const route of ["/", "/contact", "/privacy", "/terms"]) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /mailto:hello@localjagoff.com/);
    assert.doesNotMatch(html, /mailto:(info@localjagoff.com|localjagoff@gmail.com)/);
  }
});
