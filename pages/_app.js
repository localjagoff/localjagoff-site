import '../styles/global.css';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Local Jagoff</title>
        <meta name="description" content="Pittsburgh attitude. No corporate nonsense." />

        {/* Open Graph */}
        <meta property="og:title" content="Local Jagoff" />
        <meta property="og:description" content="Pittsburgh attitude. No corporate nonsense." />
        <meta property="og:image" content="https://www.localjagoff.com/images/banner.jpg" />
        <meta property="og:url" content="https://www.localjagoff.com" />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Local Jagoff" />
        <meta name="twitter:description" content="Pittsburgh attitude. No corporate nonsense." />
        <meta name="twitter:image" content="https://www.localjagoff.com/images/banner.jpg" />
      </Head>

      <Component {...pageProps} />
    </>
  );
}
