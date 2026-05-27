import Head from "next/head";
import Link from "next/link";
import Navbar from "../components/Navbar";

const SITE_URL = "https://www.localjagoff.com";
const PAGE_URL = `${SITE_URL}/whats-a-jagoff`;
const PAGE_TITLE = "What’s a Jagoff? Pittsburgh Meaning & Local Slang | Local Jagoff";
const PAGE_DESCRIPTION =
  "What does jagoff mean? Learn the Pittsburgh and Western Pennsylvania meaning of jagoff, how locals use it, and why Local Jagoff turned the word into black-and-gold gear.";
const SHARE_IMAGE = `${SITE_URL}/images/social-share.jpg`;

const FAQS = [
  {
    question: "What does jagoff mean?",
    answer:
      "Jagoff is Pittsburgh and Western Pennsylvania slang for someone acting annoying, foolish, irritating, clueless, or difficult. It can be an insult, a joke, or a playful callout depending on tone and context.",
  },
  {
    question: "Is jagoff a Pittsburgh word?",
    answer:
      "Jagoff is strongly tied to Pittsburgh and Western Pennsylvania. You may hear it elsewhere, but around Pittsburgh it has a local flavor that people recognize right away.",
  },
  {
    question: "Is jagoff offensive?",
    answer:
      "It can be offensive if used aggressively, but it is also often used jokingly between friends or as a light local jab. Like most slang, tone matters.",
  },
  {
    question: "Why is the brand called Local Jagoff?",
    answer:
      "Local Jagoff leans into the Pittsburgh attitude behind the word: smart mouth, local pride, black-and-gold energy, and not taking yourself too seriously.",
  },
];

