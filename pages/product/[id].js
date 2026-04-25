import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/Navbar";
import { getProductImages } from "../../lib/getProductImages";

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/get-product?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;

        setProduct({
          ...data,
          images: getProductImages(data),
        });
      })
      .catch(() => setProduct(null));
  }, [id]);

  if (!product) {
    return (
      <>
        <Navbar />
        <p style={{ padding: 20 }}>Loading...</p>
      </>
    );
  }

  return (
    <div>
      <Navbar />

      <div className="container">
        <div className="imageSection">
          {product.images.map((img, i) => (
            <img key={i} src={img} alt={product.name} />
          ))}
        </div>

        <div className="info">
          <h1>{product.name}</h1>
          <p>${product.variants?.[0]?.price || "0.00"}</p>
        </div>
      </div>

      <style jsx>{`
        .container {
          padding: 20px;
        }

        .imageSection img {
          width: 100%;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
}
