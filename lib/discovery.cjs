// Pure catalog projections: safe to share with the product page's JSON-LD.
// Load lib/catalog.cjs only in server routes, never in this client-imported module.
const ORIGIN = "https://www.localjagoff.com";
const INDEXNOW_KEY = "94e61a0c38b94f47846d1d678ac640fb";
const PUBLIC_PATHS = ["/", "/stuff-nat", "/contact", "/terms", "/privacy", "/whats-a-jagoff", "/arcade",
  "/yinzer-invaders", "/jagoff-jump"];
const CATEGORY_PATHS = { tees: "/tees", "724": "/tees", hoodies: "/hoodies", hats: "/hats" };

function positiveId(id) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) {
    throw new Error("Invalid discovery ID");
  }
  return String(id);
}

function imageUrl(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("Missing discovery image");
  const url = new URL(value, ORIGIN);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Invalid discovery image");
  }
  return url.href.replace(/,/g, "%2C");
}

function productUrl(id) { return `${ORIGIN}/product/${positiveId(id)}`; }
function itemId(p, v) { return `lj_${positiveId(p.id)}_${positiveId(v.id)}`; }
function groupId(p) { return `lj_${positiveId(p.id)}`; }
function variantUrl(p, v) { return `${productUrl(p.id)}?variant=${positiveId(v.id)}`; }

function validateProduct(p) {
  positiveId(p?.id);
  if (!p.name?.trim() || !p.description?.trim() || !p.images?.length || !p.variants?.length) {
    throw new Error("Incomplete discovery product");
  }
  p.images.forEach(imageUrl);
  const seen = new Set();
  for (const v of p.variants) {
    const id = positiveId(v.id);
    if (seen.has(id)) throw new Error("Duplicate discovery variant");
    seen.add(id);
    if (!v.name?.trim() || v.currency !== "USD" || v.availability !== "in stock" ||
        !Number.isSafeInteger(v.unit_amount) || v.unit_amount <= 0 ||
        v.price !== (v.unit_amount / 100).toFixed(2)) {
      throw new Error("Invalid discovery offer");
    }
  }
  return p;
}

function catalogProducts(products) {
  if (!Array.isArray(products)) throw new Error("Missing discovery snapshot");
  const seen = new Set();
  return products.map(validateProduct).map(p => {
    if (seen.has(String(p.id))) throw new Error("Duplicate discovery product");
    seen.add(String(p.id));
    return p;
  }).sort((a, b) => Number(a.id) - Number(b.id));
}

function productJsonLd(product) {
  if (!product) return null;
  const p = validateProduct(product);
  const variants = [...p.variants].sort((a, b) => a.id - b.id);
  const dimensions = ["size", "color"].filter(key =>
    variants.every(v => v[key]) && new Set(variants.map(v => v[key])).size > 1);
  return {
    "@context": "https://schema.org", "@type": "ProductGroup",
    "@id": `${productUrl(p.id)}#product-group`, url: productUrl(p.id),
    productGroupID: groupId(p), name: p.name, description: p.description,
    image: p.images.map(imageUrl), brand: { "@type": "Brand", name: "Local Jagoff" },
    ...(dimensions.length ? { variesBy: dimensions.map(key => `https://schema.org/${key}`) } : {}),
    hasVariant: variants.map(v => ({
      "@type": "Product", "@id": `${productUrl(p.id)}#variant-${v.id}`,
      sku: itemId(p, v), inProductGroupWithID: groupId(p),
      name: `${p.name} - ${v.name}`, description: p.description,
      image: p.images.map(imageUrl), url: variantUrl(p, v),
      ...(v.size ? { size: v.size } : {}), ...(v.color ? { color: v.color } : {}),
      offers: {
        "@type": "Offer", url: variantUrl(p, v), price: v.price, priceCurrency: v.currency,
        availability: "https://schema.org/InStock", itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: "Local Jagoff", url: ORIGIN },
      },
    })),
  };
}

