export function getTrackedLink(cta = "", platform = "facebook") {
  const labelMap = {
    facebook: "Facebook tracked link:",
    instagram: "Instagram tracked link:",
    tiktok: "TikTok tracked link:",
    youtube_shorts: "YouTube Shorts tracked link:",
  };

  const label = labelMap[platform];
  if (!label) return "";

  const line = String(cta || "")
    .split("\n")
    .find((item) => item.trim().toLowerCase().startsWith(label.toLowerCase()));

  return line ? line.replace(label, "").trim() : "";
}

function compactLines(lines) {
  return lines
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function formatPlatformBundle(pack, platform = "facebook") {
  if (!pack) return "";
  const link = getTrackedLink(pack.cta, platform);

  if (platform === "facebook") {
    return compactLines([pack.facebook_post, link]);
  }

  if (platform === "instagram") {
    return compactLines([pack.instagram_caption, link]);
  }

  if (platform === "tiktok") {
    return compactLines([pack.tiktok_caption, link]);
  }

  if (platform === "youtube_shorts") {
    return compactLines([
      pack.youtube_shorts_title,
      pack.youtube_shorts_description,
      link,
    ]);
  }

  return "";
}
