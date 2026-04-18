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
    <div style={{
      background: '#0a0a0a',
      color: '#fff',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      
      {/* HEADER */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #222',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '40px',
          letterSpacing: '2px'
        }}>
          LOCAL JAGOFF
        </h1>
        <p style={{ color: '#888' }}>
          Certified nonsense. Pittsburgh attitude.
        </p>
      </div>

      {/* PRODUCT GRID */}
      <div style={{
        padding: '30px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '25px'
      }}>

        {products.length === 0 && (
          <p>Loading jagoff inventory...</p>
        )}

        {products.map(product => (
          <Link key={product.id} href={`/product/${product.id}`}>
            <div style={{
              background: '#111',
              border: '1px solid #222',
              padding: '15px',
              cursor: 'pointer',
              transition: '0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <img
                src={product.thumbnail_url}
                style={{
                  width: '100%',
                  marginBottom: '10px'
                }}
              />

              <h3 style={{ margin: '5px 0' }}>
                {product.name}
              </h3>

              <p style={{ color: '#aaa' }}>
                ${product.retail_price}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