function sitemapUrls(products) {
  const catalog = catalogProducts(products);
  const categories = [...new Set(catalog.map(p => CATEGORY_PATHS[p.category]).filter(Boolean))].sort();
  return [...PUBLIC_PATHS.map(path => ORIGIN + path), ...categories.map(path => ORIGIN + path),
    ...catalog.map(p => productUrl(p.id))];
}

function xmlText(value) {
  return String(value).replace(/[<>&"']/g, c => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[c]);
}

function sitemapXml(products) {
  const urls = sitemapUrls(products);
  if (urls.length > 50000) throw new Error("Discovery sitemap needs sharding");
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(url => `  <url><loc>${xmlText(url)}</loc></url>`).join("\n") + '\n</urlset>\n';
}

function googleRows(products) {
  return catalogProducts(products).flatMap(p => {
    // Product-level fields are identical across all size/color offers.
    const group = groupId(p), url = productUrl(p.id), groupTitle = p.name.slice(0, 150);
    const description = p.description.slice(0, 5000), image = imageUrl(p.images[0]);
    const additional = p.images.slice(1, 11).map(imageUrl).join(",");
    return [...p.variants].sort((a, b) => a.id - b.id).map(v => ({
    id: `${group}_${v.id}`, item_group_id: group, item_group_title: groupTitle,
    title: `${p.name} - ${v.name}`.slice(0, 150), description,
    link: `${url}?variant=${v.id}`, image_link: image,
    additional_image_link: additional,
    availability: "in_stock", price: `${v.price} ${v.currency}`, condition: "new", brand: "Local Jagoff",
    ...(v.size ? { size: v.size } : {}), ...(v.color ? { color: v.color } : {}),
    }));
  });
}

function googleTsv(products) {
  const { googleAttributes, GOOGLE_APPROVED_PRODUCT_IDS } = require("./google-listing-policy.cjs");
  const headers = ["id", "item_group_id", "item_group_title", "title", "description", "link",
    "image_link", "additional_image_link", "availability", "price", "condition", "brand", "size", "color",
    "age_group", "gender", "identifier_exists"];
  // Tabs and line breaks are separators in Google's text feed, not quoted content.
  const cell = value => String(value ?? "").replace(/[\t\r\n]+/g, " ");
  const rows = googleRows(products).filter(row => GOOGLE_APPROVED_PRODUCT_IDS.has(Number(row.item_group_id.slice(3)))).map(row => ({
    ...row, ...googleAttributes(row.item_group_id.slice(3)),
  }));
  return [headers.join("\t"), ...rows.map(row => headers.map(k => cell(row[k])).join("\t"))]
    .join("\n") + "\n";
}

function openaiRows(products) {
  const rows = googleRows(products).map(row => ({
    item_id: row.id, group_id: row.item_group_id, title: row.title, description: row.description,
    url: row.link, image_url: row.image_link, brand: row.brand, seller_name: "Local Jagoff",
    ...(row.additional_image_link ? { additional_image_urls: row.additional_image_link.split(",") } : {}),
    seller_url: ORIGIN, availability: row.availability, price: row.price, condition: row.condition,
    listing_has_variations: true,
    variant_dict: { ...(row.size ? { size: row.size } : {}), ...(row.color ? { color: row.color } : {}) },
    ...(row.size ? { size: row.size } : {}), ...(row.color ? { color: row.color } : {}),
    return_policy: `${ORIGIN}/terms`,
    is_eligible_search: true, is_eligible_checkout: false, is_ads_eligible: false,
  }));
  const combinations = new Set();
  for (const row of rows) {
    const key = JSON.stringify([row.group_id, row.variant_dict]);
    if (combinations.has(key)) throw new Error("Ambiguous discovery variant options");
    combinations.add(key);
  }
  return rows;
}

function openaiJsonl(products) {
  const rows = openaiRows(products);
  return rows.length ? rows.map(row => JSON.stringify(row)).join("\n") + "\n" : "";
}

async function serveDiscovery(context, loadCatalog, format) {
  const { req, res } = context;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "HEAD"].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    res.end();
    return { props: {} };
  }
  const formats = {
    sitemap: [sitemapXml, "application/xml; charset=utf-8"],
    google: [googleTsv, "text/tab-separated-values; charset=utf-8"],
    openai: [openaiJsonl, "application/x-ndjson; charset=utf-8"],
  };
  try {
    const [serialize, contentType] = formats[format];
    // Serialize the entire authoritative snapshot before writing any success response.
    const body = serialize(await loadCatalog());
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.statusCode = 503;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Retry-After", "60");
    res.end(req.method === "HEAD" ? undefined : "Discovery temporarily unavailable.\n");
  }
  return { props: {} };
}

