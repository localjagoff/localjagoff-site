import Link from "next/link";
import { useMemo, useRef, useState } from "react";

export default function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef(null);

  const images = useMemo(() => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images;
    }
    return [product.thumbnail_url || "/images/placeholder.jpg"];
  }, [product]);

  const displayImage = hovered && images[1] ? images[1] : images[0];
  const priceText = product.retail_price ? `$${product.retail_price}` : "";

  const handlePointerMove = (event) => {
    if (event.pointerType !== "mouse" || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    cardRef.current.style.setProperty("--card-rx", `${((0.5 - y) * 7).toFixed(2)}deg`);
    cardRef.current.style.setProperty("--card-ry", `${((x - 0.5) * 8).toFixed(2)}deg`);
    cardRef.current.style.setProperty("--card-light-x", `${(x * 100).toFixed(1)}%`);
    cardRef.current.style.setProperty("--card-light-y", `${(y * 100).toFixed(1)}%`);
  };

  const resetTilt = () => {
    setHovered(false);
    if (!cardRef.current) return;
    cardRef.current.style.setProperty("--card-rx", "0deg");
    cardRef.current.style.setProperty("--card-ry", "0deg");
    cardRef.current.style.setProperty("--card-light-x", "50%");
    cardRef.current.style.setProperty("--card-light-y", "20%");
  };

  return (
    <Link href={`/product/${product.id}`} className="card-link">
      <article
        ref={cardRef}
        className="product-card"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={resetTilt}
        onPointerMove={handlePointerMove}
        onBlur={resetTilt}
      >
        <div className="image-wrap">
          <span className="image-shadow" aria-hidden="true" />
          <img
            src={displayImage}
            alt={product.name}
            className="product-image"
            loading="lazy"
            decoding="async"
          />
          <span className="card-shine" aria-hidden="true" />
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
            --card-rx: 0deg;
            --card-ry: 0deg;
            --card-light-x: 50%;
            --card-light-y: 20%;
            position: relative;
            height: 100%;
            cursor: pointer;
            background:
              linear-gradient(180deg, rgba(255, 230, 0, 0.04) 0%, rgba(255, 230, 0, 0) 22%),
              rgba(17, 17, 17, 0.95);
            border: 1px solid #222;
            border-radius: 16px;
            padding: 14px;
            box-shadow:
              0 5px 0 #050505,
              0 16px 34px rgba(0, 0, 0, 0.36),
              inset 0 1px 0 rgba(255, 255, 255, 0.055);
            display: flex;
            flex-direction: column;
            transform: perspective(900px) rotateX(var(--card-rx)) rotateY(var(--card-ry)) translateZ(0);
            transform-style: preserve-3d;
            transition:
              transform 0.18s ease,
              border-color 0.2s ease,
              box-shadow 0.2s ease;
          }

          .product-card::before {
            content: "";
            position: absolute;
            inset: 0;
            z-index: 3;
            border-radius: inherit;
            pointer-events: none;
            background: radial-gradient(
              circle at var(--card-light-x) var(--card-light-y),
              rgba(255, 244, 156, 0.14),
              transparent 34%
            );
            opacity: 0.68;
          }

          .product-card:hover {
            transform: perspective(900px) rotateX(var(--card-rx)) rotateY(var(--card-ry)) translateY(-7px) translateZ(18px);
            border-color: rgba(255, 230, 0, 0.42);
            box-shadow:
              0 8px 0 #050505,
              0 25px 48px rgba(0, 0, 0, 0.52),
              0 0 34px rgba(255, 230, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.08);
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
            position: relative;
            transform: translateZ(18px);
            box-shadow:
              0 11px 24px rgba(0, 0, 0, 0.28),
              inset 0 1px 0 rgba(255, 255, 255, 0.06);
          }

          .image-shadow {
            position: absolute;
            left: 16%;
            right: 16%;
            bottom: 7%;
            height: 12%;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.42);
            filter: blur(12px);
            transform: translateZ(4px);
          }

          .product-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
            position: relative;
            z-index: 1;
            transform: translateZ(24px) scale(0.98);
            transition: transform 0.22s ease, filter 0.22s ease;
            filter: drop-shadow(0 14px 14px rgba(0, 0, 0, 0.2));
          }

          .product-card:hover .product-image {
            transform: translateZ(34px) scale(1.025);
            filter: drop-shadow(0 20px 18px rgba(0, 0, 0, 0.3));
          }

          .card-shine {
            position: absolute;
            inset: 0;
            z-index: 2;
            pointer-events: none;
            background: linear-gradient(115deg, transparent 36%, rgba(255, 255, 255, 0.12) 48%, transparent 60%);
            transform: translateX(-75%);
            transition: transform 0.45s ease;
          }

          .product-card:hover .card-shine {
            transform: translateX(75%);
          }

          .info {
            padding-top: 12px;
            display: flex;
            flex-direction: column;
            flex: 1;
            position: relative;
            z-index: 4;
            transform: translateZ(12px);
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
              padding: 10px;
              transform: perspective(700px) rotateX(0.8deg) translateZ(0);
              box-shadow:
                0 4px 0 #050505,
                0 14px 26px rgba(0, 0, 0, 0.42),
                inset 0 1px 0 rgba(255, 255, 255, 0.055);
            }

            .product-card:active {
              transform: perspective(700px) rotateX(0deg) translateY(2px) scale(0.985);
              box-shadow: 0 2px 0 #050505, 0 8px 18px rgba(0, 0, 0, 0.4);
            }

            .image-wrap {
              transform: translateZ(12px);
            }

            .product-image {
              transform: translateZ(16px) scale(0.985);
            }

            h3 {
              font-size: 15px;
              line-height: 1.28;
              min-height: calc(1.28em * 3);
              -webkit-line-clamp: 3;
            }

            p {
              font-size: 17px;
              padding-top: 10px;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .product-card,
            .product-image,
            .card-shine {
              transform: none !important;
              transition: none !important;
            }
          }
        `}</style>
      </article>
    </Link>
  );
}
