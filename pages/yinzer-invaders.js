import Head from "next/head";
import Navbar from "../components/Navbar";
import SimpleArcadeGame from "../components/SimpleArcadeGame";

const SITE_URL = "https://www.localjagoff.com";
const PAGE_URL = `${SITE_URL}/yinzer-invaders`;
const PAGE_TITLE = "Yinzer Invaders | Local Jagoff Arcade";
const PAGE_DESCRIPTION =
  "Play Yinzer Invaders, a mobile-friendly retro shooter from Local Jagoff Arcade.";
const SHARE_IMAGE = `${SITE_URL}/images/social-share.jpg`;

const gameConfig = {
  mode: "shooter",
  bgText: "YINZER INVADERS",
  badThings: ["CONE", "CHAIR", "TOLL"],
  startText: "Move left and right. Tap to blast the incoming nonsense.",
  instructions:
    "Mobile: drag or tap to move and shoot. Desktop: arrow keys to move, spacebar/enter to shoot.",
};

export default function YinzerInvadersPage() {
  const gameJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Yinzer Invaders",
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
          key="yinzer-invaders-jsonld"
        />
      </Head>

      <Navbar />
      <SimpleArcadeGame
        title="Yinzer Invaders"
        kicker="LOCAL JAGOFF ARCADE"
        description="Retro arcade shooter energy. Move, shoot, and clear the screen before the chaos gets through."
        config={gameConfig}
      />
    </div>
  );
}