function indexNowPayload(urls) {
  if (!Array.isArray(urls)) throw new Error("Invalid IndexNow URLs");
  const urlList = [...new Set(urls)];
  if (urlList.length > 10000) throw new Error("IndexNow batch exceeds 10000 URLs");
  const paths = new Set([...PUBLIC_PATHS, ...Object.values(CATEGORY_PATHS)]);
  for (const value of urlList) {
    const url = new URL(value);
    const match = /^\/product\/([1-9]\d*)$/.exec(url.pathname);
    if (url.origin !== ORIGIN || url.username || url.password || url.search || url.hash ||
        url.href !== value || (!paths.has(url.pathname) && !(match && positiveId(match[1])))) {
      throw new Error("IndexNow requires a canonical public URL");
    }
  }
  return { host: new URL(ORIGIN).host, key: INDEXNOW_KEY,
    keyLocation: `${ORIGIN}/indexnow-key.txt`, urlList };
}

function discoverySnapshot(products) {
  return catalogProducts(products).map(p => ({ url: productUrl(p.id),
    category: CATEGORY_PATHS[p.category] || null, fingerprint: JSON.stringify(productJsonLd(p)) }));
}

function changedDiscoveryUrls(previous, current) {
  if (!Array.isArray(previous) || !Array.isArray(current)) throw new Error("Complete snapshots required");
  const validate = rows => {
    const map = new Map();
    for (const row of rows) {
      indexNowPayload([row.url]);
      if (!/^\/product\//.test(new URL(row.url).pathname) || typeof row.fingerprint !== "string" ||
          !row.fingerprint || (row.category !== null && !Object.values(CATEGORY_PATHS).includes(row.category)) ||
          map.has(row.url)) throw new Error("Invalid discovery snapshot");
      map.set(row.url, row);
    }
    return map;
  };
  const before = validate(previous), after = validate(current);
  const changed = new Set();
  for (const url of new Set([...before.keys(), ...after.keys()])) {
    const old = before.get(url), next = after.get(url);
    if (old?.fingerprint === next?.fingerprint && old?.category === next?.category) continue;
    changed.add(url);
    changed.add(`${ORIGIN}/`);
    for (const row of [old, next]) if (row?.category) changed.add(ORIGIN + row.category);
  }
  return [...changed].sort();
}

async function submitIndexNow(urls, { fetchImpl = globalThis.fetch } = {}) {
  const payload = indexNowPayload(urls);
  if (!payload.urlList.length) return { submitted: 0, status: null };
  const response = await fetchImpl("https://api.indexnow.org/indexnow", {
    method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(10000), redirect: "error",
  });
  if (![200, 202].includes(response.status)) throw new Error(`IndexNow rejected batch (${response.status})`);
  return { submitted: payload.urlList.length, status: response.status };
}

module.exports = { ORIGIN, INDEXNOW_KEY, catalogProducts, productJsonLd, sitemapUrls, sitemapXml, googleRows,
  googleTsv, openaiRows, openaiJsonl, serveDiscovery, discoverySnapshot, changedDiscoveryUrls,
  indexNowPayload, submitIndexNow };
