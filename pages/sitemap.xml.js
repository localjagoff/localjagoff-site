export default function Sitemap() { return null; }

export async function getServerSideProps(context) {
  const { getCatalog } = require("../lib/catalog.cjs");
  const { serveDiscovery } = require("../lib/discovery.cjs");
  return serveDiscovery(context, getCatalog, "sitemap");
}
