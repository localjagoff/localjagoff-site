const COLOR_IMAGE_PRODUCT_IDS = new Set([473808622, 473808088]);

function imagesForVariant(product, variant) {
  const images = product?.images || [];
  if (!COLOR_IMAGE_PRODUCT_IDS.has(Number(product?.id)) || !variant?.color) return images;
  const color = variant.color.toLowerCase();
  const matching = images.filter(image => image.includes('/' + color + '-'));
  return matching.length ? matching : images;
}

module.exports = { imagesForVariant };
