import productImages from "./productImages";

export function getProductImages(product) {
  if (!product) {
    return ["/images/placeholder.jpg"];
  }

  const customImages = productImages[product.id] || productImages[String(product.id)];

  if (Array.isArray(customImages) && customImages.length > 0) {
    return customImages;
  }

  if (product.thumbnail_url) {
    return [product.thumbnail_url];
  }

  return ["/images/placeholder.jpg"];
}

export function getProductThumbnail(product) {
  return getProductImages(product)[0];
}
