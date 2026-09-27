const LAYERS = [475474242, 475475243];
const BEANIES = [475457459, 475461765];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
function availableVariants(product) {
  if (product?.availability !== 'in stock') return [];
  return (product.variants || []).filter(v => v.availability === 'in stock' && v.currency === 'USD' &&
    /^black$/i.test(v.color || '') && Number.isSafeInteger(v.unit_amount) && v.unit_amount > 0)
    .sort((a, b) => SIZES.indexOf(a.size) - SIZES.indexOf(b.size));
}
function fitItems(products, layerId, variantId, beanieId) {
  if (!LAYERS.includes(Number(layerId)) || !BEANIES.includes(Number(beanieId))) throw Error('Choose your layer and beanie.');
  const layer = products.find(p => Number(p.id) === Number(layerId));
  const beanie = products.find(p => Number(p.id) === Number(beanieId));
  const variant = availableVariants(layer).find(v => String(v.id) === String(variantId));
  const hatVariant = availableVariants(beanie).find(v => v.size === 'One size');
  if (!variant || !hatVariant) throw Error('That size or beanie is unavailable. Please choose another option.');
  return [[layer, variant], [beanie, hatVariant]].map(([p, v]) => ({
    id: p.id, variant_id: v.id, variant_name: v.name, name: p.name,
    price: v.unit_amount / 100, quantity: 1, image: p.thumbnail_url || p.images?.[0],
  }));
}
// Build both rows before writing storage so a failed pair never adds just one item.
function mergeFit(cart, items) {
  const next = (Array.isArray(cart) ? cart : []).map(item => ({ ...item }));
  for (const item of items) {
    const existing = next.find(row => String(row.id) === String(item.id) && String(row.variant_id) === String(item.variant_id));
    if (existing) {
      const quantity = Number(existing.quantity);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity >= 99) throw Error('Please adjust the matching items already in your cart before adding another fit.');
      Object.assign(existing, item, { quantity: quantity + 1 });
    } else next.push({ ...item });
  }
  return next;
}
module.exports = { LAYERS, BEANIES, availableVariants, fitItems, mergeFit };
