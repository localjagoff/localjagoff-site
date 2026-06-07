import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "../styles/SimpleArcadeGame.module.css";

const W = 420;
const H = 680;
const LANES = [105, 210, 315];

function slugify(value) {
  return String(value || "game").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

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

export default function SimpleArcadeGame({ title, kicker, description, config }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const gameRef = useRef(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const storageKey = `localJagoffArcadeBest:${slugify(title)}`;
    const savedBest = Number(window.localStorage.getItem(storageKey) || 0);
    setBestScore(savedBest);

    const game = {
      width: W,
      height: H,
      mode: config.mode,
      running: false,
      over: false,
      frame: 0,
      score: 0,
      best: savedBest,
      health: config.mode === "patch" ? 8 : 3,
      speed: 4.5,
      lanes: LANES,
      player: { x: 210, y: 565, lane: 1 },
      things: [],
      bullets: [],
      particles: [],
      pointerDown: false,
      lastSpawn: 0,
      lastShot: 0,
    };

    gameRef.current = game;

    const fitCanvas = () => {
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = "100%";
      canvas.style.height = "auto";
    };

    const saveBest = () => {
      const finalScore = Math.floor(game.score);
      setScore(finalScore);
      if (finalScore > game.best) {
        game.best = finalScore;
        setBestScore(finalScore);
        window.localStorage.setItem(storageKey, String(finalScore));
      }
    };

    const particles = (x, y, count = 10, color = "#ffe600") => {
      for (let i = 0; i < count; i += 1) {
        game.particles.push({
          x,
          y,
          vx: -3 + Math.random() * 6,
          vy: -4 + Math.random() * 7,
          r: 2 + Math.random() * 4,
          life: 16 + Math.random() * 18,
          color,
        });
      }
    };

    const reset = () => {
      game.running = true;
      game.over = false;
      game.frame = 0;
      game.score = 0;
      game.health = config.mode === "patch" ? 8 : 3;
      game.speed = config.mode === "shooter" ? 3.8 : 4.5;
      game.player.x = 210;
      game.player.y = 565;
      game.player.lane = 1;
      game.things = [];
      game.bullets = [];
      game.particles = [];
      game.lastSpawn = 0;
      game.lastShot = 0;
      setScore(0);
      setStatus("Running");
      particles(210, 565, 14);
    };

    const end = () => {
      game.running = false;
      game.over = true;
      setStatus("Wrecked");
      saveBest();
      particles(game.player.x, game.player.y, 22, "#ffcc33");
    };

    const hurt = () => {
      game.health -= 1;
      particles(game.player.x, game.player.y, 10, "#ff3b30");
      if (game.health <= 0) end();
    };

    const spawn = () => {
      if (game.mode === "patch") {
        game.things.push({ x: 45 + Math.random() * 330, y: 150 + Math.random() * 360, r: 22 + Math.random() * 16, life: 130, maxLife: 130 });
        return;
      }

      if (game.mode === "catch") {
        const bad = Math.random() < 0.25;
        game.things.push({ x: 35 + Math.random() * 350, y: -40, bad, speed: 3.6 + Math.random() * 2.7 + game.score / 280 });
        return;
      }

      if (game.mode === "shooter") {
        const names = config.badThings || ["BAD"];
        game.things.push({ x: 45 + Math.random() * 330, y: -48, speed: 2.8 + Math.random() * 1.8 + game.score / 380, kind: names[Math.floor(Math.random() * names.length)] });
        return;
      }

      const lane = Math.floor(Math.random() * 3);
      const names = config.badThings || ["BAD"];
      game.things.push({ lane, x: LANES[lane], y: -55, kind: names[Math.floor(Math.random() * names.length)] });
    };

    const shoot = () => {
      if (game.frame - game.lastShot < 13) return;
      game.lastShot = game.frame;
      game.bullets.push({ x: game.player.x, y: game.player.y - 34 });
    };

    const handleAction = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * W;
      const y = ((clientY - rect.top) / rect.height) * H;

      if (!game.running || game.over) {
        reset();
        return;
      }

      if (game.mode === "patch") {
        for (let i = game.things.length - 1; i >= 0; i -= 1) {
          const p = game.things[i];
          if (Math.hypot(x - p.x, y - p.y) <= p.r + 18) {
            game.things.splice(i, 1);
            game.score += 12;
            particles(p.x, p.y, 12);
            setScore(Math.floor(game.score));
            return;
          }
        }
        return;
      }

      if (game.mode === "catch" || game.mode === "shooter") {
        game.player.x = clamp(x, 42, W - 42);
        if (game.mode === "shooter") shoot();
        return;
      }

      const lane = x < W / 3 ? 0 : x > (W / 3) * 2 ? 2 : 1;
      game.player.lane = lane;
      game.player.x = LANES[lane];
    };

    const update = () => {
      if (!game.running || game.over) return;
      game.frame += 1;

      const spawnGap = game.mode === "patch" ? 42 : game.mode === "catch" ? 38 : game.mode === "shooter" ? 44 : 52;
      if (game.frame - game.lastSpawn > Math.max(20, spawnGap - game.score / 28)) {
        spawn();
        game.lastSpawn = game.frame;
      }

      if (game.mode === "patch") {
        game.things = game.things.filter((p) => {
          p.life -= 1;
          if (p.life <= 0) {
            hurt();
            return false;
          }
          return true;
        });
        game.score += 0.04;
      } else if (game.mode === "catch") {
        game.things = game.things.filter((item) => {
          item.y += item.speed;
          const hit = item.y > game.player.y - 24 && Math.abs(item.x - game.player.x) < 56;
          if (hit) {
            if (item.bad) hurt();
            else {
              game.score += 8;
              particles(item.x, item.y, 8);
            }
            return false;
          }
          if (item.y > H + 40) {
            if (!item.bad) hurt();
            return false;
          }
          return true;
        });
      } else if (game.mode === "shooter") {
        if (game.frame - game.lastShot > 20) shoot();
        game.bullets = game.bullets.map((b) => ({ ...b, y: b.y - 10 })).filter((b) => b.y > -30);
        game.things = game.things.map((e) => ({ ...e, y: e.y + e.speed })).filter((e) => {
          if (e.y > H + 40) {
            hurt();
            return false;
          }
          return true;
        });
        for (let i = game.things.length - 1; i >= 0; i -= 1) {
          const e = game.things[i];
          for (let b = game.bullets.length - 1; b >= 0; b -= 1) {
            const bullet = game.bullets[b];
            if (Math.abs(bullet.x - e.x) < 34 && Math.abs(bullet.y - e.y) < 34) {
              game.things.splice(i, 1);
              game.bullets.splice(b, 1);
              game.score += 10;
              particles(e.x, e.y, 12);
              break;
            }
          }
        }
      } else {
        game.speed = Math.min(11, 4.5 + game.score / 230);
        game.things = game.things.map((o) => ({ ...o, y: o.y + game.speed })).filter((o) => {
          if (o.y > H + 55) {
            game.score += 4;
            return false;
          }
          return true;
        });
        for (const o of game.things) {
          if (o.lane === game.player.lane && o.y > game.player.y - 48 && o.y < game.player.y + 48) {
            end();
            break;
          }
        }
      }

      game.particles = game.particles.map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.16, life: p.life - 1 })).filter((p) => p.life > 0);
      if (game.frame % 6 === 0) setScore(Math.floor(game.score));
    };

    const drawText = (text, x, y, size, color = "#ffe600", align = "center") => {
      ctx.save();
      ctx.textAlign = align;
      ctx.font = `900 ${size}px Oswald, Arial, sans-serif`;
      ctx.shadowColor = "rgba(255, 230, 0, 0.42)";
      ctx.shadowBlur = color === "#ffe600" ? 10 : 0;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.restore();
    };

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, "#1c1c1c");
      gradient.addColorStop(0.48, "#070707");
      gradient.addColorStop(1, "#000");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(255, 230, 0, 0.06)";
      for (let i = 0; i < 7; i += 1) {
        const x = i * 70 - ((game.frame * 0.22) % 70);
        const h = 60 + (i % 4) * 28;
        ctx.fillRect(x, 125 - h, 42, h);
      }
      drawText(config.bgText || title.toUpperCase(), 20, 46, 16, "#ffe600", "left");
    };

    const drawRoad = () => {
      ctx.fillStyle = "#090909";
      roundRect(ctx, 28, 98, 364, 505, 22);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 230, 0, 0.42)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.setLineDash([24, 24]);
      ctx.beginPath();
      ctx.moveTo(158, 110 + ((game.frame * game.speed) % 48));
      ctx.lineTo(158, 592);
      ctx.moveTo(262, 110 + ((game.frame * game.speed) % 48));
      ctx.lineTo(262, 592);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawHud = () => {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      roundRect(ctx, 15, 14, 175, 54, 14);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,230,0,0.25)";
      ctx.stroke();
      drawText(title.toUpperCase(), 28, 35, 12, "#ffe600", "left");
      ctx.fillStyle = "#fff";
      ctx.font = "800 13px Inter, Arial, sans-serif";
      ctx.fillText(`Score ${Math.floor(game.score)}  Lives ${game.health}`, 28, 55);
    };

    const drawPlayer = () => {
      const x = game.player.x;
      const y = game.player.y;
      ctx.fillStyle = "#ffe600";
      if (game.mode === "catch") {
        roundRect(ctx, x - 55, y, 110, 36, 14);
        ctx.fill();
        drawText("BASKET", x, y + 25, 14, "#000");
        return;
      }
      if (game.mode === "shooter") {
        ctx.beginPath();
        ctx.moveTo(x, y - 42);
        ctx.lineTo(x + 38, y + 32);
        ctx.lineTo(x, y + 18);
        ctx.lineTo(x - 38, y + 32);
        ctx.closePath();
        ctx.fill();
        drawText("YINZ", x, y + 12, 12, "#000");
        return;
      }
      roundRect(ctx, x - 40, y, 80, 44, 13);
      ctx.fill();
      ctx.fillStyle = "#111";
      roundRect(ctx, x - 25, y + 7, 50, 17, 6);
      ctx.fill();
      ctx.fillStyle = "#000";
      circle(ctx, x - 26, y + 42, 9);
      ctx.fill();
      circle(ctx, x + 26, y + 42, 9);
      ctx.fill();
      drawText(config.playerLabel || "CAR", x, y + 36, 11, "#fff");
    };

    const drawThing = (item) => {
      if (game.mode === "patch") {
        ctx.fillStyle = "#020202";
        ctx.beginPath();
        ctx.ellipse(item.x, item.y, item.r, item.r * 0.56, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffe600";
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(item.x - item.r, item.y + item.r + 10, item.r * 2, 5);
        ctx.fillStyle = "#ffe600";
        ctx.fillRect(item.x - item.r, item.y + item.r + 10, item.r * 2 * (item.life / item.maxLife), 5);
        return;
      }

      if (game.mode === "catch") {
        if (item.bad) {
          ctx.fillStyle = "#b61111";
          circle(ctx, item.x, item.y, 23);
          ctx.fill();
          drawText("SPLAT", item.x, item.y + 5, 10, "#fff");
        } else {
          ctx.fillStyle = "#b61111";
          roundRect(ctx, item.x - 22, item.y - 6, 44, 38, 7);
          ctx.fill();
          ctx.fillStyle = "#ffe600";
          for (let i = 0; i < 5; i += 1) ctx.fillRect(item.x - 18 + i * 8, item.y - 28 + (i % 2) * 5, 5, 35);
        }
        return;
      }

      ctx.fillStyle = item.kind === "CONE" ? "#ff8a00" : "#151515";
      roundRect(ctx, item.x - 35, item.y, 70, 48, 12);
      ctx.fill();
      ctx.strokeStyle = "#ffe600";
      ctx.lineWidth = 3;
      ctx.stroke();
      drawText(item.kind || "BAD", item.x, item.y + 30, 11, "#ffe600");
    };

    const drawBullets = () => {
      ctx.fillStyle = "#ffe600";
      game.bullets.forEach((b) => {
        roundRect(ctx, b.x - 4, b.y - 11, 8, 22, 4);
        ctx.fill();
      });
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

    const drawOverlay = () => {
      if (game.running && !game.over) return;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      drawText(game.over ? "GAME OVER" : title.toUpperCase(), W / 2, 245, game.over ? 48 : 38);
      if (game.over) drawText("YA JAGOFF", W / 2, 292, 34);
      ctx.fillStyle = "#fff";
      ctx.font = "800 20px Inter, Arial, sans-serif";
      ctx.fillText(game.over ? `Score: ${Math.floor(game.score)}  •  Best: ${game.best}` : config.startText, W / 2, game.over ? 334 : 292);
      ctx.fillStyle = "#ffe600";
      roundRect(ctx, W / 2 - 118, game.over ? 370 : 330, 236, 58, 16);
      ctx.fill();
      drawText(game.over ? "PLAY AGAIN" : "START GAME", W / 2, game.over ? 407 : 367, 22, "#000");
      ctx.textAlign = "start";
    };

    const render = () => {
      update();
      drawBackground();
      drawRoad();
      game.things.forEach(drawThing);
      drawBullets();
      drawPlayer();
      drawParticles();
      drawHud();
      drawOverlay();
      frameRef.current = window.requestAnimationFrame(render);
    };

    const onPointerDown = (event) => {
      event.preventDefault();
      game.pointerDown = true;
      handleAction(event.clientX, event.clientY);
    };

    const onPointerMove = (event) => {
      if (!game.pointerDown) return;
      if (game.mode === "catch" || game.mode === "shooter") handleAction(event.clientX, event.clientY);
    };

    const onPointerUp = () => {
      game.pointerDown = false;
    };

    const onKeyDown = (event) => {
      if (!game.running || game.over) {
        if (["Space", "Enter", "ArrowUp"].includes(event.code)) {
          event.preventDefault();
          reset();
        }
        return;
      }
      if (event.code === "ArrowLeft") {
        event.preventDefault();
        if (game.mode === "dodger") {
          game.player.lane = clamp(game.player.lane - 1, 0, 2);
          game.player.x = LANES[game.player.lane];
        } else game.player.x = clamp(game.player.x - 40, 42, W - 42);
      }
      if (event.code === "ArrowRight") {
        event.preventDefault();
        if (game.mode === "dodger") {
          game.player.lane = clamp(game.player.lane + 1, 0, 2);
          game.player.x = LANES[game.player.lane];
        } else game.player.x = clamp(game.player.x + 40, 42, W - 42);
      }
      if (["Space", "Enter", "ArrowUp"].includes(event.code)) {
        event.preventDefault();
        if (game.mode === "shooter") shoot();
      }
    };

    fitCanvas();
    window.addEventListener("resize", fitCanvas);
    window.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    frameRef.current = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", fitCanvas);
      window.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [config, title]);

  return (
    <main className={styles.wrap}>
      <Link href="/arcade" className={styles.backLink}>← Back to Arcade</Link>

      <section className={styles.hero}>
        <p className={styles.kicker}>{kicker}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      <section className={styles.gameCabinet} aria-label={`${title} game`}>
        <div className={styles.scoreBar}>
          <div><span>Score</span><strong>{score}</strong></div>
          <div><span>Best</span><strong>{bestScore}</strong></div>
          <div><span>Status</span><strong>{status}</strong></div>
        </div>

        <div className={styles.canvasWrap}>
          <canvas ref={canvasRef} className={styles.canvas} aria-label={`${title} playable canvas game`} />
        </div>

        <p className={styles.instructions}>{config.instructions}</p>
      </section>
    </main>
  );
}
