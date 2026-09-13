const FEATURED_PRODUCT_IDS = [471744647, 471744585, 471744477, 471744283];
const CATEGORIES = [
  { key: 'tees', label: 'T-Shirts', href: '/tees', description: 'The everyday uniform. Anything but ordinary.' },
  { key: 'hoodies', label: 'Hoodies', href: '/hoodies', description: 'For the long way home. And whatever the weather does.' },
  { key: 'hats', label: 'Hats', href: '/hats', description: 'A little attitude, right off the top.' },
  { key: 'stuff', label: "Stuff N'at", href: '/stuff-nat', description: 'Small things. Same attitude.' },
];
const SMALL_GOODS = ['Stickers', 'Keychains', 'Magnets', 'Pins', 'Patches', 'Koozies', 'Bumper stickers'];
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(Number(value) || 0);
const displayName = name => String(name || '').replace(/^(Pittsburgh )?Local Jagoff\s+/i, '').trim() || 'Local Jagoff';
function inCategory(product, category) {
  if (category === 'all') return true;
  if (category === 'tees') return ['tees', '724'].includes(product.category);
  if (category === 'stuff') return ['other', 'stuff', 'stickers', 'keychains', 'magnets', 'pins', 'patches', 'koozies', 'bumper-stickers'].includes(product.category);
  return product.category === category;
}
function inSmallCategory(product, category) {
  if (category === 'All') return true;
  const text = `${product.subcategory || ''} ${product.category || ''} ${product.name || ''}`.toLowerCase();
  const patterns = { Stickers: /sticker/, Keychains: /keychain|key chain|keyring/, Magnets: /magnet/, Pins: /\bpin\b|\bpins\b/, Patches: /patch/, Koozies: /koozie|can cooler/, 'Bumper stickers': /bumper/ };
  return patterns[category]?.test(text) || false;
}
function sortCatalog(products, sort) {
  if (sort === 'price-low') return [...products].sort((a, b) => Number(a.retail_price) - Number(b.retail_price));
  if (sort === 'price-high') return [...products].sort((a, b) => Number(b.retail_price) - Number(a.retail_price));
  if (sort === 'name') return [...products].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'curated') {
    const rank = id => {
      const index = FEATURED_PRODUCT_IDS.indexOf(Number(id));
      return index < 0 ? FEATURED_PRODUCT_IDS.length : index;
    };
    return [...products].sort((a, b) => rank(a.id) - rank(b.id));
  }
  return products;
}
module.exports = { FEATURED_PRODUCT_IDS, CATEGORIES, SMALL_GOODS, money, displayName, inCategory, inSmallCategory, sortCatalog };
