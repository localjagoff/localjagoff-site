export function productLooks724(product) {
  return /724/.test(`${product?.name || ""} ${product?.category || ""}`);
}

export function makePostingQaChecklist({ product, mode = "product_drop", hasOffer = false } = {}) {
  const isHoliday = mode === "holiday";
  const is724 = productLooks724(product);

  return [
    "Posting QA: Review the post before publishing.",
    isHoliday || hasOffer
      ? "Posting QA: If a promo code, sale, deadline, or discount is mentioned, confirm it is real and currently active."
      : "Posting QA: Do not add sale, discount, deadline, or shipping claims unless they are real.",
    "Posting QA: Confirm no vendor, fulfillment, supplier, API, or internal workflow language appears.",
    is724
      ? "Posting QA: 724 product detected — confirm the copy does not mention 412 unless you intentionally want both."
      : "Posting QA: Regional tags look general; confirm 412/724 usage fits the product.",
    "Posting QA: Use the plain product link if the tracked UTM link looks too long for the platform.",
    "Posting QA: Review emojis and hashtags so the post feels natural, not spammy.",
  ];
}
