const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('difficulty is elapsed-time based, capped, and leaves physically clearable jump windows', async () => {
  const r = await import('../lib/arcade/rules.mjs');
  assert.equal(r.runnerSpeed(0), 300);
  assert.equal(r.runnerSpeed(10000), 490);
  assert.equal(r.formationSpeed(1000), 115);
  for (let seconds = 0; seconds < 600; seconds++) {
    assert.ok(r.runnerGap(seconds) >= 1.12);
    const airborne = 2 * 675 / 1600;
    assert.ok(r.runnerGap(seconds) > airborne);
    assert.ok(675 * 675 / (2 * 1600) > 100);
    assert.ok(r.runnerSpeed(seconds) * airborne > 180);
  }
  assert.equal(r.clamp(-1, 0, 10), 0);
  assert.equal(r.clamp(90, 0, 10), 10);
});

test('local records tolerate denied, corrupt and unavailable storage', async () => {
  const { readBest, saveBest } = await import('../lib/arcade/rules.mjs');
  const store = new Map();
  const storage = { getItem: k => store.get(k), setItem: (k, v) => store.set(k, v) };
  saveBest(storage, 'jump', 153.6);
  assert.equal(readBest(storage, 'jump'), 153);
  assert.equal(readBest(storage, 'invaders'), 0);
  for (const value of ['NaN', 'Infinity', '-12', '2.2', '99999999999999999999']) {
    store.set('lj-arcade-v2:jump', value);
    assert.equal(readBest(storage, 'jump'), 0);
  }
  const denied = { getItem() { throw Error('Denied'); }, setItem() { throw Error('Denied'); } };
  assert.equal(readBest(denied, 'jump'), 0);
  assert.doesNotThrow(() => saveBest(denied, 'jump', 1));
  assert.equal(readBest(undefined, 'jump'), 0);
});

test('only the two new games are promoted; retired games retain reversible history', () => {
  const arcade = read('pages/arcade.js');
  assert.match(arcade, /href="\/jagoff-jump"/);
  assert.match(arcade, /href="\/yinzer-invaders"/);
  const discovery = require('../lib/discovery.cjs').sitemapUrls([]);
  for (const game of ['bridge-rage', 'fry-catcher', 'pothole-patrol', 'parking-chair-panic']) {
    assert.ok(!discovery.some(url => url.endsWith('/' + game)));
    assert.doesNotMatch(arcade, new RegExp(game));
    assert.match(read('pages/' + game + '.js'), /destination: '\/arcade', permanent: false/);
    assert.match(read('legacy/arcade/' + game + '.js'), /SimpleArcadeGame/);
  }
});

test('game assets are local, complete and isolated from catalog/payment providers', () => {
  const engine = read('lib/arcade/engine.js');
  assert.match(engine, /import Phaser from 'phaser'/);
  assert.doesNotMatch(engine, /fetch\(|XMLHttpRequest|WebSocket|stripe|printful|\/api\//i);
  for (const name of ['street', 'river', 'runner-0', 'runner-1', 'runner-2', 'runner-3', 'chair', 'cone', 'token', 'ship', 'drone']) {
    const asset = read('public/arcade/' + name + '.svg');
    assert.match(asset, /<svg[^>]+viewBox=/);
    assert.doesNotMatch(asset, /<script|<foreignObject|https?:\/\/(?!www\.w3\.org)/);
  }
  assert.match(engine, /effects.length < 56/);
  assert.match(engine, /maxSize: 24/);
  assert.match(engine, /game.loop.sleep\(\)/);
  assert.match(engine, /game.destroy\(true\)/);
  assert.match(engine, /game.destroy\(true\); if \(game.isBooted\) game.loop.wake\(\)/);
  assert.match(engine, /removeEventListener\('visibilitychange'/);
  assert.match(engine, /audio\?\.close\(\)/);
  assert.match(engine, /prefers-reduced-motion: reduce/);
});

test('controls retain keyboard, touch cancellation, tab exit and opt-in audio', () => {
  const component = read('components/ArcadeGame.js');
  assert.match(component, /useState\(false\)/);
  assert.match(component, /onPointerCancel=\{release\}/);
  assert.match(component, /onLostPointerCapture=\{release\}/);
  assert.match(component, /event.key === 'Tab'\) return/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /engine.current\?\.destroy\(\)/);
  assert.match(component, /import\('\.\.\/lib\/arcade\/engine'\)/);
});
