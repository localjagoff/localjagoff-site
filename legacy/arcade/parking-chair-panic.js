import Head from "next/head";
import Navbar from "../components/Navbar";
import SimpleArcadeGame from "../components/SimpleArcadeGame";

const SITE_URL = "https://www.localjagoff.com";
const PAGE_URL = `${SITE_URL}/parking-chair-panic`;
const PAGE_TITLE = "Parking Chair Panic | Local Jagoff Arcade";
const PAGE_DESCRIPTION =
  "Play Parking Chair Panic, a mobile-friendly Pittsburgh lane dodger from Local Jagoff Arcade.";
const SHARE_IMAGE = `${SITE_URL}/images/social-share.jpg`;

const gameConfig = {
  mode: "dodger",
  bgText: "PARKING CHAIR PANIC",
  playerLabel: "SPOT",
  badThings: ["CHAIR", "CONE", "BLOCK"],
  startText: "Tap left, middle, or right to dodge the street chaos.",
  instructions:
    "Mobile: tap the left, middle, or right side to switch lanes. Desktop: arrow keys or click a lane.",
};

export default function ParkingChairPanicPage() {
  const gameJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Parking Chair Panic",
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
          key="parking-chair-panic-jsonld"
        />
      </Head>

      <Navbar />
      <SimpleArcadeGame
        title="Parking Chair Panic"
        kicker="LOCAL JAGOFF ARCADE"
        description="Slide through the street, dodge chairs, cones, and blocks, and protect your parking spot."
        config={gameConfig}
      />
    </div>
  );
}
