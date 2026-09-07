export default function IndexNowKey() { return null; }

export async function getServerSideProps({ req, res }) {
  const { INDEXNOW_KEY } = require("../lib/discovery.cjs");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = ["GET", "HEAD"].includes(req.method) ? 200 : 405;
  res.setHeader("Allow", "GET, HEAD");
  res.end(req.method === "GET" ? INDEXNOW_KEY : undefined);
  return { props: {} };
}
