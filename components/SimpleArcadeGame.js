import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "../styles/SimpleArcadeGame.module.css";

function slugify(value) {
  return String(value || "game")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export default function SimpleArcadeGame({ title, kicker, description, config }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const frameRef = useRef(null);
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
      width: 900,
      height: 480,
      mode: config.mode,
      running: false,
      over: false,
      frame: 0,
      score: 0,
      best: savedBest,
      health: config.mode === "patch" ? 8 : 3,
      speed: 4.2,
      player: { x: 450, y: 394, lane: 1, w: 86, h: 42 },
      lanes: [225, 450, 675],
      things: [],
      bullets: [],
      particles: [],
      pointerDown: false,
      lastSpawn: 0,
      lastShot: 0,
    };

    gameRef.current = game;

    const fitCanvas = () => {
      const wrap = canvas.parentElement;
      if (!wrap) return;
      const displayWidth = Math.min(wrap.clientWidth, game.width);
      canvas.width = game.width;
      canvas.height = game.height;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${Math.round(displayWidth * (game.height / game.width))}px`;
    };

    const setBestIfNeeded = () => {
      const finalScore = Math.max(0, Math.floor(game.score));
      setScore(finalScore);
      if (finalScore > game.best) {
        game.best = finalScore;
        setBestScore(finalScore);
        window.localStorage.setItem(storageKey, String(finalScore));
      }
    };

    const reset = () => {
      game.running = true;
      game.over = false;
      game.frame = 0;
      game.score = 0;
      game.health = config.mode === "patch" ? 8 : 3;
      game.speed = config.mode === "shooter" ? 3.3 : 4.2;
      game.player.x = 450;
      game.player.y = config.mode === "patch" ? 400 : 394;
      game.player.lane = 1;
      game.things = [];
      game.bullets = [];
      game.particles = [];
      game.lastSpawn = 0;
      game.lastShot = 0;
      setScore(0);
      setStatus("Running");
    };

    const end = () => {
      game.running = false;
      game.over = true;
      setStatus("Wrecked");
      setBestIfNeeded();
    };

    const addParticles = (x, y, count = 10) => {
      for (let i = 0; i < count; i += 1) {
        game.particles.push({
          x,
          y,
          vx: -3 + Math.random() * 6,
          vy: -4 + Math.random() * 8,
          life: 16 + Math.random() * 18,
          size: 2 + Math.random() * 5,
        });
      }
    };

    const spawnDodger = () => {
      const lane = Math.floor(Math.random() * 3);
      game.things.push({
        lane,
        x: game.lanes[lane],
        y: -46,
        w: 72,
        h: 52,
        kind: config.badThings[Math.floor(Math.random() * config.badThings.length)],
      });
    };

    const spawnPatch = () => {
      game.things.push({
        x: 80 + Math.random() * 740,
        y: 112 + Math.random() * 260,
        r: 25 + Math.random() * 18,
        life: 120,
        maxLife: 120,
      });
    };

    const spawnCatch = () => {
      const isBad = Math.random() < 0.24;
      game.things.push({
        x: 54 + Math.random() * 792,
        y: -44,
        w: 42,
        h: 42,
        speed: 3.6 + Math.random() * 3.2 + game.score / 320,
        bad: isBad,
        kind: isBad ? config.badThings[0] : config.goodThings[0],
      });
    };

    const spawnShooter = () => {
      game.things.push({
        x: 60 + Math.random() * 780,
        y: -46,
        w: 46,
        h: 38,
        speed: 2.4 + Math.random() * 1.7 + game.score / 420,
        kind: config.badThings[Math.floor(Math.random() * config.badThings.length)],
      });
    };

    const spawn = () => {
      if (config.mode === "patch") return spawnPatch();
      if (config.mode === "catch") return spawnCatch();
      if (config.mode === "shooter") return spawnShooter();
      return spawnDodger();
    };

    const hurt = () => {
      game.health -= 1;
      if (game.health <= 0) end();
    };

    const patchAt = (x, y) => {
      if (!game.running || game.over) {
        reset();
        return;
      }

      if (game.mode !== "patch") return;

      for (let i = game.things.length - 1; i >= 0; i -= 1) {
        const item = game.things[i];
        const distance = Math.hypot(x - item.x, y - item.y);
        if (distance <= item.r + 12) {
          game.things.splice(i, 1);
          game.score += 12;
          addParticles(item.x, item.y, 12);
          setScore(Math.floor(game.score));
          return;
        }
      }
    };

    const shoot = () => {
      if (game.frame - game.lastShot < 13) return;
      game.lastShot = game.frame;
      game.bullets.push({ x: game.player.x, y: game.player.y - 26, w: 8, h: 18 });
    };

    const handleAction = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * game.width;
      const y = ((clientY - rect.top) / rect.height) * game.height;

      if (!game.running || game.over) {
        reset();
        return;
      }

      if (game.mode === "patch") {
        patchAt(x, y);
        return;
      }

      if (game.mode === "catch" || game.mode === "shooter") {
        game.player.x = clamp(x, 60, game.width - 60);
        if (game.mode === "shooter") shoot();
        return;
      }

      const lane = x < game.width / 3 ? 0 : x > (game.width / 3) * 2 ? 2 : 1;
      game.player.lane = lane;
      game.player.x = game.lanes[lane];
    };

    const updateDodger = () => {
      if (game.frame - game.lastSpawn > Math.max(42, 76 - game.score / 20)) {
        spawn();
        game.lastSpawn = game.frame;
      }

      game.speed = Math.min(11, 4.2 + game.score / 220);
      game.things = game.things
        .map((item) => ({ ...item, y: item.y + game.speed }))
        .filter((item) => {
          if (item.y > game.height + 70) {
            game.score += 4;
            return false;
          }
          return true;
        });

      for (const item of game.things) {
        if (item.lane === game.player.lane && item.y + item.h > game.player.y - 10 && item.y < game.player.y + game.player.h) {
          addParticles(game.player.x, game.player.y, 14);
          end();
          break;
        }
      }
    };

    const updatePatch = () => {
      if (game.frame - game.lastSpawn > Math.max(22, 54 - game.score / 35)) {
        spawn();
        game.lastSpawn = game.frame;
      }

      game.things = game.things.filter((item) => {
        item.life -= 1;
        if (item.life <= 0) {
          hurt();
          return false;
        }
        return true;
      });
      game.score += 0.04;
    };

    const updateCatch = () => {
      if (game.frame - game.lastSpawn > Math.max(22, 50 - game.score / 28)) {
        spawn();
        game.lastSpawn = game.frame;
      }

      game.things = game.things.filter((item) => {
        item.y += item.speed;
        const hit = item.y + item.h > game.player.y && Math.abs(item.x - game.player.x) < 58;
        if (hit) {
          if (item.bad) {
            addParticles(item.x, item.y, 12);
            hurt();
          } else {
            game.score += 8;
            addParticles(item.x, item.y, 8);
          }
          return false;
        }
        if (item.y > game.height + 54) {
          if (!item.bad) hurt();
          return false;
        }
        return true;
      });
    };

    const updateShooter = () => {
      if (game.frame - game.lastSpawn > Math.max(22, 58 - game.score / 30)) {
        spawn();
        game.lastSpawn = game.frame;
      }

      if (game.frame - game.lastShot > 18) shoot();

      game.bullets = game.bullets
        .map((bullet) => ({ ...bullet, y: bullet.y - 10 }))
        .filter((bullet) => bullet.y > -30);

      game.things = game.things
        .map((enemy) => ({ ...enemy, y: enemy.y + enemy.speed }))
        .filter((enemy) => {
          if (enemy.y > game.height + 50) {
            hurt();
            return false;
          }
          return true;
        });

      for (let i = game.things.length - 1; i >= 0; i -= 1) {
        const enemy = game.things[i];
        for (let b = game.bullets.length - 1; b >= 0; b -= 1) {
          const bullet = game.bullets[b];
          const hit = bullet.x > enemy.x - enemy.w / 2 && bullet.x < enemy.x + enemy.w / 2 && bullet.y < enemy.y + enemy.h && bullet.y > enemy.y - enemy.h;
          if (hit) {
            game.things.splice(i, 1);
            game.bullets.splice(b, 1);
            game.score += 10;
            addParticles(enemy.x, enemy.y, 12);
            break;
          }
        }
      }
    };

    const update = () => {
      if (!game.running || game.over) return;
      game.frame += 1;
      if (game.mode === "patch") updatePatch();
      else if (game.mode === "catch") updateCatch();
      else if (game.mode === "shooter") updateShooter();
      else updateDodger();

      game.particles = game.particles
        .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.18, life: p.life - 1 }))
        .filter((p) => p.life > 0);

      if (game.frame % 6 === 0) setScore(Math.floor(game.score));
    };

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, game.height);
      gradient.addColorStop(0, "#191919");
      gradient.addColorStop(0.56, "#070707");
      gradient.addColorStop(1, "#000000");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, game.width, game.height);

      ctx.fillStyle = "rgba(255, 230, 0, 0.08)";
      ctx.font = "900 22px Oswald, Arial, sans-serif";
      ctx.fillText(config.bgText || "LOCAL JAGOFF", 34 - ((game.frame * 0.22) % 220), 72);
      ctx.fillText("412", 330 - ((game.frame * 0.18) % 260), 116);
      ctx.fillText("724", 650 - ((game.frame * 0.18) % 260), 88);
    };

    const drawRoad = () => {
      ctx.fillStyle = "#101010";
      ctx.fillRect(70, 92, 760, 336);
      ctx.strokeStyle = "rgba(255, 230, 0, 0.48)";
      ctx.lineWidth = 4;
      ctx.strokeRect(70, 92, 760, 336);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.17)";
      ctx.setLineDash([26, 22]);
      ctx.beginPath();
      ctx.moveTo(337, 98 + ((game.frame * game.speed) % 48));
      ctx.lineTo(337, 428);
      ctx.moveTo(563, 98 + ((game.frame * game.speed) % 48));
      ctx.lineTo(563, 428);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawHud = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
      drawRoundRect(ctx, 22, 18, 266, 58, 15);
      ctx.fill();
      ctx.fillStyle = "#ffe600";
      ctx.font = "900 14px Oswald, Arial, sans-serif";
      ctx.fillText(title.toUpperCase(), 40, 42);
      ctx.fillStyle = "#fff";
      ctx.font = "800 16px Inter, Arial, sans-serif";
      ctx.fillText(`Score: ${Math.floor(game.score)}   Lives: ${game.health}`, 40, 64);
    };

    const drawPlayer = () => {
      ctx.fillStyle = "#ffe600";
      if (game.mode === "patch") return;
      if (game.mode === "catch") {
        drawRoundRect(ctx, game.player.x - 58, game.player.y, 116, 30, 12);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.font = "900 15px Oswald, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("BASKET", game.player.x, game.player.y + 21);
        ctx.textAlign = "start";
        return;
      }
      if (game.mode === "shooter") {
        ctx.beginPath();
        ctx.moveTo(game.player.x, game.player.y - 36);
        ctx.lineTo(game.player.x + 34, game.player.y + 26);
        ctx.lineTo(game.player.x - 34, game.player.y + 26);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.font = "900 13px Oswald, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("YINZ", game.player.x, game.player.y + 11);
        ctx.textAlign = "start";
        return;
      }
      drawRoundRect(ctx, game.player.x - 42, game.player.y, 84, 42, 12);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = "900 14px Oswald, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(config.playerLabel || "JAGOFF", game.player.x, game.player.y + 27);
      ctx.textAlign = "start";
    };

    const drawThing = (item) => {
      ctx.save();
      if (game.mode === "patch") {
        ctx.fillStyle = "#050505";
        ctx.beginPath();
        ctx.ellipse(item.x, item.y, item.r, item.r * 0.58, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 230, 0, 0.45)";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = "#ffe600";
        ctx.fillRect(item.x - item.r, item.y + item.r + 10, (item.r * 2 * item.life) / item.maxLife, 4);
        ctx.restore();
        return;
      }

      if (game.mode === "catch") {
        ctx.fillStyle = item.bad ? "#b61111" : "#ffe600";
        drawRoundRect(ctx, item.x - item.w / 2, item.y - item.h / 2, item.w, item.h, 9);
        ctx.fill();
        ctx.fillStyle = item.bad ? "#fff" : "#000";
        ctx.font = "900 12px Oswald, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(item.bad ? "SPLAT" : "FRIES", item.x, item.y + 4);
        ctx.textAlign = "start";
        ctx.restore();
        return;
      }

      if (game.mode === "shooter") {
        ctx.fillStyle = "#ffe600";
        drawRoundRect(ctx, item.x - item.w / 2, item.y - item.h / 2, item.w, item.h, 10);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.font = "900 11px Oswald, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(item.kind, item.x, item.y + 4);
        ctx.textAlign = "start";
        ctx.restore();
        return;
      }

      ctx.fillStyle = item.kind === "CHAIR" ? "#ffe600" : "#ff8a00";
      drawRoundRect(ctx, item.x - item.w / 2, item.y, item.w, item.h, 10);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = "900 12px Oswald, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.kind, item.x, item.y + 32);
      ctx.textAlign = "start";
      ctx.restore();
    };

    const drawBullets = () => {
      ctx.fillStyle = "#ffe600";
      game.bullets.forEach((bullet) => {
        drawRoundRect(ctx, bullet.x - 4, bullet.y - 9, bullet.w, bullet.h, 4);
        ctx.fill();
      });
    };

    const drawParticles = () => {
      ctx.fillStyle = "rgba(255, 230, 0, 0.5)";
      game.particles.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life / 32);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    const drawOverlay = () => {
      if (game.running && !game.over) return;
      ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
      ctx.fillRect(0, 0, game.width, game.height);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe600";
      ctx.font = "900 52px Oswald, Arial, sans-serif";
      ctx.fillText(game.over ? "GAME OVER, YA JAGOFF" : title.toUpperCase(), game.width / 2, 176);
      ctx.fillStyle = "#fff";
      ctx.font = "700 21px Inter, Arial, sans-serif";
      ctx.fillText(game.over ? `Score: ${Math.floor(game.score)}  •  Best: ${game.best}` : config.startText, game.width / 2, 218);
      ctx.fillStyle = "#ffe600";
      drawRoundRect(ctx, game.width / 2 - 108, 254, 216, 54, 15);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = "900 20px Oswald, Arial, sans-serif";
      ctx.fillText(game.over ? "PLAY AGAIN" : "START GAME", game.width / 2, 288);
      ctx.textAlign = "start";
    };

    const render = () => {
      update();
      drawBackground();
      if (game.mode === "dodger") drawRoad();
      if (game.mode === "shooter") drawRoad();
      if (game.mode === "catch") drawRoad();
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
          game.player.x = game.lanes[game.player.lane];
        } else {
          game.player.x = clamp(game.player.x - 44, 60, game.width - 60);
        }
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        if (game.mode === "dodger") {
          game.player.lane = clamp(game.player.lane + 1, 0, 2);
          game.player.x = game.lanes[game.player.lane];
        } else {
          game.player.x = clamp(game.player.x + 44, 60, game.width - 60);
        }
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
      <Link href="/arcade" className={styles.backLink}>
        ← Back to Arcade
      </Link>

      <section className={styles.hero}>
        <p className={styles.kicker}>{kicker}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      <section className={styles.gameCard} aria-label={`${title} game`}>
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
