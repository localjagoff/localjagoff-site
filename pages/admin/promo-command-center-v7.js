import { useEffect, useState } from "react";
import PromoCommandCenterV6 from "./promo-command-center-v6";

const QUEUE_STORAGE_KEY = "localJagoffPromoQueue";
const PLATFORM_VALUES = new Set(["facebook", "instagram", "tiktok", "youtube_shorts"]);

function normalizeQueuePlatformCopy() {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return;

    const queue = JSON.parse(raw);
    if (!Array.isArray(queue)) return;

    const nextQueue = queue.map((item) => {
      const plannedPlatform = item?.scheduledPlatform;

      if (!PLATFORM_VALUES.has(plannedPlatform)) {
        return item;
      }

      return {
        ...item,
        displayPlatform: plannedPlatform,
      };
    });

    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(nextQueue));
  } catch {
    // Keep dashboard usable even if old localStorage data is malformed.
  }
}

export default function PromoCommandCenterV7() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    normalizeQueuePlatformCopy();
    setReady(true);
  }, []);

  if (!ready) return null;

  return <PromoCommandCenterV6 />;
}
