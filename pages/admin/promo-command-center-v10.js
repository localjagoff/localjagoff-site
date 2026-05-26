import { useEffect } from "react";
import PromoCommandCenterV9 from "./promo-command-center-v9";

const BANK_KEY = "localJagoffProductPromoBank";

function readBank() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BANK_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBank(items) {
  window.localStorage.setItem(BANK_KEY, JSON.stringify(Array.isArray(items) ? items : []));
}

function getCurrentProductName() {
  return (
    document.querySelector(".resultToolbar h2")?.textContent?.trim() ||
    document.querySelector(".selectedProduct h2")?.textContent?.trim() ||
    "Current Promo Product"
  );
}

function classifyResultBlock(title = "") {
  const lower = title.toLowerCase();

  if (lower.includes("facebook post") || lower.includes("facebook bundle")) {
    return { type: "caption", platform: "facebook" };
  }

  if (lower.includes("instagram caption") || lower.includes("instagram bundle")) {
    return { type: "caption", platform: "instagram" };
  }

  if (lower.includes("tiktok caption") || lower.includes("tiktok bundle")) {
    return { type: "caption", platform: "tiktok" };
  }

  if (lower.includes("youtube shorts title")) {
    return { type: "hook", platform: "youtube_shorts" };
  }

  if (lower.includes("youtube shorts description") || lower.includes("youtube shorts bundle")) {
    return { type: "caption", platform: "youtube_shorts" };
  }

  if (lower.includes("video hooks")) {
    return { type: "hook", platform: "general" };
  }

  if (lower.includes("short video script")) {
    return { type: "note", platform: "general" };
  }

  if (lower.includes("image overlay")) {
    return { type: "overlay", platform: "general" };
  }

  if (lower.includes("cta")) {
    return { type: "cta", platform: "general" };
  }

  if (lower.includes("brand angle")) {
    return { type: "note", platform: "general" };
  }

  if (lower.includes("clean ad") || lower.includes("edgy version")) {
    return { type: "caption", platform: "general" };
  }

  return { type: "note", platform: "general" };
}

function getResultText(block) {
  const contentNode = block.querySelector("pre") || block.querySelector("p");
  return contentNode?.textContent?.trim() || "";
}

function saveBlockToBank(block, button) {
  const title = block.querySelector("h3")?.textContent?.trim() || "Generated result";
  const text = getResultText(block);

  if (!text) {
    button.textContent = "No Text";
    window.setTimeout(() => {
      button.textContent = "Save to Bank";
    }, 1200);
    return;
  }

  const { type, platform } = classifyResultBlock(title);
  const productName = getCurrentProductName();

  const entry = {
    id: `bank-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    productId: "",
    productName,
    productImage: "",
    productCategory: "gear",
    type,
    platform,
    text,
    source: "Generator Result",
    tag: title,
    status: "Approved",
  };

  const nextBank = [entry, ...readBank()].slice(0, 500);
  writeBank(nextBank);

  button.textContent = "Saved";
  button.classList.add("bankSaved");
  window.setTimeout(() => {
    button.textContent = "Save to Bank";
    button.classList.remove("bankSaved");
  }, 1400);
}

function attachBankButtons() {
  if (typeof document === "undefined") return;

  document.querySelectorAll(".resultBlock").forEach((block) => {
    if (block.querySelector(".saveToBankButton")) return;

    const title = block.querySelector("h3")?.textContent?.trim() || "";
    const lower = title.toLowerCase();

    if (lower.includes("warnings")) return;

    const top = block.querySelector(".resultTop");
    if (!top) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "saveToBankButton";
    button.textContent = "Save to Bank";
    button.addEventListener("click", () => saveBlockToBank(block, button));
    top.appendChild(button);
  });
}

function injectStyles() {
  if (typeof document === "undefined" || document.getElementById("local-jagoff-bank-button-style")) return;

  const style = document.createElement("style");
  style.id = "local-jagoff-bank-button-style";
  style.textContent = `
    .saveToBankButton {
      color: #000 !important;
      background: #ffe600 !important;
      border-color: #ffe600 !important;
    }

    .saveToBankButton.bankSaved {
      color: #000 !important;
      background: #9affb7 !important;
      border-color: #9affb7 !important;
    }

    @media (max-width: 620px) {
      .saveToBankButton { width: 100%; }
    }
  `;
  document.head.appendChild(style);
}

export default function PromoCommandCenterV10() {
  useEffect(() => {
    injectStyles();
    attachBankButtons();

    const observer = new MutationObserver(() => attachBankButtons());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return <PromoCommandCenterV9 />;
}
