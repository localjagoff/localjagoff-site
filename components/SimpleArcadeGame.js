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
      width: 1280,
      height: 640,
      mode: config.mode,
      running: false,
      over: false,
      frame: 0,
      score: 0,
      best: savedBest,
      health: config.mode === "patch" ? 10 : 3,
      speed: 6,
      lanes: [300, 640, 980],
      player: { x: 640, y: 520, lane: 1, w: 112, h: 58 },
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

    const addParticles = (x, y, amount = 12, color = "#ffe600") => {
      for (let i = 0; i < amount; i += 1) {
        game.particles.push({
          x,
          y,
          vx: -4 + Math.random() * 8,
          vy: -5 + Math.random() * 9,
          size: 2 + Math.random() * 5,
          life: 20 + Math.random() * 18,
          color,
        });
      }
    };

    const reset = () => {
      game.running = true;
      game.over = false;
      game.frame = 0;
      game.score = 0;
      game.health = config.mode === "patch" ? 10 : 3;
      game.speed = config.mode === "shooter" ? 4.4 : 6;
      game.player.x = 640;
      game.player.y = config.mode === "patch" ? 538 : 520;
      game.player.lane = 1;
      game.things = [];
      game.bullets = [];
      game.particles = [];
      game.lastSpawn = 0;
      game.lastShot = 0;
      setScore(0);
      setStatus("Running");
      addParticles(game.player.x, game.player.y, 18);
    };

    const end = () => {
      game.running = false;
      game.over = true;
      setStatus("Wrecked");
      setBestIfNeeded();
      addParticles(game.player.x, game.player.y, 30, "#ffcc33");
    };

    const hurt = () => {
      game.health -= 1;
      addParticles(game.player.x, game.player.y, 12, "#ff3b30");
      if (game.health <= 0) end();
    };

    const spawnDodger = () => {
      const lane = Math.floor(Math.random() * 3);
      game.things.push({
        lane,
        x: game.lanes[lane],
        y: -86,
        w: 94,
        h: 70,
        kind: config.badThings[Math.floor(Math.random() * config.badThings.length)],
      });
    };

    const spawnPatch = () => {
      const r = 34 + Math.random() * 24;
      game.things.push({
        x: 130 + Math.random() * 1020,
        y: 138 + Math.random() * 360,
        r,
        life: 150,
        maxLife: 150,
      });
    };

    const spawnCatch = () => {
      const bad = Math.random() < 0.25;
      game.things.push({
        x: 90 + Math.random() * 1100,
        y: -60,
        w: bad ? 54 : 64,
        h: bad ? 54 : 48,
        bad,
        speed: 5.2 + Math.random() * 3.8 + game.score / 300,
        kind: bad ? config.badThings[0] : config.goodThings[0],
      });
    };

    const spawnShooter = () => {
      game.things.push({
        x: 90 + Math.random() * 1100,
        y: -70,
        w: 70,
        h: 52,
        speed: 3.4 + Math.random() * 2.4 + game.score / 390,
        kind: config.badThings[Math.floor(Math.random() * config.badThings.length)],
      });
    };

    const spawn = () => {
      if (game.mode === "patch") return spawnPatch();
      if (game.mode === "catch") return spawnCatch();
      if (game.mode === "shooter") return spawnShooter();
      return spawnDodger();
    };

    const shoot = () => {
      if (game.frame - game.lastShot < 12) return;
      game.lastShot = game.frame;
      game.bullets.push({ x: game.player.x, y: game.player.y - 44, w: 9, h: 26 });
      addParticles(game.player.x, game.player.y - 50, 4, "#fff27a");
    };

    const patchAt = (x, y) => {
      for (let i = game.things.length - 1; i >= 0; i -= 1) {
        const item = game.things[i];
        if (Math.hypot(x - item.x, y - item.y) <= item.r + 18) {
          game.things.splice(i, 1);
          game.score += 14;
          addParticles(item.x, item.y, 18, "#ffe600");
          setScore(Math.floor(game.score));
          return;
        }
      }
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
        game.player.x = clamp(x, 95, game.width - 95);
        if (game.mode === "shooter") shoot();
        return;
      }

      const lane = x < game.width / 3 ? 0 : x > (game.width / 3) * 2 ? 2 : 1;
      game.player.lane = lane;
      game.player.x = game.lanes[lane];
    };

    const updateDodger = () => {
      if (game.frame - game.lastSpawn > Math.max(36, 72 - game.score / 18)) {
        spawn();
        game.lastSpawn = game.frame;
      }

      game.speed = Math.min(15, 6 + game.score / 210);
      game.things = game.things
        .map((item) => ({ ...item, y: item.y + game.speed }))
        .filter((item) => {
          if (item.y > game.height + 90) {
            game.score += 4;
            return false;
          }
          return true;
        });

      for (const item of game.things) {
        if (item.lane === game.player.lane && item.y + item.h > game.player.y - 8 && item.y < game.player.y + game.player.h) {
          end();
          break;
        }
      }
    };

    const updatePatch = () => {
      if (game.frame - game.lastSpawn > Math.max(18, 46 - game.score / 28)) {
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
      game.score += 0.05;
    };

    const updateCatch = () => {
      if (game.frame - game.lastSpawn > Math.max(20, 46 - game.score / 30)) {
        spawn();
        game.lastSpawn = game.frame;
      }

      game.things = game.things.filter((item) => {
        item.y += item.speed;
        const hit = item.y + item.h > game.player.y && Math.abs(item.x - game.player.x) < 75;
        if (hit) {
          if (item.bad) hurt();
          else {
            game.score += 8;
            addParticles(item.x, item.y, 12, "#ffe600");
          }
          return false;
        }
        if (item.y > game.height + 70) {
          if (!item.bad) hurt();
          return false;
        }
        return true;
      });
    };

    const updateShooter = () => {
      if (game.frame - game.lastSpawn > Math.max(20, 54 - game.score / 34)) {
        spawn();
        game.lastSpawn = game.frame;
      }

      if (game.frame - game.lastShot > 20) shoot();

      game.bullets = game.bullets
        .map((bullet) => ({ ...bullet, y: bullet.y - 13 }))
        .filter((bullet) => bullet.y > -40);

      game.things = game.things
        .map((enemy) => ({ ...enemy, y: enemy.y + enemy.speed }))
        .filter((enemy) => {
          if (enemy.y > game.height + 60) {
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
            addParticles(enemy.x, enemy.y, 18, "#ffe600");
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

    const drawNeonText = (text, x, y, size = 24, align = "left") => {
      ctx.save();
      ctx.textAlign = align;
      ctx.font = `900 ${size}px Oswald, Arial, sans-serif`;
      ctx.shadowColor = "rgba(255, 230, 0, 0.55)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ffe600";
      ctx.fillText(text, x, y);
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    const drawBackground = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, game.height);
      gradient.addColorStop(0, "#1d1d1d");
      gradient.addColorStop(0.5, "#070707");
      gradient.addColorStop(1, "#000");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, game.width, game.height);

      ctx.fillStyle = "rgba(255, 230, 0, 0.055)";
      for (let i = 0; i < 14; i += 1) {
        const x = i * 118 - ((game.frame * 0.28) % 118) - 60;
        const h = 56 + (i % 5) * 24;
        ctx.fillRect(x, 118 - h, 74, h);
      }

      ctx.strokeStyle = "rgba(255, 230, 0, 0.12)";
      ctx.lineWidth = 1;
      for (let y = 128; y < game.height; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(game.width, y);
        ctx.stroke();
      }

      drawNeonText(config.bgText || title.toUpperCase(), 42, 70, 28);
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.font = "900 18px Oswald, Arial, sans-serif";
      ctx.fillText("412", 1010 - ((game.frame * 0.18) % 240), 86);
      ctx.fillText("724", 1160 - ((game.frame * 0.2) % 260), 126);
    };

    const drawArena = () => {
      const roadX = 92;
      const roadY = 112;
      const roadW = 1096;
      const roadH = 446;
      ctx.fillStyle = "#0c0c0c";
      roundRect(ctx, roadX, roadY, roadW, roadH, 28);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 230, 0, 0.45)";
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 4;
      ctx.setLineDash([34, 28]);
      ctx.beginPath();
      ctx.moveTo(456, roadY + ((game.frame * game.speed) % 62));
      ctx.lineTo(456, roadY + roadH);
      ctx.moveTo(824, roadY + ((game.frame * game.speed) % 62));
      ctx.lineTo(824, roadY + roadH);
      ctx.stroke();
      ctx.setLineDash([]);

      if (game.mode === "patch") {
        ctx.fillStyle = "rgba(255, 230, 0, 0.05)";
        for (let x = roadX + 42; x < roadX + roadW; x += 94) {
          ctx.fillRect(x, roadY + 36, 48, roadH - 72);
        }
      }
    };

    const drawHud = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      roundRect(ctx, 28, 22, 360, 68, 18);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 230, 0, 0.3)";
      ctx.stroke();
      drawNeonText(title.toUpperCase(), 50, 50, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "800 17px Inter, Arial, sans-serif";
      ctx.fillText(`Score: ${Math.floor(game.score)}   Lives: ${game.health}`, 50, 76);
    };

    const drawCar = (x, y, label) => {
      ctx.fillStyle = "#ffe600";
      roundRect(ctx, x - 56, y, 112, 58, 16);
      ctx.fill();
      ctx.fillStyle = "#111";
      roundRect(ctx, x - 34, y + 9, 68, 24, 8);
      ctx.fill();
      ctx.fillStyle = "#000";
      circle(ctx, x - 36, y + 54, 12);
      ctx.fill();
      circle(ctx, x + 36, y + 54, 12);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "900 14px Oswald, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label || "JAGOFF", x, y + 48);
      ctx.textAlign = "start";
    };

    const drawBasket = () => {
      const x = game.player.x;
      const y = game.player.y;
      ctx.fillStyle = "#ffe600";
      roundRect(ctx, x - 82, y, 164, 42, 16);
      ctx.fill();
      ctx.fillStyle = "#000";
      roundRect(ctx, x - 66, y + 10, 132, 20, 10);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "900 16px Oswald, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("FRY BASKET", x, y + 29);
      ctx.textAlign = "start";
    };

    const drawShooter = () => {
      const x = game.player.x;
      const y = game.player.y;
      ctx.fillStyle = "#ffe600";
      ctx.beginPath();
      ctx.moveTo(x, y - 56);
      ctx.lineTo(x + 50, y + 38);
      ctx.lineTo(x + 18, y + 24);
      ctx.lineTo(x, y + 50);
      ctx.lineTo(x - 18, y + 24);
      ctx.lineTo(x - 50, y + 38);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = "900 15px Oswald, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("YINZ", x, y + 17);
      ctx.textAlign = "start";
    };

    const drawPlayer = () => {
      if (game.mode === "patch") return;
      if (game.mode === "catch") return drawBasket();
      if (game.mode === "shooter") return drawShooter();
      drawCar(game.player.x, game.player.y, config.playerLabel || "JAGOFF");
    };

    const drawChair = (x, y) => {
      ctx.strokeStyle = "#ffe600";
      ctx.lineWidth = 7;
      ctx.strokeRect(x - 26, y + 8, 52, 40);
      ctx.beginPath();
      ctx.moveTo(x - 18, y + 48);
      ctx.lineTo(x - 32, y + 76);
      ctx.moveTo(x + 18, y + 48);
      ctx.lineTo(x + 32, y + 76);
      ctx.moveTo(x - 28, y + 25);
      ctx.lineTo(x + 28, y + 25);
      ctx.stroke();
    };

    const drawCone = (x, y) => {
      ctx.fillStyle = "#ff8a00";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 44, y + 78);
      ctx.lineTo(x - 44, y + 78);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(x - 25, y + 48, 50, 9);
      ctx.fillStyle = "#222";
      roundRect(ctx, x - 56, y + 74, 112, 15, 5);
      ctx.fill();
    };

    const drawBus = (x, y) => {
      ctx.fillStyle = "#2a2a2a";
      roundRect(ctx, x - 64, y, 128, 70, 14);
      ctx.fill();
      ctx.fillStyle = "#ffe600";
      ctx.fillRect(x - 52, y + 12, 104, 20);
      ctx.fillStyle = "#000";
      circle(ctx, x - 36, y + 67, 10);
      ctx.fill();
      circle(ctx, x + 36, y + 67, 10);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "900 13px Oswald, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BUS", x, y + 53);
      ctx.textAlign = "start";
    };

    const drawBlocker = (x, y, text = "BLOCK") => {
      ctx.fillStyle = "#171717";
      roundRect(ctx, x - 58, y, 116, 66, 14);
      ctx.fill();
      ctx.strokeStyle = "#ffe600";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#ffe600";
      ctx.font = "900 14px Oswald, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, x, y + 39);
      ctx.textAlign = "start";
    };

    const drawFry = (item) => {
      const x = item.x;
      const y = item.y;
      if (item.bad) {
        ctx.fillStyle = "#b61111";
        circle(ctx, x, y, 28);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "900 11px Oswald, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SPLAT", x, y + 4);
        ctx.textAlign = "start";
        return;
      }
      ctx.fillStyle = "#b61111";
      roundRect(ctx, x - 26, y - 7, 52, 46, 8);
      ctx.fill();
      ctx.fillStyle = "#ffe600";
      for (let i = 0; i < 7; i += 1) ctx.fillRect(x - 23 + i * 7, y - 30 + (i % 2) * 7, 5, 38);
    };

    const drawEnemy = (item) => {
      const label = item.kind || "BAD";
      ctx.save();
      ctx.shadowColor = "rgba(255, 230, 0, 0.35)";
      ctx.shadowBlur = 10;
      if (label === "CHAIR") drawChair(item.x, item.y);
      else if (label === "CONE") drawCone(item.x, item.y);
      else if (label === "BUS") drawBus(item.x, item.y);
      else if (label === "MERGE") drawBlocker(item.x, item.y, "MERGE");
      else if (label === "TOLL") drawBlocker(item.x, item.y, "TOLL");
      else drawBlocker(item.x, item.y, label);
      ctx.restore();
    };

    const drawPatch = (item) => {
      ctx.fillStyle = "#020202";
      ctx.beginPath();
      ctx.ellipse(item.x, item.y, item.r, item.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 230, 0, 0.5)";
      ctx.lineWidth = 4;
      ctx.stroke();
      const barW = item.r * 2;
      ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      ctx.fillRect(item.x - item.r, item.y + item.r + 14, barW, 6);
      ctx.fillStyle = "#ffe600";
      ctx.fillRect(item.x - item.r, item.y + item.r + 14, barW * (item.life / item.maxLife), 6);
    };

    const drawThing = (item) => {
      if (game.mode === "patch") return drawPatch(item);
      if (game.mode === "catch") return drawFry(item);
      return drawEnemy(item);
    };

    const drawBullets = () => {
      ctx.fillStyle = "#ffe600";
      game.bullets.forEach((bullet) => {
        ctx.shadowColor = "rgba(255, 230, 0, 0.85)";
        ctx.shadowBlur = 12;
        roundRect(ctx, bullet.x - bullet.w / 2, bullet.y - bullet.h / 2, bullet.w, bullet.h, 5);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    };

    const drawParticles = () => {
      game.particles.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life / 34);
        ctx.fillStyle = p.color;
        circle(ctx, p.x, p.y, p.size);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    const drawOverlay = () => {
      if (game.running && !game.over) return;
      ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
      ctx.fillRect(0, 0, game.width, game.height);
      ctx.textAlign = "center";
      drawNeonText(game.over ? "GAME OVER, YA JAGOFF" : title.toUpperCase(), game.width / 2, 250, 60, "center");
      ctx.fillStyle = "#fff";
      ctx.font = "800 24px Inter, Arial, sans-serif";
      ctx.fillText(game.over ? `Score: ${Math.floor(game.score)}  •  Best: ${game.best}` : config.startText, game.width / 2, 296);
      ctx.fillStyle = "#ffe600";
      roundRect(ctx, game.width / 2 - 140, 340, 280, 66, 18);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = "900 24px Oswald, Arial, sans-serif";
      ctx.fillText(game.over ? "PLAY AGAIN" : "START GAME", game.width / 2, 382);
      ctx.textAlign = "start";
    };

    const render = () => {
      update();
      drawBackground();
      drawArena();
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
          game.player.x = clamp(game.player.x - 62, 95, game.width - 95);
        }
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        if (game.mode === "dodger") {
          game.player.lane = clamp(game.player.lane + 1, 0, 2);
          game.player.x = game.lanes[game.player.lane];
        } else {
          game.player.x = clamp(game.player.x + 62, 95, game.width - 95);
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
