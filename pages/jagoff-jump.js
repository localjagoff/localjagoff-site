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

export default function JagoffJumpPage() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const jumpRef = useRef(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    const savedBest = Number(window.localStorage.getItem("jagoffJumpBestScore") || 0);
    setBestScore(savedBest);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const game = {
      width: 900,
      height: 440,
      groundY: 338,
      running: false,
      gameOver: false,
      frame: 0,
      score: 0,
      best: savedBest,
      speed: 6,
      obstacleTimer: 0,
      nextObstacleAt: 70,
      player: { x: 105, y: 274, w: 50, h: 64, vy: 0, onGround: true },
      obstacles: [],
      particles: [],
    };

    const fitCanvas = () => {
      const wrap = canvas.parentElement;
      if (!wrap) return;
      const displayWidth = Math.min(wrap.clientWidth, game.width);
      canvas.width = game.width;
      canvas.height = game.height;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${Math.round(displayWidth * (game.height / game.width))}px`;
    };

    const roundedRect = (x, y, w, h, r) => {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
    };

    const dust = (x, y, amount = 7) => {
      for (let i = 0; i < amount; i += 1) {
        game.particles.push({
          x,
          y,
          vx: -1 - Math.random() * 4,
          vy: -Math.random() * 3,
          size: 2 + Math.random() * 4,
          life: 18 + Math.random() * 18,
        });
      }
    };

    const resetGame = () => {
      game.running = true;
      game.gameOver = false;
      game.frame = 0;
      game.score = 0;
      game.speed = 6;
      game.obstacleTimer = 0;
      game.nextObstacleAt = 68;
      game.player.y = game.groundY - game.player.h;
      game.player.vy = 0;
      game.player.onGround = true;
      game.obstacles = [];
      game.particles = [];
      setScore(0);
      setStatus("Running");
      dust(game.player.x + 12, game.groundY - 4, 8);
    };

    const endGame = () => {
      game.running = false;
      game.gameOver = true;
      const finalScore = Math.floor(game.score / 10);
      setScore(finalScore);
      setStatus("Wrecked");
      dust(game.player.x + game.player.w / 2, game.groundY - 6, 20);

      if (finalScore > game.best) {
        game.best = finalScore;
        setBestScore(finalScore);
        window.localStorage.setItem("jagoffJumpBestScore", String(finalScore));
      }
    };

    const jump = () => {
      if (!game.running || game.gameOver) {
        resetGame();
        return;
      }

      if (game.player.onGround) {
        game.player.vy = -16.2;
        game.player.onGround = false;
        dust(game.player.x + 10, game.groundY - 3, 9);
      }
    };

    jumpRef.current = jump;

    const addObstacle = () => {
      const options = [
        { type: "pothole", w: 70, h: 24, y: game.groundY - 21 },
        { type: "chair", w: 42, h: 58, y: game.groundY - 58 },
        { type: "cone", w: 44, h: 54, y: game.groundY - 54 },
        { type: "fries", w: 46, h: 52, y: game.groundY - 52 },
      ];
      const obstacle = options[Math.floor(Math.random() * options.length)];
      game.obstacles.push({ ...obstacle, x: game.width + 40 });
    };

    const touching = (a, b) => {
      const padX = 9;
      const padY = 8;
      return (
        a.x + padX < b.x + b.w - padX &&
        a.x + a.w - padX > b.x + padX &&
        a.y + padY < b.y + b.h - padY &&
        a.y + a.h - padY > b.y + padY
      );
    };

    const update = () => {
      if (!game.running || game.gameOver) return;

      game.frame += 1;
      game.score += 1;
      game.speed = Math.min(13.5, 6 + game.score / 900);
      game.obstacleTimer += 1;

      if (game.obstacleTimer >= game.nextObstacleAt) {
        addObstacle();
        game.obstacleTimer = 0;
        game.nextObstacleAt = Math.max(50, 92 - game.score / 140 + Math.random() * 30);
      }

      game.player.vy += 0.78;
      game.player.y += game.player.vy;

      if (game.player.y + game.player.h >= game.groundY) {
        if (!game.player.onGround && game.player.vy > 4) {
          dust(game.player.x + 10, game.groundY - 3, 4);
        }
        game.player.y = game.groundY - game.player.h;
        game.player.vy = 0;
        game.player.onGround = true;
      }

      game.obstacles = game.obstacles
        .map((obstacle) => ({ ...obstacle, x: obstacle.x - game.speed }))
        .filter((obstacle) => obstacle.x + obstacle.w > -70);

      for (const obstacle of game.obstacles) {
        if (touching(game.player, obstacle)) {
          endGame();
          break;
        }
      }

      game.particles = game.particles
        .map((particle) => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vy: particle.vy + 0.16,
          life: particle.life - 1,
        }))
        .filter((particle) => particle.life > 0);

      if (game.frame % 6 === 0) setScore(Math.floor(game.score / 10));
    };

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, game.height);
      gradient.addColorStop(0, "#191919");
      gradient.addColorStop(0.55, "#070707");
      gradient.addColorStop(1, "#000000");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, game.width, game.height);

      ctx.fillStyle = "rgba(255, 230, 0, 0.08)";
      for (let i = 0; i < 8; i += 1) {
        const x = i * 150 - ((game.frame * 0.45) % 150) - 40;
        const h = 50 + (i % 4) * 25;
        ctx.fillRect(x, game.groundY - h - 42, 72, h);
      }

      ctx.fillStyle = "rgba(255, 230, 0, 0.1)";
      ctx.font = "900 22px Oswald, Arial, sans-serif";
      ctx.fillText("412", 56 - ((game.frame * 0.22) % 260), 82);
      ctx.fillText("724", 354 - ((game.frame * 0.22) % 260), 124);
      ctx.fillText("YINZ", 642 - ((game.frame * 0.22) % 260), 92);
    };

    const drawGround = () => {
      ctx.fillStyle = "#ffe600";
      ctx.fillRect(0, game.groundY, game.width, 5);
      ctx.fillStyle = "#101010";
      ctx.fillRect(0, game.groundY + 5, game.width, game.height - game.groundY);
      ctx.strokeStyle = "rgba(255, 230, 0, 0.42)";
      ctx.lineWidth = 4;
      ctx.setLineDash([28, 20]);
      ctx.beginPath();
      ctx.moveTo(-((game.frame * game.speed) % 48), game.groundY + 48);
      ctx.lineTo(game.width, game.groundY + 48);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawPlayer = () => {
      const p = game.player;
      const bounce = p.onGround ? Math.sin(game.frame / 6) * 2 : 0;
      ctx.save();
      ctx.translate(p.x, p.y + bounce);
      ctx.fillStyle = "#ffe600";
      roundedRect(8, 8, p.w - 16, p.h - 10, 10);
      ctx.fill();
      ctx.fillStyle = "#0b0b0b";
      roundedRect(14, 18, p.w - 28, p.h - 30, 5);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "900 9px Oswald, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LOCAL", p.w / 2, 36);
      ctx.fillText("JAGOFF", p.w / 2, 47);
      ctx.fillStyle = "#ffe600";
      ctx.beginPath();
      ctx.arc(p.w / 2, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(p.w / 2 - 5, -2, 2, 0, Math.PI * 2);
      ctx.arc(p.w / 2 + 6, -2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.w / 2 + 1, 3, 7, 0.15, Math.PI - 0.15);
      ctx.stroke();
      ctx.fillStyle = "#050505";
      ctx.fillRect(5, p.h - 6, 15, 8);
      ctx.fillRect(p.w - 20, p.h - 6, 15, 8);
      ctx.restore();
      ctx.textAlign = "start";
    };

    const drawObstacle = (obstacle) => {
      if (obstacle.type === "pothole") {
        ctx.fillStyle = "#030303";
        ctx.beginPath();
        ctx.ellipse(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, obstacle.w / 2, obstacle.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = 3;
        ctx.stroke();
        return;
      }

      if (obstacle.type === "chair") {
        ctx.strokeStyle = "#ffe600";
        ctx.lineWidth = 5;
        ctx.strokeRect(obstacle.x + 8, obstacle.y + 8, 26, 25);
        ctx.beginPath();
        ctx.moveTo(obstacle.x + 13, obstacle.y + 33);
        ctx.lineTo(obstacle.x + 7, obstacle.y + obstacle.h);
        ctx.moveTo(obstacle.x + 31, obstacle.y + 33);
        ctx.lineTo(obstacle.x + 37, obstacle.y + obstacle.h);
        ctx.stroke();
        return;
      }

      if (obstacle.type === "fries") {
        ctx.fillStyle = "#b61111";
        roundedRect(obstacle.x + 6, obstacle.y + 18, 34, 30, 5);
        ctx.fill();
        ctx.fillStyle = "#ffe600";
        for (let i = 0; i < 5; i += 1) ctx.fillRect(obstacle.x + 9 + i * 6, obstacle.y + 2 + (i % 2) * 4, 4, 28);
        return;
      }

      ctx.fillStyle = "#ff8a00";
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.w / 2, obstacle.y);
      ctx.lineTo(obstacle.x + obstacle.w, obstacle.y + obstacle.h);
      ctx.lineTo(obstacle.x, obstacle.y + obstacle.h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(obstacle.x + 11, obstacle.y + 30, obstacle.w - 22, 6);
    };

    const drawParticles = () => {
      ctx.fillStyle = "rgba(255, 230, 0, 0.45)";
      game.particles.forEach((particle) => {
        ctx.globalAlpha = Math.max(0, particle.life / 32);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    const drawHud = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      roundedRect(24, 22, 176, 60, 14);
      ctx.fill();
      ctx.fillStyle = "#ffe600";
      ctx.font = "900 15px Oswald, Arial, sans-serif";
      ctx.fillText("JAGOFF JUMP", 42, 46);
      ctx.fillStyle = "#fff";
      ctx.font = "800 18px Inter, Arial, sans-serif";
      ctx.fillText(`Score: ${Math.floor(game.score / 10)}`, 42, 70);
    };

    const drawOverlay = () => {
      if (game.running && !game.gameOver) return;
      ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
      ctx.fillRect(0, 0, game.width, game.height);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe600";
      ctx.font = "900 54px Oswald, Arial, sans-serif";
      ctx.fillText(game.gameOver ? "GAME OVER, YA JAGOFF" : "JAGOFF JUMP", game.width / 2, 160);
      ctx.fillStyle = "#fff";
      ctx.font = "700 22px Inter, Arial, sans-serif";
      ctx.fillText(game.gameOver ? `Score: ${Math.floor(game.score / 10)}  •  Best: ${game.best}` : "Tap to jump. Dodge the Pittsburgh nonsense.", game.width / 2, 204);
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = "700 17px Inter, Arial, sans-serif";
      ctx.fillText(game.gameOver ? "Tap to run it back." : "Mobile: tap anywhere. Desktop: spacebar.", game.width / 2, 238);
      ctx.fillStyle = "#ffe600";
      roundedRect(game.width / 2 - 105, 268, 210, 52, 14);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = "900 20px Oswald, Arial, sans-serif";
      ctx.fillText(game.gameOver ? "PLAY AGAIN" : "START GAME", game.width / 2, 301);
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

    const handlePointer = (event) => {
      event.preventDefault();
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
    canvas.addEventListener("pointerdown", handlePointer, { passive: false });
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
        <Link href="/" className={styles.backLink}>
          ← Back to shop
        </Link>

        <section className={styles.hero}>
          <p className={styles.kicker}>LOCAL JAGOFF PRESENTS</p>
          <h1>Jagoff Jump</h1>
          <p>
            Tap to jump. Dodge potholes, parking chairs, cones, and flying fries.
            Survive as long as you can, ya jagoff.
          </p>
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
            <button type="button" onClick={() => jumpRef.current?.()}>
              TAP TO JUMP
            </button>
          </div>

          <p className={styles.instructions}>
            Mobile: tap the game or the big button. Desktop: spacebar, enter, arrow up, click, or tap.
          </p>
        </section>
      </main>
    </div>
  );
}
