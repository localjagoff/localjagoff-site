export function formatPlatformBundle(promo, platform = "facebook") {
  if (!promo) return "";

  const normalizedPlatform = platform === "instagram" ? "instagram" : "facebook";
  const postText = normalizedPlatform === "instagram"
    ? promo.instagram_caption || promo.facebook_post || ""
    : promo.facebook_post || promo.instagram_caption || "";

  const sections = [postText];

  if (Array.isArray(promo.hashtags) && promo.hashtags.length) {
    sections.push(promo.hashtags.join(" "));
  } else if (typeof promo.hashtags === "string" && promo.hashtags.trim()) {
    sections.push(promo.hashtags.trim());
  }

  if (promo.cta) sections.push(String(promo.cta).trim());

  return sections.filter(Boolean).join("\n\n");
}
