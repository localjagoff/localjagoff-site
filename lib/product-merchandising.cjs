// Owner-approved designs; garment identities verified in Printful store 18032822.
// Public copy is shared by cards, product pages, checkout titles and catalog feeds.
const GARMENTS = {
  MC1082: {
    model: 'Cotton Heritage MC1082',
    card: 'Premium soft-washed cotton tee',
    headline: 'Premium cotton. Better feel.',
    copy: 'Soft-washed combed ring-spun cotton gives this 5.5 oz midweight tee a smooth feel with everyday substance. Side seams and a standard fit keep the shape clean without an oversized cut.',
    details: ['100% combed ring-spun cotton', '5.5 oz fabric; tightly knit, 24 singles', 'Soft-washed finish; side-seamed construction; standard fit'],
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
  475168585: { name: 'Pittsburgh 412 Rocker Zip Hoodie', category: 'hoodies', garment: '18600', design: 'Matching gold Local Jagoff and Pittsburgh rockers frame a bold 412 on the back of this black zip hoodie. Compact Pittsburgh Original tabs sit on the left chest. Black, white and gold, front to back.' },
  473981186: { name: 'Crowned 724 Hoodie', category: 'hoodies', garment: 'M2580', design: 'The crowned Local Jagoff 724 keystone on a black pullover. Western PA identity, in black, white and gold.' },
  473991005: { name: 'Smoking 724 Smiley Hoodie', category: 'hoodies', garment: 'M2580', design: 'The smoking 724 smiley brings Local Jagoff attitude to a black pullover. A Western PA statement in black, white and gold.' },
  473985115: { name: 'Smoking 724 Smiley Tee', category: 'tees', garment: 'MC1082', design: 'The smoking 724 smiley represents Western PA on a black tee. Local Jagoff attitude, in black, white and gold.' },
  473987159: { name: '412 Snapback Smiley Hoodie', category: 'hoodies', garment: 'M2580', design: 'A sideways-cap smiley, raised 412 hand and white Local Jagoff lettering meet gold splatter details on the front of this black pullover.' },
  473987719: { name: '412 Smiley Hoodie', category: 'hoodies', garment: 'M2580', design: 'The 412 smiley brings Local Jagoff attitude to a black pullover, with the bold black, white and gold graphic taking center stage.' },
  473990688: { name: 'Smoking 412 Smiley Hoodie', category: 'hoodies', garment: 'M2580', design: 'The smoking 412 smiley brings Pittsburgh attitude to a black pullover. Local Jagoff lettering frames the statement graphic.' },
  473808622: { name: '412 Beanie Smiley Backprint Tee', category: 'tees', garment: 'MC1082', design: 'A gold smiley in a 412 beanie and sunglasses brings the attitude, with a raised hand and Local Jagoff script signed A Pittsburgh Original. A small left-chest print on the front pairs with the full-size graphic on the back. Available in White.' },
  473834484: { name: '412 Snapback Smiley Backprint Tee', category: 'tees', garment: 'MC1082', design: 'A sideways-cap smiley, raised 412 hand and bold white Local Jagoff lettering meet gold splatter details. A small left-chest print keeps the front understated; the large back print makes the statement. Available in Black and White.' },
  473689891: { name: 'Pittsburgh Original Script Tee', garment: 'MC1082', design: 'White Local script sits above a bold gold Jagoff wordmark, outlined in white and gold with A Pittsburgh Original on a sweeping underline. A clean front graphic on black, with a plain back.' },
  471744647: { name: 'Smoking 412 Smiley Tee', garment: 'MC1082', design: 'Cream varsity lettering frames a melting gold smiley in a Local Jagoff beanie. Pittsburgh in the sunglasses, smoke in the air, and a raised 412 hand on the front.' },
  471744585: { name: '412 Smiley Tee', garment: 'MC1082', design: 'A melting gold smiley wears a Local Jagoff beanie and skyline-reflecting sunglasses, with a raised 412 hand and brush-lettered wordmark on the front.' },
  471950476: { name: 'Official Local Jagoff Tee', garment: 'MC1082', design: 'Stacked gold Local Jagoff lettering, outlined in white, sits between Official Local Jagoff and A Pittsburgh Original gold bars on the front.' },
  471744283: { name: 'Brushstroke Wordmark Tee', garment: 'MC1082', design: 'An angular white Local Jagoff brushstroke wordmark with a sweeping underline stands out against black on the front.' },
  428821578: { name: 'Steel City 412 Crest Zip Hoodie', garment: '18600', design: 'A gold Steel City 412 keystone crest gives this black zip hoodie its Pittsburgh identity.' },
  428851513: { name: 'Sideways 412 Tee', garment: 'MC1082', design: 'Vertical Local Jagoff lettering and a gold 412 turn a familiar mark on its side.' },
  428851608: { name: 'Steel City Shield Tee', garment: 'MC1082', design: 'A Pittsburgh bridge-and-412 shield, with front and back artwork. Local pride from both sides.' },
  428851698: { name: '412 Keystone Crest Tee', garment: 'MC1082', design: 'A gold 412 keystone sits inside a round Steel City crest on black.' },
  428851907: { name: 'Local Jagoff Trucker Cap', design: 'White embroidered Local Jagoff lettering on a black mesh-back trucker cap.' },
  428980566: { name: 'Local Jagoff Trucker Hat', design: 'A gold outlined wordmark frames white Local Jagoff embroidery on a black trucker hat.' },
  428982889: { name: 'Crowned 412 Tee', garment: 'MC1082', design: 'The crowned Local Jagoff keystone and bold 412 mark, in black, white and gold.' },
  428983169: { name: 'Crowned 412 Hoodie', garment: 'M2580', design: 'The crowned 412 keystone takes center stage on this black pullover hoodie.' },
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
    ...(info.category ? { category: info.category } : {}),
    variants: product.variants?.map(variant => ({ ...variant,
      name: [product.name, info.name].includes(variant.name)
        ? [variant.color, variant.size].filter(Boolean).join(' / ') || 'Default' : variant.name })),
    description: [info.design, info.quality?.copy, 'Made to order for Local Jagoff.'].filter(Boolean).join(' ') };
}
module.exports = { PRODUCTS, GARMENTS, merchandising, merchandiseProduct };
