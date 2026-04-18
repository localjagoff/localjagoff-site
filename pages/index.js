import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/get-products')
      .then(res => res.json())
      .then(data => setProducts(data));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Local Jagoff</h1>

      {products.length === 0 && <p>Loading products...</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {products.map(product => (
          <Link key={product.id} href={`/product/${product.id}`}>
            <div style={{ cursor: 'pointer', border: '1px solid #ccc', padding: 10 }}>
              <img src={product.thumbnail_url} width="100%" />
              <h3>{product.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
