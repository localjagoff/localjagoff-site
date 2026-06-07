import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import styles from "../styles/JagoffJump.module.css";

const SITE_URL = "https://www.localjagoff.com";
const PAGE_URL = `${SITE_URL}/jagoff-jump`;
const PAGE_TITLE = "Jagoff Jump | Local Jagoff";
const PAGE_DESCRIPTION =
  "Play Jagoff Jump, a mobile-friendly Pittsburgh endless runner from Local Jagoff. Tap to jump, dodge potholes, parking chairs, cones, and fries.";
const SHARE_IMAGE = `${SITE_URL}/images/social-share.jpg`;

const W = 420;
const H = 680;

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
}

export default function JagoffJumpPage() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const jumpRef = useRef(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const savedBest = Number(window.localStorage.getItem("jagoffJumpBestScore") || 0);
    setBestScore(savedBest);

    const game = {
      width: W,
      height: H,
      groundY: 565,
      running: false,
      over: false,
      frame: 0,
      score: 0,
      best: savedBest,
      speed: 4.7,
      gravity: 0.72,
      spawnTimer: 0,
      nextSpawn: 70,
      player: { x: 82, y: 501, w: 46, h: 64, vy: 0, onGround: true },
      obstacles: [],
      particles: [],
    };

    const fitCanvas = () => {
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = "100%";
      canvas.style.height = "auto";
    };

    const addDust = (x, y, count = 8, color = "#ffe600") => {
      for (let i = 0; i < count; i += 1) {
        game.particles.push({
          x,
          y,
          vx: -2.5 + Math.random() * 5,
          vy: -3 + Math.random() * 5,
          r: 2 + Math.random() * 3.5,
          life: 16 + Math.random() * 18,
          color,
        });
      }
    };

    const resetGame = () => {
      game.running = true;
      game.over = false;
      game.frame = 0;
      game.score = 0;
      game.speed = 4.7;
      game.spawnTimer = 0;
      game.nextSpawn = 62;
      game.player.y = game.groundY - game.player.h;
      game.player.vy = 0;
      game.player.onGround = true;
      game.obstacles = [];
      game.particles = [];
      setScore(0);
      setStatus("Running");
      addDust(game.player.x + 12, game.groundY, 12);
    };

    const endGame = () => {
      game.running = false;
      game.over = true;
      const finalScore = Math.floor(game.score / 10);
      setScore(finalScore);
      setStatus("Wrecked");
      addDust(game.player.x + game.player.w / 2, game.groundY, 20, "#ffcc33");

      if (finalScore > game.best) {
        game.best = finalScore;
        setBestScore(finalScore);
        window.localStorage.setItem("jagoffJumpBestScore", String(finalScore));
      }
    };

    const jump = () => {
      if (!game.running || game.over) {
        resetGame();
        return;
      }

      if (game.player.onGround) {
        game.player.vy = -14.2;
        game.player.onGround = false;
        addDust(game.player.x + 10, game.groundY, 9);
      }
    };

    jumpRef.current = jump;

    const spawnObstacle = () => {
      const options = [
        { type: "pothole", w: 66, h: 24, y: game.groundY - 22 },
        { type: "chair", w: 42, h: 58, y: game.groundY - 58 },
        { type: "cone", w: 44, h: 54, y: game.groundY - 54 },
        { type: "fries", w: 42, h: 50, y: game.groundY - 50 },
      ];
      const obstacle = options[Math.floor(Math.random() * options.length)];
      game.obstacles.push({ ...obstacle, x: W + 34 });
    };

    const hit = (a, b) => {
      const pad = 8;
      return (
        a.x + pad < b.x + b.w - pad &&
        a.x + a.w - pad > b.x + pad &&
        a.y + pad < b.y + b.h - pad &&
        a.y + a.h - pad > b.y + pad
      );
    };

    const update = () => {
      if (!game.running || game.over) return;

      game.frame += 1;
      game.score += 1;
      game.speed = Math.min(10.5, 4.7 + game.score / 650);
      game.spawnTimer += 1;

      if (game.spawnTimer >= game.nextSpawn) {
        spawnObstacle();
        game.spawnTimer = 0;
        game.nextSpawn = Math.max(46, 82 - game.score / 120 + Math.random() * 20);
      }

      game.player.vy += game.gravity;
      game.player.y += game.player.vy;

      if (game.player.y + game.player.h >= game.groundY) {
        game.player.y = game.groundY - game.player.h;
        game.player.vy = 0;
        game.player.onGround = true;
      }

      game.obstacles = game.obstacles
        .map((obstacle) => ({ ...obstacle, x: obstacle.x - game.speed }))
        .filter((obstacle) => obstacle.x + obstacle.w > -70);

      for (const obstacle of game.obstacles) {
        if (hit(game.player, obstacle)) {
          endGame();
          break;
        }
      }

      game.particles = game.particles
        .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.15, life: p.life - 1 }))
        .filter((p) => p.life > 0);

      if (game.frame % 6 === 0) setScore(Math.floor(game.score / 10));
    };

    const drawText = (text, x, y, size, color = "#ffe600", align = "center") => {
      ctx.save();
      ctx.textAlign = align;
      ctx.font = `900 ${size}px Oswald, Arial, sans-serif`;
      ctx.shadowColor = color === "#ffe600" ? "rgba(255, 230, 0, 0.42)" : "transparent";
      ctx.shadowBlur = color === "#ffe600" ? 10 : 0;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.restore();
    };

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, "#1c1c1c");
      gradient.addColorStop(0.48, "#070707");
      gradient.addColorStop(1, "#000000");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(255, 230, 0, 0.055)";
      for (let i = 0; i < 7; i += 1) {
        const x = i * 70 - ((game.frame * 0.22) % 70);
        const h = 60 + (i % 4) * 28;
        ctx.fillRect(x, 125 - h, 42, h);
      }

      drawText("JAGOFF JUMP", 20, 46, 16, "#ffe600", "left");
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.font = "900 28px Oswald, Arial, sans-serif";
      ctx.fillText("412", 315 - ((game.frame * 0.18) % 130), 96);
      ctx.fillText("724", 380 - ((game.frame * 0.2) % 150), 135);
    };

    const drawGround = () => {
      ctx.fillStyle = "#0a0a0a";
      roundRect(ctx, 16, 118, 388, 485, 22);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 230, 0, 0.42)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#ffe600";
      ctx.fillRect(16, game.groundY, 388, 4);

      ctx.strokeStyle = "rgba(255, 230, 0, 0.33)";
      ctx.lineWidth = 4;
      ctx.setLineDash([28, 24]);
      ctx.beginPath();
      ctx.moveTo(-((game.frame * game.speed) % 52), game.groundY + 42);
      ctx.lineTo(W, game.groundY + 42);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawPlayer = () => {
      const p = game.player;
      const bounce = p.onGround ? Math.sin(game.frame / 6) * 1.5 : 0;
      ctx.save();
      ctx.translate(p.x, p.y + bounce);
      ctx.fillStyle = "#ffe600";
      roundRect(ctx, 5, 12, p.w - 10, p.h - 12, 10);
      ctx.fill();
      ctx.fillStyle = "#0b0b0b";
      roundRect(ctx, 11, 23, p.w - 22, p.h - 32, 5);
      ctx.fill();
      drawText("LJ", p.w / 2, 48, 14, "#fff");
      ctx.fillStyle = "#ffe600";
      circle(ctx, p.w / 2, 5, 15);
      ctx.fill();
      ctx.fillStyle = "#000";
      circle(ctx, p.w / 2 - 5, 3, 2);
      ctx.fill();
      circle(ctx, p.w / 2 + 6, 3, 2);
      ctx.fill();
      ctx.fillRect(4, p.h - 7, 15, 8);
      ctx.fillRect(p.w - 19, p.h - 7, 15, 8);
      ctx.restore();
    };

    const drawObstacle = (o) => {
      if (o.type === "pothole") {
        ctx.fillStyle = "#020202";
        ctx.beginPath();
        ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 230, 0, 0.4)";
        ctx.stroke();
        return;
      }

      if (o.type === "chair") {
        ctx.strokeStyle = "#ffe600";
        ctx.lineWidth = 5;
        ctx.strokeRect(o.x + 7, o.y + 7, 28, 25);
        ctx.beginPath();
        ctx.moveTo(o.x + 13, o.y + 32);
        ctx.lineTo(o.x + 7, o.y + o.h);
        ctx.moveTo(o.x + 31, o.y + 32);
        ctx.lineTo(o.x + 37, o.y + o.h);
        ctx.stroke();
        return;
      }

      if (o.type === "fries") {
        ctx.fillStyle = "#b61111";
        roundRect(ctx, o.x + 5, o.y + 17, 32, 30, 6);
        ctx.fill();
        ctx.fillStyle = "#ffe600";
        for (let i = 0; i < 5; i += 1) ctx.fillRect(o.x + 8 + i * 6, o.y + 2 + (i % 2) * 4, 4, 28);
        return;
      }

      ctx.fillStyle = "#ff8a00";
      ctx.beginPath();
      ctx.moveTo(o.x + o.w / 2, o.y);
      ctx.lineTo(o.x + o.w, o.y + o.h);
      ctx.lineTo(o.x, o.y + o.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(o.x + 10, o.y + 31, o.w - 20, 6);
    };

    const drawParticles = () => {
      game.particles.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life / 32);
        ctx.fillStyle = p.color;
        circle(ctx, p.x, p.y, p.r);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    const drawHud = () => {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      roundRect(ctx, 15, 14, 165, 54, 14);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,230,0,0.25)";
      ctx.stroke();
      drawText("JAGOFF JUMP", 28, 35, 12, "#ffe600", "left");
      ctx.fillStyle = "#fff";
      ctx.font = "800 13px Inter, Arial, sans-serif";
      ctx.fillText(`Score ${Math.floor(game.score / 10)}`, 28, 55);
    };

    const drawOverlay = () => {
      if (game.running && !game.over) return;
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.fillRect(0, 0, W, H);
      drawText(game.over ? "GAME OVER" : "JAGOFF JUMP", W / 2, 245, game.over ? 48 : 40);
      if (game.over) drawText("YA JAGOFF", W / 2, 292, 34);
      ctx.fillStyle = "#fff";
      ctx.font = "800 20px Inter, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(game.over ? `Score: ${Math.floor(game.score / 10)}  •  Best: ${game.best}` : "Tap to jump. Dodge the nonsense.", W / 2, game.over ? 334 : 292);
      ctx.fillStyle = "#ffe600";
      roundRect(ctx, W / 2 - 118, game.over ? 370 : 330, 236, 58, 16);
      ctx.fill();
      drawText(game.over ? "PLAY AGAIN" : "START GAME", W / 2, game.over ? 407 : 367, 22, "#000");
      ctx.textAlign = "start";
    };

    const render = () => {
      update();
      drawBackground();
      drawGround();
      game.obstacles.forEach(drawObstacle);
      drawPlayer();
      drawParticles();
      drawHud();
      drawOverlay();
      frameRef.current = window.requestAnimationFrame(render);
    };

    const handlePointer = () => {
      jump();
    };

    const handleKey = (event) => {
      if (["Space", "ArrowUp", "Enter"].includes(event.code)) {
        event.preventDefault();
        jump();
      }
    };

    fitCanvas();
    window.addEventListener("resize", fitCanvas);
    window.addEventListener("keydown", handleKey);
    canvas.addEventListener("pointerdown", handlePointer);
    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      jumpRef.current = null;
      window.removeEventListener("resize", fitCanvas);
      window.removeEventListener("keydown", handleKey);
      canvas.removeEventListener("pointerdown", handlePointer);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const gameJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Jagoff Jump",
    url: PAGE_URL,
    description: PAGE_DESCRIPTION,
    publisher: { "@type": "Organization", name: "Local Jagoff", url: SITE_URL },
    gamePlatform: "Web browser",
    applicationCategory: "Game",
  };

  return (
    <div className={styles.page}>
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
          key="jagoff-jump-jsonld"
        />
      </Head>

      <Navbar />

      <main className={styles.wrap}>
        <Link href="/arcade" className={styles.backLink}>← Back to Arcade</Link>

        <section className={styles.hero}>
          <p className={styles.kicker}>LOCAL JAGOFF PRESENTS</p>
          <h1>Jagoff Jump</h1>
          <p>Tap to jump. Dodge potholes, parking chairs, cones, and flying fries.</p>
        </section>

        <section className={styles.gameCard} aria-label="Jagoff Jump game">
          <div className={styles.scoreBar}>
            <div><span>Score</span><strong>{score}</strong></div>
            <div><span>Best</span><strong>{bestScore}</strong></div>
            <div><span>Status</span><strong>{status}</strong></div>
          </div>

          <div className={styles.canvasWrap}>
            <canvas ref={canvasRef} className={styles.canvas} aria-label="Jagoff Jump playable canvas game" />
          </div>

          <div className={styles.mobileControls}>
            <button type="button" onClick={() => jumpRef.current?.()}>TAP TO JUMP</button>
          </div>

          <p className={styles.instructions}>Mobile: tap the game or the big button. Desktop: spacebar, enter, arrow up, click, or tap.</p>
        </section>
      </main>
    </div>
  );
}
