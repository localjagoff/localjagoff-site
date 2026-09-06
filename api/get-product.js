export default async function handler(req, res) {
  // Retired diagnostic; get-products remains the public curated catalog.
  res.setHeader("Cache-Control", "no-store");
  return res.status(404).json({ error: "Not found" });
}
