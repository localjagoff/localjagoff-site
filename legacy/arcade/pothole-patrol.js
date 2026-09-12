import Head from "next/head";
import Navbar from "../components/Navbar";
import SimpleArcadeGame from "../components/SimpleArcadeGame";

const SITE_URL = "https://www.localjagoff.com";
const PAGE_URL = `${SITE_URL}/pothole-patrol`;
const PAGE_TITLE = "Pothole Patrol | Local Jagoff Arcade";
const PAGE_DESCRIPTION =
  "Play Pothole Patrol, a mobile-friendly tap-to-patch arcade game from Local Jagoff Arcade.";
const SHARE_IMAGE = `${SITE_URL}/images/social-share.jpg`;

const gameConfig = {
  mode: "patch",
  bgText: "POTHOLE PATROL",
  startText: "Tap the potholes before the timer runs out.",
  instructions:
    "Mobile: tap potholes to patch them. Desktop: click potholes. Miss too many and the road wins.",
};

export default function PotholePatrolPage() {
  const gameJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Pothole Patrol",
    url: PAGE_URL,
    description: PAGE_DESCRIPTION,
    publisher: { "@type": "Organization", name: "Local Jagoff", url: SITE_URL },
    gamePlatform: "Web browser",
    applicationCategory: "Game",
  };

  return (
    <div>
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} key="description" />
        <link rel="canonical" href={PAGE_URL} key="canonical" />
        <meta property="og:title" content={PAGE_TITLE} key="og:title" />
        <meta property="og:description" content={PAGE_DESCRIPTION} key="og:description" />
        <meta property="og:url" content={PAGE_URL} key="og:url" />
        <meta property="og:type" content="website" key="og:type" />
        <meta property="og:site_name" content="Local Jagoff" key="og:site_name" />
        <meta property="og:image" content={SHARE_IMAGE} key="og:image" />
        <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
        <meta name="twitter:title" content={PAGE_TITLE} key="twitter:title" />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} key="twitter:description" />
        <meta name="twitter:image" content={SHARE_IMAGE} key="twitter:image" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(gameJsonLd).replace(/</g, "\\u003c") }}
          key="pothole-patrol-jsonld"
        />
      </Head>

      <Navbar />
      <SimpleArcadeGame
        title="Pothole Patrol"
        kicker="LOCAL JAGOFF ARCADE"
        description="Potholes are popping up everywhere. Tap them before they expire and keep the road alive."
        config={gameConfig}
      />
    </div>
  );
}
