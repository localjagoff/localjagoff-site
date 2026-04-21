import { useState } from "react";
import Link from "next/link";

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);

  const images = product.images || [product.thumbnail_url];

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
            transition: transform 0.2s ease;
          }

          .product-card:hover {
            transform: scale(1.03);
          }

          .image-wrap {
            width: 100%;
            aspect-ratio: 1 / 1;
            background: #000;
            overflow: hidden;
            border-radius: 8px;
          }

          .product-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
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
            color: #ccc;
          }
        `}</style>
      </div>
    </Link>
  );
}
