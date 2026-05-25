import { useEffect } from "react";
import PromoCommandCenterV8 from "./promo-command-center-v8";

function relabelLoadButtons() {
  if (typeof document === "undefined") return;

  document.querySelectorAll("button").forEach((button) => {
    if (button.textContent?.trim() === "Load") {
      button.textContent = "Open Pack";
    }
  });
}

export default function PromoCommandCenterV9() {
  useEffect(() => {
    relabelLoadButtons();

    const observer = new MutationObserver(() => relabelLoadButtons());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return <PromoCommandCenterV8 />;
}
