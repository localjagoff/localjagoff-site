export function getPlatformLink(cta = "", platform = "facebook") {
  const labelMap = {
    facebook: ["Facebook link:", "Facebook tracked link:"],
    instagram: ["Instagram link:", "Instagram tracked link:"],
  };

  const labels = labelMap[platform] || labelMap.facebook;
  const line = String(cta || "")
    .split("\n")
    .find((item) => labels.some((label) => item.trim().toLowerCase().startsWith(label.toLowerCase())));

  if (!line) return "";

  const matchedLabel = labels.find((label) => line.trim().toLowerCase().startsWith(label.toLowerCase()));
  return matchedLabel ? line.replace(matchedLabel, "").trim() : "";
}

export const getTrackedLink = getPlatformLink;

function compactLines(lines) {
  return lines.map((line) => String(line || "").trim()).filter(Boolean).join("\n\n");
}

export function formatPlatformBundle(pack, platform = "facebook") {
  if (!pack) return "";
  const safePlatform = platform === "instagram" ? "instagram" : "facebook";
  const link = getPlatformLink(pack.cta, safePlatform);

  if (safePlatform === "instagram") return compactLines([pack.instagram_caption, link]);
  return compactLines([pack.facebook_post, link]);
}
