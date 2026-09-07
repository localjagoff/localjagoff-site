const { getCatalog, metaRows, feedCsv } = require("../lib/catalog.cjs");
const { siteOrigin } = require("../lib/commerce.cjs");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const rows = metaRows(await getCatalog(), siteOrigin(process.env));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(feedCsv(rows));
  } catch {
    console.error("meta_catalog_unavailable");
    return res.status(503).json({ error: "Catalog temporarily unavailable" });
  }
};
