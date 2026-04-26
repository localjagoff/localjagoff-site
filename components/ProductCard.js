import Link from "next/link";
import { useMemo, useState } from "react";

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);

  const images = useMemo(() => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images;
    }
    return [product.thumbnail_url || "/images/placeholder.jpg"];
  }, [product]);

  const displayImage = hovered && images[1] ? images[1] : images[0];
  const priceText = product.retail_price ? `$${product.retail_price}` : "";

  return (
    <Link href={`/product/${product.id}`} className="card-link">
      <article
        className="product-card"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="image-wrap">
          <img
            src={displayImage}
            alt={product.name}
            className="product-image"
            loading="lazy"
            decoding="async"
          />
        </div>

        <div className="info">
          <h3>{product.name}</h3>
          <p>{priceText}</p>
        </div>

        <style jsx>{`
          .card-link {
            display: block;
          }

          .product-card {
            cursor: pointer;
            background:
              linear-gradient(180deg, rgba(255, 230, 0, 0.04) 0%, rgba(255, 230, 0, 0) 22%),
              rgba(17, 17, 17, 0.95);
            border: 1px solid #222;
            border-radius: 16px;
            padding: 14px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
            transition:
              transform 0.2s ease,
              border-color 0.2s ease,
              box-shadow 0.2s ease;
          }

          .product-card:hover {
            transform: translateY(-3px);
            border-color: #3b3b3b;
            box-shadow: 0 18px 36px rgba(0, 0, 0, 0.35);
          }

          .image-wrap {
            width: 100%;
            aspect-ratio: 1 / 1;
            background:
              radial-gradient(circle at top, rgba(255, 230, 0, 0.08), transparent 45%),
              #0b0b0b;
            overflow: hidden;
            border-radius: 12px;
            border: 1px solid #1d1d1d;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .product-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
          }

          .info {
            padding-top: 12px;
          }

          h3 {
            font-size: 14px;
            line-height: 1.35;
            margin: 0;
            color: #fff;
            min-height: 38px;
          }

          p {
            margin: 8px 0 0;
            font-weight: 700;
            color: #ffe600;
            font-size: 15px;
          }
        `}</style>
      </article>
    </Link>
  );
}
