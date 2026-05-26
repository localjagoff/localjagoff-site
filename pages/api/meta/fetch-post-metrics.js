export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;

  if (!accessToken) {
    return res.status(200).json({
      ok: false,
      configured: false,
      metricsStatus: "Meta Not Configured",
      message: "Meta metrics are not configured yet. Missing META_PAGE_ACCESS_TOKEN in Vercel environment variables.",
      metrics: null,
    });
  }

  return res.status(200).json({
    ok: false,
    configured: true,
    metricsStatus: "Meta Endpoint Placeholder",
    message: "META_PAGE_ACCESS_TOKEN exists, but the real Meta metrics fetch logic has not been wired yet.",
    metrics: null,
  });
}
