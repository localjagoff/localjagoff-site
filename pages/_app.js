import "../styles/global.css";
import Head from "next/head";
import { useRouter } from "next/router";
import { Analytics } from "@vercel/analytics/next";

const SITE_URL = "https://www.localjagoff.com";
const SOCIAL_IMAGE = `${SITE_URL}/images/social-share.jpg`;

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

        <meta name="theme-color" content="#000000" />
        <meta name="color-scheme" content="dark" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        {!isProductPage && (
          <>
            <meta property="og:title" content="Local Jagoff" key="og:title" />
            <meta
              property="og:description"
              content="Pittsburgh attitude. No corporate nonsense."
              key="og:description"
            />
            <meta property="og:image" content={SOCIAL_IMAGE} key="og:image" />
            <meta
              property="og:image:secure_url"
              content={SOCIAL_IMAGE}
              key="og:image:secure_url"
            />
            <meta property="og:image:width" content="1200" key="og:image:width" />
            <meta property="og:image:height" content="630" key="og:image:height" />
            <meta property="og:image:alt" content="Local Jagoff" key="og:image:alt" />
            <meta property="og:url" content={SITE_URL} key="og:url" />
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
            <meta name="twitter:image" content={SOCIAL_IMAGE} key="twitter:image" />
          </>
        )}

        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/images/icon.png" />
      </Head>

      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
