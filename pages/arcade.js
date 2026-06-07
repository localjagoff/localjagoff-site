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
    controls: "Tap to jump",
    description:
      "Jump over potholes, parking chairs, cones, and fries. Quick, simple, and built for mobile.",
  },
  {
    title: "Parking Chair Panic",
    status: "Playable now",
    href: "/parking-chair-panic",
    tag: "Lane dodger",
    controls: "Tap lanes",
    description:
      "Pick a lane, dodge chairs and cones, and keep your spot alive as the street speeds up.",
  },
  {
    title: "Pothole Patrol",
    status: "Playable now",
    href: "/pothole-patrol",
    tag: "Tap reflex",
    controls: "Tap targets",
    description:
      "Patch potholes before their timers run out. More pop up the longer you survive.",
  },
  {
    title: "Fry Catcher",
    status: "Playable now",
    href: "/fry-catcher",
    tag: "Catch game",
    controls: "Drag basket",
    description:
      "Move the basket, catch fries, and avoid splats. Miss too many and you are done.",
  },
  {
    title: "Yinzer Invaders",
    status: "Playable now",
    href: "/yinzer-invaders",
    tag: "Street shooter",
    controls: "Move + shoot",
    description:
      "A black-and-gold street shooter. Blast incoming chaos before it reaches the bottom.",
  },
  {
    title: "Bridge Rage",
    status: "Playable now",
    href: "/bridge-rage",
    tag: "Traffic survival",
    controls: "Tap lanes",
    description:
      "Switch lanes through bridge traffic and dodge buses, cones, and bad merges.",
  },
];

const playButtonStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  minHeight: "64px",
  width: "100%",
  marginTop: "auto",
  borderRadius: "18px",
  border: "2px solid rgba(0, 0, 0, 0.55)",
  background: "linear-gradient(180deg, #fff56f 0%, #ffe600 45%, #d7b900 100%)",
  color: "#000",
  fontFamily: "Oswald, sans-serif",
  fontSize: "20px",
  fontWeight: 900,
  letterSpacing: "1px",
  textAlign: "center",
  textDecoration: "none",
  boxShadow:
    "0 14px 30px rgba(255, 230, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.55)",
  textTransform: "uppercase",
};

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
            Pick a game below. Each card has a big yellow play button, so there is no guessing
            which game you are selecting.
          </p>
        </section>

        <section className="gamesGrid" aria-label="Local Jagoff arcade games">
          {games.map((game, index) => (
            <article key={game.title} className="gameCard">
              <div className="cardNumber">{String(index + 1).padStart(2, "0")}</div>
              <div className="cardTop">
                <span className="gameTag">{game.tag}</span>
                <span className="status live">{game.status}</span>
              </div>
              <h2>{game.title}</h2>
              <p>{game.description}</p>
              <div className="metaRow">
                <span>Controls</span>
                <strong>{game.controls}</strong>
              </div>
              <a href={game.href} style={playButtonStyle} aria-label={`Play ${game.title}`}>
                <span className="playIcon">▶</span>
                <span>Play {game.title}</span>
              </a>
            </article>
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
          width: min(1280px, 100%);
          margin: 0 auto;
          padding: 24px 18px 44px;
        }

        .backLink {
          display: inline-block;
          margin-bottom: 14px;
          color: #cfcfcf;
          font-weight: 900;
        }

        .backLink:hover {
          color: #ffe600;
        }

        .arcadeHero {
          margin-bottom: 22px;
          padding: 26px;
          border: 1px solid rgba(255, 230, 0, 0.2);
          border-radius: 26px;
          background:
            radial-gradient(circle at top left, rgba(255, 230, 0, 0.14), transparent 36%),
            linear-gradient(180deg, rgba(255, 230, 0, 0.06), rgba(255, 230, 0, 0) 44%),
            rgba(12, 12, 12, 0.92);
          box-shadow: 0 22px 54px rgba(0, 0, 0, 0.42);
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
          font-size: clamp(52px, 9vw, 104px);
          line-height: 0.9;
          text-transform: uppercase;
          text-shadow: 0 0 22px rgba(255, 230, 0, 0.2);
        }

        .arcadeHero p {
          max-width: 860px;
          margin: 0;
          color: #dedede;
          font-size: 16px;
          line-height: 1.6;
        }

        .gamesGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .gameCard {
          position: relative;
          min-height: 370px;
          display: flex;
          flex-direction: column;
          padding: 20px;
          overflow: hidden;
          border: 1px solid rgba(255, 230, 0, 0.18);
          border-radius: 24px;
          background:
            radial-gradient(circle at 80% 15%, rgba(255, 230, 0, 0.16), transparent 30%),
            linear-gradient(180deg, rgba(255, 230, 0, 0.055), transparent 42%),
            rgba(12, 12, 12, 0.94);
          box-shadow: 0 18px 46px rgba(0, 0, 0, 0.36);
        }

        .gameCard::before {
          content: "";
          position: absolute;
          inset: 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 18px;
          pointer-events: none;
        }

        .cardNumber {
          position: absolute;
          right: 18px;
          bottom: 82px;
          color: rgba(255, 230, 0, 0.08);
          font-family: "Oswald", sans-serif;
          font-size: 82px;
          font-weight: 900;
          line-height: 1;
          pointer-events: none;
        }

        .cardTop {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 18px;
        }

        .gameTag,
        .status {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 0 11px;
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
          box-shadow: 0 0 18px rgba(255, 230, 0, 0.18);
        }

        .gameCard h2 {
          position: relative;
          margin: 0 0 12px;
          font-size: 31px;
          line-height: 1.02;
          text-transform: uppercase;
        }

        .gameCard p {
          position: relative;
          margin: 0;
          color: #d0d0d0;
          font-size: 14px;
          line-height: 1.55;
        }

        .metaRow {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
          padding: 11px 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.035);
        }

        .metaRow span {
          color: #9e9e9e;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .metaRow strong {
          color: #ffe600;
          font-size: 13px;
          text-align: right;
        }

        .playIcon {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #000;
          color: #ffe600;
          font-size: 14px;
          line-height: 1;
        }

        @media (max-width: 980px) {
          .gamesGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .arcadeWrap {
            padding: 16px 10px 30px;
          }

          .arcadeHero {
            padding: 18px;
            border-radius: 20px;
          }

          .arcadeHero h1 {
            font-size: 56px !important;
          }

          .arcadeHero p {
            font-size: 14px;
            line-height: 1.55;
          }

          .gamesGrid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .gameCard {
            min-height: 330px;
            padding: 17px;
            border-radius: 20px;
          }

          .gameCard h2 {
            font-size: 28px !important;
          }
        }
      `}</style>
    </div>
  );
}
