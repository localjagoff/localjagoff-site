import "../styles/global.css";
import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Local Jagoff</title>
        <meta
          name="description"
          content="Certified nonsense. Pittsburgh attitude."
          key="description"
        />

        <meta property="og:title" content="Local Jagoff" key="og:title" />
        <meta
          property="og:description"
          content="Certified nonsense. Pittsburgh attitude."
          key="og:description"
        />
        <meta
          property="og:image"
          content="https://www.localjagoff.com/images/banner.png"
          key="og:image"
        />
        <meta
          property="og:url"
          content="https://www.localjagoff.com"
          key="og:url"
        />
        <meta property="og:type" content="website" key="og:type" />

        <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
        <meta
          name="twitter:image"
          content="https://www.localjagoff.com/images/banner.png"
          key="twitter:image"
        />

        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/images/icon.png" />
      </Head>

      <Component {...pageProps} />
    </>
  );
}
