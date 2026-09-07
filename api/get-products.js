const { getCatalog } = require("../lib/catalog.cjs");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    return res.status(200).json(await getCatalog());
  } catch {
    console.error("catalog_request_failed");
    return res.status(503).json({ error: "Products temporarily unavailable" });
  }
};
