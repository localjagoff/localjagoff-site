<style jsx>{`
  .container {
    background: #000;
    color: #fff;
    min-height: 100vh;
  }

  .banner {
    width: 100%;
  }

  .banner img {
    width: 100%;
    max-height: 500px;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }

  section {
    padding: 40px 20px;
    max-width: 1200px; /* 🔥 aligns with banner feel */
    margin: 0 auto;
  }

  h2 {
    margin-bottom: 20px;
  }

  /* 🔥 HORIZONTAL SCROLL ROW */
  .grid {
    display: flex;
    gap: 20px;
    overflow-x: auto;
    padding-bottom: 10px;
  }

  /* 🔥 FIX CARD WIDTH (NO SHRINKING) */
  .grid :global(.product-card) {
    min-width: 220px;
    max-width: 220px;
    flex-shrink: 0;
  }

  /* 🔥 SMOOTH SCROLL */
  .grid::-webkit-scrollbar {
    height: 8px;
  }

  .grid::-webkit-scrollbar-thumb {
    background: #444;
  }

  .grid::-webkit-scrollbar-track {
    background: #111;
  }

  /* OPTIONAL: hide scrollbar on mobile */
  @media (max-width: 768px) {
    .grid::-webkit-scrollbar {
      display: none;
    }
  }
`}</style>
