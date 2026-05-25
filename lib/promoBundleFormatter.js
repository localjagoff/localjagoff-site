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

export function formatPlatformBundle(pack, platform = "facebook") {
  if (!pack) return "";
  const link = getTrackedLink(pack.cta, platform);

  if (platform === "facebook") {
    return ["Facebook Post:", pack.facebook_post, "", "Tracked Link:", link].filter(Boolean).join("\n");
  }

  if (platform === "instagram") {
    return ["Instagram Caption:", pack.instagram_caption, "", "Tracked Link:", link].filter(Boolean).join("\n");
  }

  if (platform === "tiktok") {
    return ["TikTok Caption:", pack.tiktok_caption, "", "Tracked Link:", link].filter(Boolean).join("\n");
  }

  if (platform === "youtube_shorts") {
    return [
      "YouTube Shorts Title:",
      pack.youtube_shorts_title,
      "",
      "YouTube Shorts Description:",
      pack.youtube_shorts_description,
      "",
      "Tracked Link:",
      link,
    ].filter(Boolean).join("\n");
  }

  return "";
}
