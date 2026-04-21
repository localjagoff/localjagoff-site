import { useState } from "react";
import Link from "next/link";

const productImages = {
  // ✅ EACH PRODUCT HAS ITS OWN IMAGES ONLY

  428983169: [
    "/images/products/local-jagoff-412-hoodie.jpg",
  ],

  428821578: [
    "/images/products/hoodie2.jpg",
  ],

  428982889: [
    "/images/products/localjagoffkeystonetee.jpg",
  ],

  428980566: [
    "/images/products/localjagoffhatvr2.jpg",
  ],

  428851907: [
    "/images/products/localjagoffhat.jpg",
  ],

  428851698: [
    "/images/products/tee-keystone.jpg",
  ],

  428851608: [
    "/images/products/tee-steel.jpg",
  ],

  428851513: [
    "/images/products/local-jagoff-sideways-tee.png",
  ],

  428550417: [
    "/images/products/tee-certified.jpg",
  ],
};

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);

  const images =
    productImages[product.id] || [product.thumbnail_url];

  const displayImage =
    hovered && images[1] ? images[1] : images[0];

  return (
    <Link href={`/product/${product.id}`}>
      <div
        className="product-card"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="image-wrap">
          <img
            src={displayImage}
            alt={product.name}
            className="product-image"
          />
        </div>

        <div className="info">
          <h3>{product.name}</h3>
          <p>${product.retail_price}</p>
        </div>

        <style jsx>{`
          .product-card {
            cursor: pointer;
          }

          .image-wrap {
            width: 100%;
            aspect-ratio: 1 / 1;
            background: #000;
            overflow: hidden;
          }

          .product-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            transition: opacity 0.2s ease;
          }

          .info {
            padding-top: 10px;
          }

          h3 {
            font-size: 14px;
            margin: 0;
          }

          p {
            margin: 5px 0 0;
            font-weight: bold;
          }
        `}</style>
      </div>
    </Link>
  );
}
