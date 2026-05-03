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
            height: 100%;
          }

          .product-card {
            height: 100%;
            cursor: pointer;
            background:
              linear-gradient(180deg, rgba(255, 230, 0, 0.04) 0%, rgba(255, 230, 0, 0) 22%),
              rgba(17, 17, 17, 0.95);
            border: 1px solid #222;
            border-radius: 16px;
            padding: 14px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
            display: flex;
            flex-direction: column;
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
            flex: 0 0 auto;
          }

          .product-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
          }

          .info {
            padding-top: 12px;
            display: flex;
            flex-direction: column;
            flex: 1;
          }

          h3 {
            font-size: 14px;
            line-height: 1.35;
            margin: 0;
            color: #fff;
            min-height: calc(1.35em * 3);
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          p {
            margin: auto 0 0;
            padding-top: 8px;
            font-weight: 700;
            color: #ffe600;
            font-size: 15px;
          }

          @media (max-width: 768px) {
            .product-card {
              border-radius: 18px;
              padding: 14px;
            }

            h3 {
              font-size: 17px;
              line-height: 1.28;
              min-height: calc(1.28em * 3);
              -webkit-line-clamp: 3;
            }

            p {
              font-size: 18px;
              padding-top: 10px;
            }
          }
        `}</style>
      </article>
    </Link>
  );
}
