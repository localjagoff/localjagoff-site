import "../styles/global.css";
import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* 🔥 BASIC META */}
        <title>Local Jagoff</title>
        <meta
          name="description"
          content="Certified nonsense. Pittsburgh attitude."
        />

        {/* 🔥 OPEN GRAPH (SHARING) */}
        <meta property="og:title" content="Local Jagoff" />
        <meta
          property="og:description"
          content="Certified nonsense. Pittsburgh attitude."
        />
        <meta
          property="og:image"
          content="https://www.localjagoff.com/images/banner.png"
        />
        <meta property="og:url" content="https://www.localjagoff.com" />
        <meta property="og:type" content="website" />

        {/* 🔥 TWITTER */}
        <meta name="twitter:card" content="summary_large_image" />

        {/* 🔥 ICONS */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/images/icon.png" />
      </Head>

      <Component {...pageProps} />
    </>
  );
}
