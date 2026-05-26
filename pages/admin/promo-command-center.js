import { useEffect, useState } from "react";
import PromoAdminNav from "../../components/PromoAdminNav";
import PromoCommandCenterBase from "./promo-command-center-v6";

const QUEUE_STORAGE_KEY = "localJagoffPromoQueue";
const BANK_KEY = "localJagoffProductPromoBank";
const PLATFORM_VALUES = new Set(["facebook", "instagram", "tiktok", "youtube_shorts"]);
let cachedProducts = [];

function readBank() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(BANK_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBank(items) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(BANK_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  }
}

function clean(value) {
  return String(value || "").trim();
}

function normalizeName(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

async function hydrateProducts() {
  if (cachedProducts.length > 0) return cachedProducts;

  try {
    const res = await fetch("/api/get-products");
    const data = await res.json();
    cachedProducts = Array.isArray(data) ? data : [];
  } catch {
    cachedProducts = [];
  }

  return cachedProducts;
}

function getCurrentProductName() {
  if (typeof document === "undefined") return "Current Promo Product";

  return (
    document.querySelector(".resultToolbar h2")?.textContent?.trim() ||
    document.querySelector(".selectedProduct h2")?.textContent?.trim() ||
    "Current Promo Product"
  );
}

function findProductByName(productName) {
  const target = normalizeName(productName);
  if (!target) return null;

  return cachedProducts.find((product) => normalizeName(product.name) === target)
    || cachedProducts.find((product) => normalizeName(product.name).includes(target))
    || cachedProducts.find((product) => target.includes(normalizeName(product.name)))
    || null;
}

function getCurrentProduct() {
  const productName = getCurrentProductName();
  const matchedProduct = findProductByName(productName);

  return {
    id: matchedProduct?.id ? String(matchedProduct.id) : "",
    name: matchedProduct?.name || productName,
    image: matchedProduct?.thumbnail_url || matchedProduct?.image || "",
    category: matchedProduct?.category || "gear",
  };
}

function normalizeQueuePlatformCopy() {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return;

    const queue = JSON.parse(raw);
    if (!Array.isArray(queue)) return;

    const nextQueue = queue.map((item) => {
      const plannedPlatform = item?.scheduledPlatform;
      if (!PLATFORM_VALUES.has(plannedPlatform)) return item;

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

function relabelLoadButtons() {
  if (typeof document === "undefined") return;

  document.querySelectorAll("button").forEach((button) => {
    if (button.textContent?.trim() === "Load") {
      button.textContent = "Open Pack";
    }
  });
}

function classifyResultBlock(title = "") {
  const lower = title.toLowerCase();

  if (lower.includes("facebook post") || lower.includes("facebook bundle")) return { type: "caption", platform: "facebook" };
  if (lower.includes("instagram caption") || lower.includes("instagram bundle")) return { type: "caption", platform: "instagram" };
  if (lower.includes("tiktok caption") || lower.includes("tiktok bundle")) return { type: "caption", platform: "tiktok" };
  if (lower.includes("youtube shorts title")) return { type: "hook", platform: "youtube_shorts" };
  if (lower.includes("youtube shorts description") || lower.includes("youtube shorts bundle")) return { type: "caption", platform: "youtube_shorts" };
  if (lower.includes("video hooks")) return { type: "hook", platform: "general" };
  if (lower.includes("short video script")) return { type: "note", platform: "general" };
  if (lower.includes("image overlay")) return { type: "overlay", platform: "general" };
  if (lower.includes("cta")) return { type: "cta", platform: "general" };
  if (lower.includes("brand angle")) return { type: "note", platform: "general" };
  if (lower.includes("clean ad") || lower.includes("edgy version")) return { type: "caption", platform: "general" };

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
  const product = getCurrentProduct();

  const entry = {
    id: `bank-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    productId: product.id,
    productName: product.name,
    productImage: product.image,
    productCategory: product.category,
    type,
    platform,
    text,
    source: product.id ? "Generator Result" : "Generator Result - Product Match Needed",
    tag: title,
    status: product.id ? "Approved" : "Needs Review",
  };

  writeBank([entry, ...readBank()].slice(0, 800));

  button.textContent = product.id ? "Saved" : "Saved - Review";
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
    if (title.toLowerCase().includes("warnings")) return;

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
  if (typeof document === "undefined" || document.getElementById("local-jagoff-generator-wrapper-style")) return;

  const style = document.createElement("style");
  style.id = "local-jagoff-generator-wrapper-style";
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

export default function PromoCommandCenter() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    normalizeQueuePlatformCopy();
    hydrateProducts();
    injectStyles();
    attachBankButtons();
    relabelLoadButtons();
    setReady(true);

    const observer = new MutationObserver(() => {
      attachBankButtons();
      relabelLoadButtons();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  if (!ready) return null;

  return (
    <>
      <PromoAdminNav />
      <PromoCommandCenterBase />
    </>
  );
}
