import "../styles/global.css";
import Head from "next/head";
import { useRouter } from "next/router";
import { Analytics } from "@vercel/analytics/next";

const SITE_URL = "https://www.localjagoff.com";
const SOCIAL_IMAGE = `${SITE_URL}/images/social-share.jpg`;

const DEFAULT_TITLE =
  "Local Jagoff | Pittsburgh Jagoff Shirts, Hoodies & Yinzer Gear";

const DEFAULT_DESCRIPTION =
  "Shop Local Jagoff for Pittsburgh jagoff shirts, black and gold hoodies, hats, 412 gear, 724 gear, and Western PA streetwear with yinzer attitude.";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isProductPage = router.pathname === "/product/[id]";
  const cleanPath = router.asPath?.split("?")[0] || "/";
  const canonicalUrl = `${SITE_URL}${cleanPath === "/" ? "" : cleanPath}`;

  return (
    <>
      <Head>
        <title>{DEFAULT_TITLE}</title>
        <meta
          name="description"
          content={DEFAULT_DESCRIPTION}
          key="description"
        />
        <link rel="canonical" href={canonicalUrl} key="canonical" />

        <meta name="theme-color" content="#000000" />
        <meta name="color-scheme" content="dark" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        {!isProductPage && (
          <>
            <meta property="og:title" content={DEFAULT_TITLE} key="og:title" />
            <meta
              property="og:description"
              content={DEFAULT_DESCRIPTION}
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
            <meta
              property="og:image:alt"
              content="Local Jagoff Pittsburgh clothing brand"
              key="og:image:alt"
            />
            <meta property="og:url" content={canonicalUrl} key="og:url" />
            <meta property="og:type" content="website" key="og:type" />
            <meta property="og:site_name" content="Local Jagoff" key="og:site_name" />

            <meta
              name="twitter:card"
              content="summary_large_image"
              key="twitter:card"
            />
            <meta
              name="twitter:title"
              content={DEFAULT_TITLE}
              key="twitter:title"
            />
            <meta
              name="twitter:description"
              content={DEFAULT_DESCRIPTION}
              key="twitter:description"
            />
            <meta name="twitter:image" content={SOCIAL_IMAGE} key="twitter:image" />
            <meta
              name="twitter:image:alt"
              content="Local Jagoff Pittsburgh clothing brand"
              key="twitter:image:alt"
            />
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
