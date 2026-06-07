import Head from "next/head";
import Link from "next/link";
import Navbar from "../components/Navbar";

const SITE_URL = "https://www.localjagoff.com";
const PAGE_URL = `${SITE_URL}/arcade`;
const PAGE_TITLE = "Local Jagoff Arcade | Pittsburgh Browser Games";
const PAGE_DESCRIPTION =
  "Play Local Jagoff Arcade games, including Jagoff Jump, Parking Chair Panic, Pothole Patrol, Fry Catcher, Yinzer Invaders, and Bridge Rage.";
const SHARE_IMAGE = `${SITE_URL}/images/social-share.jpg`;

const games = [
  {
    title: "Jagoff Jump",
    status: "Playable now",
    href: "/jagoff-jump",
    tag: "Endless runner",
    description:
      "Tap to jump over potholes, parking chairs, cones, and fries. Built for mobile first.",
  },
  {
    title: "Parking Chair Panic",
    status: "Playable now",
    href: "/parking-chair-panic",
    tag: "Lane dodger",
    description:
      "Slide through tight Pittsburgh streets, dodge chairs, cones, and blocks, and protect your spot.",
  },
  {
    title: "Pothole Patrol",
    status: "Playable now",
    href: "/pothole-patrol",
    tag: "Tap reflex",
    description:
      "Patch potholes before the timer runs out. Faster every round. More chaos every block.",
  },
  {
    title: "Fry Catcher",
    status: "Playable now",
    href: "/fry-catcher",
    tag: "Catch game",
    description:
      "Catch falling fries, avoid splats, and build the biggest basket in the burgh.",
  },
  {
    title: "Yinzer Invaders",
    status: "Playable now",
    href: "/yinzer-invaders",
    tag: "Retro shooter",
    description:
      "Old-school arcade shooter with black-and-gold energy and nonsense flying at you.",
  },
  {
    title: "Bridge Rage",
    status: "Playable now",
    href: "/bridge-rage",
    tag: "Traffic survival",
    description:
      "Survive merging traffic, bridges, blockers, and bad lane decisions.",
  },
];

export default function ArcadePage() {
  const arcadeJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: PAGE_TITLE,
    url: PAGE_URL,
    description: PAGE_DESCRIPTION,
    isPartOf: {
      "@type": "WebSite",
      name: "Local Jagoff",
      url: SITE_URL,
    },
  };

  return (
    <div className="arcadePage">
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
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(arcadeJsonLd).replace(/</g, "\\u003c"),
          }}
          key="arcade-jsonld"
        />
      </Head>

      <Navbar />

      <main className="arcadeWrap">
        <Link href="/" className="backLink">
          ← Back to shop
        </Link>

        <section className="arcadeHero">
          <p className="kicker">LOCAL JAGOFF PRESENTS</p>
          <h1>Arcade</h1>
          <p>
            A little corner of the site for dumb, fun, Pittsburgh-style browser games.
            Mobile-friendly first, jagoff-approved always.
          </p>
          <div className="heroActions">
            <Link href="/jagoff-jump" className="primaryBtn">
              Play Jagoff Jump
            </Link>
          </div>
        </section>

        <section className="gamesGrid" aria-label="Local Jagoff arcade games">
          {games.map((game) => (
            <Link key={game.title} href={game.href} className="gameCard playable">
              <div className="cardTop">
                <span className="gameTag">{game.tag}</span>
                <span className="status live">{game.status}</span>
              </div>
              <h2>{game.title}</h2>
              <p>{game.description}</p>
              <span className="cardAction">Play now →</span>
            </Link>
          ))}
        </section>
      </main>

      <style jsx>{`
        .arcadePage {
          min-height: 100vh;
          color: #fff;
          background: transparent;
        }

        .arcadeWrap {
          width: min(1120px, 100%);
          margin: 0 auto;
          padding: 24px 20px 44px;
        }

        .backLink {
          display: inline-block;
          margin-bottom: 14px;
          color: #cfcfcf;
          font-weight: 800;
        }

        .backLink:hover {
          color: #ffe600;
        }

        .arcadeHero {
          margin-bottom: 22px;
          padding: 24px;
          border: 1px solid #252525;
          border-radius: 24px;
          background:
            radial-gradient(circle at top left, rgba(255, 230, 0, 0.12), transparent 36%),
            linear-gradient(180deg, rgba(255, 230, 0, 0.06), rgba(255, 230, 0, 0) 44%),
            rgba(12, 12, 12, 0.9);
          box-shadow: 0 20px 46px rgba(0, 0, 0, 0.34);
        }

        .kicker {
          margin: 0 0 8px;
          color: #ffe600;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.6px;
        }

        .arcadeHero h1 {
          margin: 0 0 10px;
          font-size: clamp(46px, 8vw, 88px);
          line-height: 0.92;
          text-transform: uppercase;
        }

        .arcadeHero p {
          max-width: 780px;
          margin: 0;
          color: #dedede;
          font-size: 16px;
          line-height: 1.6;
        }

        .heroActions {
          margin-top: 18px;
        }

        .primaryBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 20px;
          border-radius: 14px;
          background: linear-gradient(180deg, #fff27a 0%, #ffe600 100%);
          color: #000;
          font-weight: 900;
          letter-spacing: 0.4px;
          box-shadow: 0 12px 26px rgba(255, 230, 0, 0.18);
        }

        .primaryBtn:hover {
          transform: translateY(-1px);
        }

        .gamesGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .gameCard {
          min-height: 240px;
          display: flex;
          flex-direction: column;
          padding: 18px;
          border: 1px solid #252525;
          border-radius: 22px;
          background:
            linear-gradient(180deg, rgba(255, 230, 0, 0.055), transparent 42%),
            rgba(14, 14, 14, 0.92);
          transition:
            transform 0.16s ease,
            border-color 0.16s ease,
            background 0.16s ease;
        }

        .gameCard.playable:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 230, 0, 0.55);
          background:
            linear-gradient(180deg, rgba(255, 230, 0, 0.09), transparent 46%),
            rgba(18, 18, 18, 0.96);
        }

        .cardTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 16px;
        }

        .gameTag,
        .status {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.7px;
          text-transform: uppercase;
        }

        .gameTag {
          color: #dcdcdc;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid #2d2d2d;
        }

        .status.live {
          color: #000;
          background: #ffe600;
        }

        .gameCard h2 {
          margin: 0 0 10px;
          font-size: 28px;
          line-height: 1.05;
        }

        .gameCard p {
          margin: 0;
          color: #cacaca;
          font-size: 14px;
          line-height: 1.55;
        }

        .cardAction {
          margin-top: auto;
          padding-top: 18px;
          color: #ffe600;
          font-weight: 900;
        }

        @media (max-width: 900px) {
          .gamesGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .arcadeWrap {
            padding: 18px 12px 30px;
          }

          .arcadeHero {
            padding: 18px;
            border-radius: 20px;
          }

          .arcadeHero h1 {
            font-size: 52px !important;
          }

          .arcadeHero p {
            font-size: 14px;
            line-height: 1.55;
          }

          .primaryBtn {
            width: 100%;
            min-height: 54px;
          }

          .gamesGrid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .gameCard {
            min-height: 205px;
            padding: 16px;
            border-radius: 18px;
          }

          .gameCard h2 {
            font-size: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
