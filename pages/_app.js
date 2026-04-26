import "../styles/global.css";
import Head from "next/head";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isProductPage = router.pathname === "/product/[id]";

  return (
    <>
      <Head>
        <title>Local Jagoff</title>
        <meta
          name="description"
          content="Pittsburgh attitude. No corporate nonsense."
          key="description"
        />

        {!isProductPage && (
          <>
            <meta property="og:title" content="Local Jagoff" key="og:title" />
            <meta
              property="og:description"
              content="Pittsburgh attitude. No corporate nonsense."
              key="og:description"
            />
            <meta
              property="og:image"
              content="https://www.localjagoff.com/images/banner.jpg"
              key="og:image"
            />
            <meta
              property="og:url"
              content="https://www.localjagoff.com"
              key="og:url"
            />
            <meta property="og:type" content="website" key="og:type" />

            <meta
              name="twitter:card"
              content="summary_large_image"
              key="twitter:card"
            />
            <meta
              name="twitter:title"
              content="Local Jagoff"
              key="twitter:title"
            />
            <meta
              name="twitter:description"
              content="Pittsburgh attitude. No corporate nonsense."
              key="twitter:description"
            />
            <meta
              name="twitter:image"
              content="https://www.localjagoff.com/images/banner.jpg"
              key="twitter:image"
            />
          </>
        )}

        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/images/icon.png" />
      </Head>

      <Component {...pageProps} />
    </>
  );
}
