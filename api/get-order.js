export default async function handler(req, res) {
  // Retired diagnostic endpoint: customer order details are not public catalog data.
  res.setHeader("Cache-Control", "no-store");
  return res.status(404).json({ error: "Not found" });
}
