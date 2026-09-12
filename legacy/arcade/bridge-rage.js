import Head from "next/head";
import Navbar from "../components/Navbar";
import SimpleArcadeGame from "../components/SimpleArcadeGame";

const SITE_URL = "https://www.localjagoff.com";
const PAGE_URL = `${SITE_URL}/bridge-rage`;
const PAGE_TITLE = "Bridge Rage | Local Jagoff Arcade";
const PAGE_DESCRIPTION =
  "Play Bridge Rage, a mobile-friendly traffic dodger from Local Jagoff Arcade.";
const SHARE_IMAGE = `${SITE_URL}/images/social-share.jpg`;

const gameConfig = {
  mode: "dodger",
  bgText: "BRIDGE RAGE",
  playerLabel: "CAR",
  badThings: ["BUS", "CONE", "MERGE"],
  startText: "Pick a lane and survive the bridge traffic.",
  instructions:
    "Mobile: tap the left, middle, or right side to switch lanes. Desktop: arrow keys or click a lane.",
};

export default function BridgeRagePage() {
  const gameJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Bridge Rage",
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
          key="bridge-rage-jsonld"
        />
      </Head>

      <Navbar />
      <SimpleArcadeGame
        title="Bridge Rage"
        kicker="LOCAL JAGOFF ARCADE"
        description="A fast lane-switching traffic dodger. Stay alive, avoid the blockers, and keep moving."
        config={gameConfig}
      />
    </div>
  );
}
