const {test} = require("node:test");
const assert = require("node:assert/strict");
const security = require("../lib/contact-security.cjs");
const secret = "unit-test-only-".repeat(4);
const now = Date.parse("2026-09-20T12:00:00Z");
const fields = () => ({name:"Test Visitor",email:"visitor@example.com",topic:"order",message:"A test question about an order.",requestId:"00000000-0000-4000-8000-000000000001",website:""});

test("contact validates bounded fields and keeps the order reference optional", () => {
  const result=security.validateContact(fields());assert.equal(result.orderNumber,"");assert.equal(result.honeypot,false);
  for(const field of ["name","email","message","topic"]) {const body=fields();delete body[field];assert.throws(()=>security.validateContact(body));}
  assert.throws(()=>security.validateContact({...fields(),message:"a".repeat(4001)}));
});
test("recipient injection, header injection and malformed body are rejected", () => {
  for(const body of [null,[],{...fields(),to:"attacker@example.com"},{...fields(),email:"x@example.com\r\nBcc:other@example.com"},{...fields(),name:"a\r\nb"},{...fields(),orderNumber:"<script>"},{...fields(),message:"a\u0000 long message"}]) assert.throws(()=>security.validateContact(body));
});
test("a populated honeypot is flagged for suppression by the future route",()=>{
  assert.equal(security.validateContact({...fields(),website:"spam.example"}).honeypot,true);
});
test("signed form challenges reject tampering, instant submissions and expiry",()=>{
  const value=security.challenge(secret,now);
  assert.equal(security.verifyChallenge(value,secret,now+3000),true);
  assert.equal(security.verifyChallenge(value,secret,now+1000),false);
  assert.equal(security.verifyChallenge(value,secret,now+3600001),false);
  assert.equal(security.verifyChallenge(value.replace(/.$/,value.endsWith("a")?"b":"a"),secret,now+3000),false);
});
test("contact POST origin must exactly match the expected origin",()=>{
  assert.equal(security.sameOrigin({headers:{origin:"https://www.localjagoff.com","sec-fetch-site":"same-origin"}},"https://www.localjagoff.com"),true);
  for(const headers of [{},{origin:"https://attacker.example"},{origin:"https://www.localjagoff.com.attacker.example"},{origin:"https://www.localjagoff.com","sec-fetch-site":"cross-site"}]) assert.equal(security.sameOrigin({headers},"https://www.localjagoff.com"),false);
});
test("rate identifiers are keyed hashes, never raw customer IP addresses",()=>{
  const a=security.rateKey("192.0.2.1",secret); assert.match(a,/^[a-f\d]{64}$/);
  assert.equal(a,security.rateKey("192.0.2.1",secret));assert.notEqual(a,security.rateKey("192.0.2.2",secret));
  assert.throws(()=>security.rateKey("",secret));assert.throws(()=>security.challenge("short"));
});
