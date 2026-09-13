// Owner-approved designs; garment identities verified in Printful store 18032822.
// Public copy is shared by cards, product pages, checkout titles and catalog feeds.
const GARMENTS = {
  MC1082: {
    model: 'Cotton Heritage MC1082',
    card: 'Premium soft-washed cotton tee',
    headline: 'Premium cotton. Better feel.',
    copy: 'Soft-washed combed ring-spun cotton gives this 5.5 oz midweight tee a smooth feel with everyday substance. Side seams and a standard fit keep the shape clean without an oversized cut.',
    details: ['100% combed ring-spun cotton in the current Black color', '5.5 oz fabric; tightly knit, 24 singles', 'Soft-washed finish; side-seamed construction; standard fit'],
  },
  M2580: {
    model: 'Cotton Heritage M2580',
    card: 'Premium cotton-face fleece hoodie',
    headline: 'Substantial fleece. Soft inside.',
    copy: 'An 8.5 oz cotton-blend fleece with a smooth cotton face and soft interior gives this pullover warmth and substance. The tailored shape, three-panel hood and flat drawstrings keep the finish clean.',
    details: ['65% ring-spun cotton / 35% polyester in Black; 100% cotton face', '8.5 oz fleece; modern, more tailored fit', 'Three-panel hood, flat drawstrings and front pouch pocket'],
  },
  '18600': {
    model: 'Gildan 18600 Heavy Blend',
    card: 'Soft 8 oz fleece zip hoodie',
    headline: 'Everyday fleece. Easy to layer.',
    copy: 'Soft fleece inside and out makes this 8 oz cotton-blend zip hoodie an easy everyday layer. A regular fit leaves room to move, with a metal zipper and front pockets for a practical finish.',
    details: ['50% cotton / 50% polyester', '8 oz fleece; regular fit', 'Full metal zipper, front pockets and drawcord hood'],
  },
};
const PRODUCTS = {
  471744647: { name: 'Smoking 412 Smiley Tee', garment: 'MC1082', design: 'Cream varsity lettering frames a melting gold smiley in a Local Jagoff beanie. Pittsburgh in the sunglasses, smoke in the air, and a raised 412 hand on the front.' },
  471744585: { name: '412 Smiley Tee', garment: 'MC1082', design: 'A melting gold smiley wears a Local Jagoff beanie and skyline-reflecting sunglasses, with a raised 412 hand and brush-lettered wordmark on the front.' },
  471744477: { name: 'Pittsburgh Original Tee', garment: 'MC1082', design: 'Stacked gold Local Jagoff lettering, outlined in white, sits between Official Local Jagoff and A Pittsburgh Original gold bars on the front.' },
  471744283: { name: 'Brushstroke Wordmark Tee', garment: 'MC1082', design: 'An angular white Local Jagoff brushstroke wordmark with a sweeping underline stands out against black on the front.' },
  428821578: { name: 'Steel City 412 Crest Zip Hoodie', garment: '18600', design: 'A gold Steel City 412 keystone crest gives this black zip hoodie its Pittsburgh identity.' },
  428851513: { name: 'Sideways 412 Tee', garment: 'MC1082', design: 'Vertical Local Jagoff lettering and a gold 412 turn a familiar mark on its side.' },
  428851608: { name: 'Steel City Shield Tee', garment: 'MC1082', design: 'A Pittsburgh bridge-and-412 shield, with front and back artwork. Local pride from both sides.' },
  428851698: { name: '412 Keystone Crest Tee', garment: 'MC1082', design: 'A gold 412 keystone sits inside a round Steel City crest on black.' },
  428851907: { name: 'Local Jagoff Trucker Cap', design: 'White embroidered Local Jagoff lettering on a black mesh-back trucker cap.' },
  428980566: { name: 'Local Jagoff Trucker Hat', design: 'A gold outlined wordmark frames white Local Jagoff embroidery on a black trucker hat.' },
  428982889: { name: 'Crowned 412 Tee', garment: 'MC1082', design: 'The crowned Local Jagoff keystone and bold 412 mark, in black, white and gold.' },
  428983169: { name: 'Crowned 412 Hoodie', garment: 'M2580', design: 'The crowned 412 keystone takes center stage on this black pullover hoodie.' },
  429208592: { name: 'Pittsburgh 412 Arch Zip Hoodie', garment: '18600', design: 'Pittsburgh Original on the chest, with a bold arched Local Jagoff 412 Pittsburgh graphic across the back.' },
  429536493: { name: 'Pittsburgh 412 Arch Tee', garment: 'MC1082', design: 'Gold arched lettering frames a bold 412, with Pittsburgh spelled out beneath it.' },
  429728777: { name: '412 City Seal Tee', garment: 'MC1082', design: 'A round gold Local Jagoff 412 seal, signed Pittsburgh, PA. Clean lines, unmistakably local.' },
  429821634: { name: 'Wordmark Stamp Tee', garment: 'MC1082', design: 'Distressed white Local Jagoff lettering inside a simple stamp-style frame. Straight to the point.' },
  430964873: { name: 'Crowned 724 Tee', garment: 'MC1082', design: 'A crowned Local Jagoff keystone for the 724, in black, white and gold. Western PA, represented.' },
};
function merchandising(id) {
  const product = PRODUCTS[id];
  if (!product) return null;
  return { ...product, quality: GARMENTS[product.garment] || null };
}
function merchandiseProduct(product) {
  const info = merchandising(product.id);
  if (!info) return product;
  return { ...product, name: info.name,
    variants: product.variants?.map(variant => ({ ...variant,
      name: [product.name, info.name].includes(variant.name)
        ? [variant.color, variant.size].filter(Boolean).join(' / ') || 'Default' : variant.name })),
    description: [info.design, info.quality?.copy, 'Made to order for Local Jagoff.'].filter(Boolean).join(' ') };
}
module.exports = { PRODUCTS, GARMENTS, merchandising, merchandiseProduct };
