import Phaser from 'phaser';
import { WORLD as W, FLOOR, clamp, runnerSpeed, runnerGap, formationSpeed, readBest, saveBest } from './rules.mjs';

export function createArcade(parent, mode, report) {
  let disposed = false, audio = null, sound = false, current = null, failed = false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let storage; try { storage = window.localStorage; } catch {}
  let best = readBest(storage, mode);
  function tone(kind) {
    if (!sound || !audio || audio.state !== 'running') return;
    try {
      const now = audio.currentTime, oscillator = audio.createOscillator(), gain = audio.createGain();
      const frequencies = { jump: [290, 500], coin: [660, 980], shot: [360, 120], hit: [130, 45], wave: [370, 740] };
      const [from, to] = frequencies[kind] || frequencies.hit;
      oscillator.type = kind === 'hit' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(from, now);
      oscillator.frequency.exponentialRampToValueAtTime(to, now + .11);
      gain.gain.setValueAtTime(kind === 'shot' ? .018 : .045, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + .13);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(now); oscillator.stop(now + .14);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch {}
  }
  class ArcadeScene extends Phaser.Scene {
    constructor() { super('local-jagoff'); }
    preload() {
      this.load.svg('world', '/arcade/' + (mode === 'jump' ? 'street' : 'river') + '.svg');
      for (const key of ['chair', 'cone', 'token', 'ship', 'drone', 'runner-0', 'runner-1', 'runner-2', 'runner-3'])
        this.load.svg(key, '/arcade/' + key + '.svg');
      this.load.on('loaderror', () => { failed = true; if (!disposed) report({ status: 'error' }); });
    }
    create() {
      if (failed || disposed) return;
      current = this; this.status = 'ready'; this.score = 0; this.elapsed = 0; this.wave = 1; this.lives = 3;
      this.keys = { left: false, right: false, fire: false }; this.effects = []; this.nextReport = 0;
      this.sky = this.add.tileSprite(W / 2, W / 2, W, W, 'world');
      this.fx = this.add.graphics().setDepth(15);
      const dot = this.make.graphics({ x: 0, y: 0 }, false);
      dot.fillStyle(0xf2c230); dot.fillRoundedRect(0, 0, 7, 22, 3); dot.generateTexture('bullet', 7, 22);
      dot.clear(); dot.fillStyle(0xef896e); dot.fillCircle(6, 6, 6); dot.generateTexture('enemy-bullet', 12, 12); dot.destroy();
      this.enemies = this.physics.add.group({ allowGravity: false });
      this.bullets = this.physics.add.group({ allowGravity: false, maxSize: 24 });
      this.enemyShots = this.physics.add.group({ allowGravity: false, maxSize: 18 });
      this.coins = this.physics.add.group({ allowGravity: false });
      if (mode === 'jump') this.createRunner(); else this.createInvaders();
      this.physics.pause(); this.emit();
      this.events.once('postupdate', () => this.game.loop.sleep());
    }
    createRunner() {
      this.anims.create({ key: 'run', frames: [0, 1, 2, 3].map(i => ({ key: 'runner-' + i })), frameRate: 11, repeat: -1 });
      this.floor = this.add.rectangle(W / 2, FLOOR + 12, W + 200, 24, 0x000000, 0);
      this.physics.add.existing(this.floor, true);
      this.shadow = this.add.ellipse(148, FLOOR + 4, 75, 12, 0x101e19, .28);
      this.player = this.physics.add.sprite(148, FLOOR - 58, 'runner-0').setDepth(10);
      this.player.body.setSize(43, 87).setOffset(23, 26).setGravityY(1600);
      this.physics.add.collider(this.player, this.floor);
      this.physics.add.overlap(this.player, this.enemies, () => this.end());
      this.physics.add.overlap(this.player, this.coins, (_, coin) => {
        if (!coin.active || this.status !== 'playing') return;
        this.score += 25; this.burst(coin.x, coin.y, 0xf2c230, 10); coin.destroy(); tone('coin');
      });
      this.nextObstacle = 1.55; this.jumpUntil = 0;
    }
    createInvaders() {
      this.player = this.physics.add.sprite(W / 2, 637, 'ship').setDepth(10);
      this.player.setDisplaySize(79, 79);
      this.player.body.setSize(48, 54).setOffset(26, 21).setAllowGravity(false);
      this.player.setCollideWorldBounds(true);
      this.physics.world.setBounds(35, 0, W - 70, W);
      this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
        if (!bullet.active || !enemy.active || this.status !== 'playing') return;
        this.burst(enemy.x, enemy.y, enemy.row === 0 ? 0xf2c230 : 0xe47b60, 9);
        bullet.destroy(); enemy.destroy(); this.score += 40 + this.wave * 5; tone('coin');
      });
      this.physics.add.overlap(this.player, this.enemyShots, (_, shot) => {
        shot.destroy(); this.damage();
      });
      this.physics.add.overlap(this.player, this.enemies, () => this.end());
      this.direction = 1; this.lastShot = -1; this.nextEnemyShot = 1.5; this.invulnerable = 0;
      this.waveLabel = this.add.text(W / 2, 350, '', {
        fontFamily: 'Arial, sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#f2c230',
        backgroundColor: '#172821', padding: { x: 22, y: 12 },
      }).setOrigin(.5).setDepth(12);
      this.formation();
    }
    formation() {
      const rows = Math.min(4, 2 + Math.floor(this.wave / 3));
      for (let row = 0; row < rows; row++) for (let col = 0; col < 7; col++) {
        const key = row % 2 === 0 ? 'drone' : 'chair';
        const enemy = this.enemies.create(95 + col * 86, 105 + row * 77, key);
        enemy.setDisplaySize(key === 'drone' ? 54 : 40, 46);
        enemy.body.setSize(enemy.width * .72, enemy.height * .72).setOffset(enemy.width * .14, enemy.height * .14);
        enemy.row = row; enemy.phase = col * .4; enemy.baseY = enemy.y;
      }
    }
    emit() {
      if (disposed) return;
      report({ status: this.status, score: Math.floor(this.score), best, wave: this.wave, lives: this.lives,
        distance: Math.floor(this.elapsed * 6), combo: this.coinsCollected || 0 });
    }
    start() {
      if (this.status === 'paused') { this.resume(); return; }
      if (this.status === 'playing') return;
      this.enemies.clear(true, true); this.bullets.clear(true, true);
      this.enemyShots.clear(true, true); this.coins.clear(true, true);
      this.effects = []; this.fx.clear(); this.elapsed = 0; this.score = 0; this.wave = 1; this.lives = 3; this.nextReport = 0;
      this.keys = { left: false, right: false, fire: false }; this.targetX = null;
      this.player.setAlpha(1).setAngle(0).setVelocity(0, 0);
      if (mode === 'jump') {
        this.player.setPosition(148, FLOOR - 58); this.nextObstacle = 1.55; this.jumpUntil = 0;
        this.player.play('run'); this.sky.tilePositionX = 0;
      } else {
        this.player.setPosition(W / 2, 637); this.direction = 1; this.lastShot = -1;
        this.nextEnemyShot = 1.5; this.invulnerable = 0; this.waveReadyAt = 0; this.waveLabel.setText('');
        this.formation();
      }
      this.status = 'playing'; this.physics.resume(); this.game.loop.wake(); this.emit();
    }
    pause() {
      if (this.status !== 'playing') return;
      this.status = 'paused'; this.physics.pause(); this.keys = { left: false, right: false, fire: false };
      this.targetX = null; this.game.loop.sleep(); this.emit();
    }
    resume() {
      if (this.status !== 'paused' || document.hidden) return;
      this.status = 'playing'; this.physics.resume(); this.game.loop.wake(); this.emit();
    }
    end() {
      if (this.status !== 'playing') return;
      this.status = 'over'; this.physics.pause(); this.player.anims?.stop();
      this.keys = { left: false, right: false, fire: false }; this.player.setTint(0xf1a78f);
      tone('hit'); best = Math.max(best, Math.floor(this.score)); saveBest(storage, mode, best);
      this.emit(); this.events.once('postupdate', () => this.game.loop.sleep());
    }
    action(name, pressed) {
      if (this.status !== 'playing') return;
      if (name === 'jump' && pressed) this.jumpUntil = this.elapsed + .14;
      if (name in this.keys) this.keys[name] = pressed;
      if ((name === 'left' || name === 'right') && pressed) this.targetX = null;
    }
    burst(x, y, color, count) {
      if (reduced) return;
      for (let i = 0; i < count && this.effects.length < 56; i++)
        this.effects.push({ x, y, vx: Phaser.Math.Between(-150, 150), vy: Phaser.Math.Between(-160, 60),
          life: .35, color, size: Phaser.Math.Between(3, 7) });
    }
    damage() {
      if (this.status !== 'playing' || this.elapsed < this.invulnerable) return;
      this.lives--; this.invulnerable = this.elapsed + 1.5;
      this.burst(this.player.x, this.player.y, 0xe47b60, 14); tone('hit');
      if (!this.lives) this.end(); else this.emit();
    }
    updateRunner(dt) {
      const speed = runnerSpeed(this.elapsed);
      this.sky.tilePositionX += speed * dt * .22;
      this.shadow.setScale(clamp(1 - (FLOOR - 58 - this.player.y) / 270, .45, 1));
      const grounded = this.player.body.blocked.down || this.player.body.touching.down;
      if (this.jumpUntil > 0 && this.elapsed <= this.jumpUntil && grounded) {
        this.player.setVelocityY(-675); this.jumpUntil = 0; tone('jump');
        this.burst(this.player.x - 12, FLOOR, 0xdfe3cc, 6);
      }
      if (grounded) { if (!this.player.anims.isPlaying) this.player.play('run'); }
      else { this.player.anims.stop(); this.player.setTexture('runner-1'); }
      this.player.setAngle(reduced ? 0 : grounded ? 0 : clamp(this.player.body.velocity.y / 60, -8, 10));
      this.score += speed * dt / 18;
      if (this.elapsed >= this.nextObstacle) {
        const key = Math.random() > .4 ? 'chair' : 'cone';
        const enemy = this.enemies.create(W + 65, FLOOR - 36, key).setDisplaySize(60, 72);
        enemy.body.setSize(enemy.width * .68, enemy.height * .78).setOffset(enemy.width * .16, enemy.height * .2);
        const coin = this.coins.create(W + 68, FLOOR - 170, 'token').setDisplaySize(34, 34);
        coin.body.setCircle(20);
        this.nextObstacle = this.elapsed + runnerGap(this.elapsed) + Math.random() * .25;
      }
      for (const group of [this.enemies, this.coins]) for (const child of group.getChildren()) {
        child.setVelocityX(-speed);
        if (child.x < -80) child.destroy();
      }
    }
    shoot() {
      if (this.elapsed - this.lastShot < .19 || this.bullets.getLength() >= 24) return;
      this.lastShot = this.elapsed;
      const bullet = this.bullets.create(this.player.x, this.player.y - 41, 'bullet');
      if (bullet) { bullet.setTint(0xf2c230).setVelocityY(-660); tone('shot'); }
    }
    updateInvaders(dt) {
      if (this.keys.left || this.keys.right) this.player.setVelocityX((Number(this.keys.right) - Number(this.keys.left)) * 390);
      else if (this.targetX !== null && this.targetX !== undefined)
        this.player.setVelocityX(clamp((this.targetX - this.player.x) * 12, -510, 510));
      else this.player.setVelocityX(0);
      this.player.setAngle(reduced ? 0 : this.player.body.velocity.x / 65);
      this.player.setAlpha(this.elapsed < this.invulnerable ? .55 : 1);
      if (this.keys.fire) this.shoot();
      const alive = this.enemies.getChildren();
      if (!alive.length && !this.waveReadyAt) {
        this.waveReadyAt = this.elapsed + 1.05; this.waveLabel.setText('BLOCK ' + this.wave + ' CLEARED');
        this.enemyShots.clear(true, true); this.score += 200; tone('wave');
      }
      if (this.waveReadyAt && this.elapsed >= this.waveReadyAt) {
        this.wave++; this.waveReadyAt = 0; this.waveLabel.setText(''); this.formation(); this.nextEnemyShot = this.elapsed + 1.2;
      }
      const speed = formationSpeed(this.wave) + (14 - Math.min(14, alive.length)) * 2;
      let turn = false;
      for (const enemy of alive) {
        enemy.x += this.direction * speed * dt;
        if ((enemy.x > W - 49 && this.direction > 0) || (enemy.x < 49 && this.direction < 0)) turn = true;
        enemy.y = enemy.baseY + (reduced ? 0 : Math.sin(this.elapsed * 2 + enemy.phase) * 3);
        if (enemy.baseY > 560) this.end();
      }
      if (turn) { this.direction *= -1; for (const enemy of alive) enemy.baseY += 23; }
      if (alive.length && this.elapsed >= this.nextEnemyShot) {
        const enemy = Phaser.Utils.Array.GetRandom(alive);
        const shot = this.enemyShots.create(enemy.x, enemy.y + 24, 'enemy-bullet');
        if (shot) shot.setTint(0xe98570).setVelocityY(Math.min(390, 195 + this.wave * 18));
        this.nextEnemyShot = this.elapsed + Math.max(.42, 1.1 - this.wave * .06);
      }
      for (const bullet of this.bullets.getChildren()) if (bullet.y < -30) bullet.destroy();
      for (const shot of this.enemyShots.getChildren()) if (shot.y > W + 30) shot.destroy();
    }
    update(_, delta) {
      if (this.status !== 'playing') return;
      const dt = Math.min(delta, 50) / 1000; this.elapsed += dt;
      if (mode === 'jump') this.updateRunner(dt); else this.updateInvaders(dt);
      this.fx.clear();
      this.effects = this.effects.filter(p => p.life > 0);
      for (const p of this.effects) {
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 350 * dt;
        this.fx.fillStyle(p.color, Math.max(0, p.life / .35)); this.fx.fillRect(p.x, p.y, p.size, p.size);
      }
      if (this.elapsed >= this.nextReport) { this.nextReport = this.elapsed + .12; this.emit(); }
    }
  }
  const game = new Phaser.Game({
    type: Phaser.CANVAS, parent, width: W, height: W, backgroundColor: '#182927',
    transparent: false, antialias: true, banner: false, audio: { noAudio: true },
    fps: { target: 60 }, physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: ArcadeScene,
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  });
  const hide = () => { if (document.hidden) { current?.pause(); audio?.suspend().catch(() => {}); } };
  document.addEventListener('visibilitychange', hide);
  const blur = () => current?.pause(); window.addEventListener('blur', blur);
  return {
    start() { current?.player.clearTint(); current?.start(); if (sound) audio?.resume().catch(() => {}); },
    pause() { if (current?.status === 'paused') { current.resume(); if (sound) audio?.resume().catch(() => {}); } else current?.pause(); },
    suspend() { current?.pause(); },
    action(name, pressed = true) { current?.action(name, pressed); },
    pointer(x, pressed) { if (current?.status === 'playing' && mode === 'invaders') { current.targetX = clamp(x, 45, W - 45); current.keys.fire = pressed; } },
    sound(enabled) {
      sound = enabled;
      if (enabled) { try { const Audio = window.AudioContext || window.webkitAudioContext; audio ||= new Audio(); audio.resume().catch(() => {}); } catch { sound = false; } }
      else audio?.suspend().catch(() => {});
    },
    destroy() {
      disposed = true; document.removeEventListener('visibilitychange', hide); window.removeEventListener('blur', blur);
      // Phaser completes destruction on its next frame, including when idle.
      game.destroy(true); if (game.isBooted) game.loop.wake();
      audio?.close().catch(() => {}); current = null;
    },
  };
}
