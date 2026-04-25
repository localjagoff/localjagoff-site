import Link from "next/link";
import { useState } from "react";

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.thumbnail_url || "/images/placeholder.jpg"];

  const displayImage =
    hovered && images.length > 1 ? images[1] : images[0];

  return (
    <Link href={`/product/${product.id}`} className="card">
      <div
        className="imgWrap"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <img src={displayImage} alt={product.name} />
      </div>

      <div className="info">
        <p className="name">{product.name}</p>
        <p className="price">${product.retail_price}</p>
      </div>

      <style jsx>{`
        .card {
          display: block;
          background: #111;
          border: 1px solid #222;
          border-radius: 14px;
          overflow: hidden;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
        }

        .imgWrap {
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          background: #000;
        }

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .info {
          padding: 12px;
        }

        .name {
          margin: 0 0 6px;
          font-size: 14px;
          font-weight: 600;
        }

        .price {
          margin: 0;
          font-size: 14px;
          color: #ccc;
        }
      `}</style>
    </Link>
  );
}