export default function WhatsAJagoff() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "What’s a Jagoff? Pittsburgh Meaning and Local Slang",
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    image: SHARE_IMAGE,
    author: {
      "@type": "Organization",
      name: "Local Jagoff",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Local Jagoff",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: SHARE_IMAGE,
      },
    },
  };

  return (
    <div className="jagoffPage">
      <Head>
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} key="description" />
        <link rel="canonical" href={PAGE_URL} key="canonical" />

        <meta property="og:title" content={PAGE_TITLE} key="og:title" />
        <meta property="og:description" content={PAGE_DESCRIPTION} key="og:description" />
        <meta property="og:url" content={PAGE_URL} key="og:url" />
        <meta property="og:type" content="article" key="og:type" />
        <meta property="og:site_name" content="Local Jagoff" key="og:site_name" />
        <meta property="og:image" content={SHARE_IMAGE} key="og:image" />
        <meta property="og:image:secure_url" content={SHARE_IMAGE} key="og:image:secure_url" />
        <meta property="og:image:width" content="1200" key="og:image:width" />
        <meta property="og:image:height" content="630" key="og:image:height" />
        <meta property="og:image:alt" content="Local Jagoff Pittsburgh slang and gear" key="og:image:alt" />

        <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
        <meta name="twitter:title" content={PAGE_TITLE} key="twitter:title" />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} key="twitter:description" />
        <meta name="twitter:image" content={SHARE_IMAGE} key="twitter:image" />
        <meta name="twitter:image:alt" content="Local Jagoff Pittsburgh slang and gear" key="twitter:image:alt" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
          }}
          key="jagoff-article-jsonld"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
          }}
          key="jagoff-faq-jsonld"
        />
      </Head>

      <Navbar />

      <main className="wrap">
        <section className="hero">
          <p className="kicker">PITTSBURGH SLANG, N’AT</p>
          <h1>What’s a Jagoff?</h1>
          <p className="lead">
            A jagoff is somebody acting foolish, annoying, irritating, clueless, or just plain difficult.
            Around Pittsburgh and Western PA, though, the word has range. It can be a real insult,
            a joke between friends, or a perfectly timed local callout.
          </p>
          <div className="heroActions">
            <Link href="/">Shop Local Jagoff</Link>
            <Link href="/tees" className="secondary">See Pittsburgh Shirts</Link>
          </div>
        </section>

        <section className="answerCard">
          <p className="kicker">QUICK ANSWER</p>
          <h2>Jagoff meaning</h2>
          <p>
            <strong>Jagoff</strong> is Pittsburgh slang for a person who is being annoying, stupid, irritating,
            obnoxious, or hard to deal with. But it is not always serious. In Western PA, someone might call
            their buddy a jagoff for forgetting the chips, cutting across three lanes of traffic, or taking forever
            to leave after saying they are “ready.”
          </p>
        </section>

        <section className="contentGrid">
          <article>
            <h2>Is jagoff a Pittsburgh thing?</h2>
            <p>
              Yeah. Jagoff is one of those words that feels like home if you grew up around Pittsburgh,
              the 412, the 724, or anywhere close enough to know what a parking chair is. People outside
              the area may understand the insult, but locals know the tone.
            </p>
          </article>

          <article>
            <h2>Is jagoff bad?</h2>
            <p>
              It depends how it is said. If somebody screams it at you in traffic, that is probably not a hug.
              If your friend says, “quit being a jagoff,” while laughing, it is usually just a local way of saying
              you are being ridiculous.
            </p>
          </article>

          <article>
            <h2>How do Pittsburgh people use jagoff?</h2>
            <p>
              Pittsburghers use it for bad drivers, loudmouths, slow movers, know-it-alls, friends who deserve
              a little heat, and anyone creating unnecessary nonsense. It is flexible. That is the beauty of it.
            </p>
          </article>

          <article>
            <h2>Why Local Jagoff?</h2>
            <p>
              Local Jagoff is built around that same black-and-gold attitude: local pride, sharp humor,
              blue-collar energy, and a little smart mouth. It is Pittsburgh clothing for people who get the joke
              and are probably part of it.
            </p>
          </article>
        </section>

        <section className="examples">
          <p className="kicker">USE IT IN A SENTENCE</p>
          <h2>Examples</h2>
          <div className="exampleList">
            <p>“Quit blocking the passing lane, jagoff.”</p>
            <p>“This jagoff said he was leaving five minutes ago.”</p>
            <p>“Only a jagoff forgets the ranch for the fries.”</p>
            <p>“I love the guy, but he is a jagoff.”</p>
          </div>
        </section>

        <section className="faqSection">
          <p className="kicker">PEOPLE ALSO ASK</p>
          <h2>Jagoff FAQ</h2>
          <div className="faqList">
            {FAQS.map((item) => (
              <article key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="shopCallout">
          <div>
            <p className="kicker">LOCAL JAGOFF GEAR</p>
            <h2>Wear the word like you mean it.</h2>
            <p>
              Shop Pittsburgh shirts, hoodies, hats, 412 gear, 724 gear, and black-and-gold pieces made
              for locals who understand the assignment.
            </p>
          </div>
          <Link href="/">Shop the Drop</Link>
        </section>
      </main>

      <style jsx>{`
        .jagoffPage {
          min-height: 100vh;
          color: #fff;
          background:
            radial-gradient(circle at top left, rgba(255, 230, 0, 0.14), transparent 32%),
            linear-gradient(180deg, #050505, #000);
        }

        .wrap {
          max-width: 1120px;
          margin: 0 auto;
          padding: 42px 18px 80px;
        }

        .hero,
        .answerCard,
        .contentGrid article,
        .examples,
        .faqSection,
        .shopCallout {
          border: 1px solid rgba(255, 230, 0, 0.2);
          border-radius: 28px;
          background: rgba(12, 12, 12, 0.92);
          box-shadow: 0 22px 80px rgba(0, 0, 0, 0.4);
        }

        .hero {
          padding: 34px;
          margin-bottom: 16px;
        }

        .kicker {
          margin: 0 0 10px;
          color: #ffe600;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 1.7px;
          text-transform: uppercase;
        }

        h1,
        h2,
        h3,
        p {
          margin-top: 0;
        }

        h1 {
          margin-bottom: 16px;
          font-size: clamp(54px, 11vw, 132px);
          line-height: 0.88;
          letter-spacing: -1px;
          text-transform: uppercase;
        }

        h2 {
          margin-bottom: 12px;
          color: #ffe600;
          font-size: clamp(28px, 4vw, 46px);
          line-height: 1;
          text-transform: uppercase;
        }

        h3 {
          margin-bottom: 8px;
          color: #fff;
          font-size: 22px;
          text-transform: uppercase;
        }

        p {
          color: #dedede;
          font-size: 16px;
          line-height: 1.68;
        }

        .lead {
          max-width: 820px;
          color: #f1f1f1;
          font-size: 20px;
          line-height: 1.55;
        }

        .heroActions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 24px;
        }

        .heroActions :global(a),
        .shopCallout :global(a) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          border-radius: 14px;
          padding: 12px 16px;
          background: #ffe600;
          color: #000;
          font-weight: 950;
          text-decoration: none;
          text-transform: uppercase;
        }

        .heroActions :global(a.secondary) {
          border: 1px solid rgba(255, 230, 0, 0.34);
          background: #151515;
          color: #fff;
        }

        .answerCard,
        .examples,
        .faqSection {
          padding: 26px;
          margin-bottom: 16px;
        }

        .answerCard strong {
          color: #fff;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .contentGrid article {
          padding: 24px;
        }

        .exampleList {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .exampleList p {
          margin: 0;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 16px;
          background: #050505;
          color: #fff;
          font-weight: 800;
        }

        .faqList {
          display: grid;
          gap: 12px;
        }

        .faqList article {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 16px;
          background: #050505;
        }

        .faqList p {
          margin-bottom: 0;
        }

        .shopCallout {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: center;
          padding: 28px;
          background:
            linear-gradient(135deg, rgba(255, 230, 0, 0.16), rgba(12, 12, 12, 0.94));
        }

        .shopCallout p {
          margin-bottom: 0;
          max-width: 720px;
        }

        @media (max-width: 760px) {
          .wrap {
            padding: 28px 14px 70px;
          }

          .hero,
          .answerCard,
          .contentGrid article,
          .examples,
          .faqSection,
          .shopCallout {
            border-radius: 22px;
            padding: 20px;
          }

          .contentGrid,
          .exampleList,
          .shopCallout {
            grid-template-columns: 1fr;
            display: grid;
          }

          .heroActions :global(a),
          .shopCallout :global(a) {
            width: 100%;
          }

          .lead {
            font-size: 17px;
          }
        }
      `}</style>
    </div>
  );
}
