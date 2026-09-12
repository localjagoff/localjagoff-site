import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, Crosshair, Play, Pause, RotateCcw, Volume2, VolumeX, Trophy, Shield, ArrowUpRight } from 'lucide-react';
import Navbar from './Navbar';
import styles from '../styles/Arcade.module.css';

const INFO = {
  jump: { title: 'Jagoff Jump', slug: 'jagoff-jump', genre: '01 / STREET RUNNER', line: 'Your block. Your problem.',
    ready: 'THE STREET IS YOURS.', over: "THAT'S PITTSBURGH.", other: 'Yinzer Invaders', otherSlug: 'yinzer-invaders' },
  invaders: { title: 'Yinzer Invaders', slug: 'yinzer-invaders', genre: '02 / RIVER DEFENSE', line: 'Hold the line. Keep it local.',
    ready: 'DEFEND THE THREE RIVERS.', over: 'THE BLOCK GOT HOT.', other: 'Jagoff Jump', otherSlug: 'jagoff-jump' },
};
export default function ArcadeGame({ mode }) {
  const info = INFO[mode], host = useRef(null), engine = useRef(null), stage = useRef(null), pressed = useRef(false);
  const [state, setState] = useState({ status: 'loading', score: 0, best: 0, wave: 1, lives: 3 });
  const [sound, setSound] = useState(false);
  useEffect(() => {
    let cancelled = false;
    import('../lib/arcade/engine').then(({ createArcade }) => {
      if (!cancelled) engine.current = createArcade(host.current, mode, data => { if (!cancelled) setState(previous => ({ ...previous, ...data })); });
    }).catch(() => { if (!cancelled) setState(s => ({ ...s, status: 'error' })); });
    return () => { cancelled = true; engine.current?.destroy(); engine.current = null; };
  }, [mode]);
  function start() { engine.current?.start(); stage.current?.focus({ preventScroll: true }); }
  function pause() { engine.current?.pause(); stage.current?.focus({ preventScroll: true }); }
  function key(event, down) {
    const actions = { ArrowUp: 'jump', ' ': mode === 'jump' ? 'jump' : 'fire', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    if (event.key === 'Tab') return;
    if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
      event.preventDefault(); if (down && !event.repeat) pause(); return;
    }
    if (event.key === 'Enter' && down && event.target === stage.current && state.status !== 'playing') { event.preventDefault(); start(); return; }
    if (!actions[event.key] || event.target !== stage.current) return;
    event.preventDefault();
    if (!event.repeat) engine.current?.action(actions[event.key], down);
  }
  function touch(event, down) {
    if (state.status !== 'playing') return;
    event.preventDefault(); stage.current.focus({ preventScroll: true });
    if (down) event.currentTarget.setPointerCapture(event.pointerId);
    pressed.current = down;
    if (mode === 'jump') engine.current?.action('jump', down);
    else { const r = event.currentTarget.getBoundingClientRect(); engine.current?.pointer((event.clientX - r.left) / r.width * 720, down); }
  }
  function touchMove(event) {
    if (!pressed.current || mode !== 'invaders') return;
    const r = event.currentTarget.getBoundingClientRect();
    engine.current?.pointer((event.clientX - r.left) / r.width * 720, true);
  }
  function release() { pressed.current = false; engine.current?.action('fire', false); }
  const control = (action, label, Icon) => <button type="button" aria-label={label} title={label}
    onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); stage.current?.focus({ preventScroll: true }); engine.current?.action(action, true); }}
    onPointerUp={() => engine.current?.action(action, false)} onPointerCancel={() => engine.current?.action(action, false)}
    onLostPointerCapture={() => engine.current?.action(action, false)}
    onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); engine.current?.action(action, true); } }}
    onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); engine.current?.action(action, false); } }}
    disabled={state.status !== 'playing'}><Icon size={27} strokeWidth={2} /></button>;
  const active = state.status === 'playing';
  return <div className={styles.page}>
    <Head><title>{info.title + ' | Local Jagoff Arcade'}</title>
      <meta name="description" content={info.title + ': an original Local Jagoff arcade game. ' + info.line} key="description" />
      <link rel="canonical" href={'https://www.localjagoff.com/' + info.slug} key="canonical" /></Head>
    <Navbar />
    <main id="main-content" className={styles.gameMain}>
      <div className={styles.gameHeading}><Link href="/arcade" className={styles.back}><ArrowLeft size={18} /> Arcade</Link><div><p>{info.genre}</p><h1>{info.title}<span>.</span></h1></div><Link className={styles.shopLink} href="/tees">Shop <ArrowUpRight size={18} /></Link></div>
      <div className={styles.gameLayout}>
        <div className={styles.gameColumn} onKeyDown={e => key(e, true)} onKeyUp={e => key(e, false)}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) engine.current?.suspend(); }}>
          <div className={styles.hud}>
            <div><span>SCORE</span><strong>{String(state.score).padStart(5, '0')}</strong></div>
            <div><span>{mode === 'jump' ? 'PERSONAL BEST' : 'BLOCK'}</span><strong>{mode === 'jump' ? String(state.best).padStart(5, '0') : String(state.wave).padStart(2, '0')}</strong></div>
            {mode === 'invaders' && <div className={styles.shields} aria-label={state.lives + ' shields'}>{[0,1,2].map(i => <Shield key={i} size={18} fill={i < state.lives ? 'currentColor' : 'none'} style={{opacity:i < state.lives ? 1 : .28}} />)}</div>}
            <div className={styles.tools}>
              <button title={active ? 'Pause' : 'Resume'} aria-label={active ? 'Pause game' : 'Resume game'} disabled={!['playing','paused'].includes(state.status)} onClick={pause}>{active ? <Pause size={19} /> : <Play size={19} />}</button>
              <button title={sound ? 'Mute sound' : 'Enable sound'} aria-label={sound ? 'Mute sound' : 'Enable sound'} aria-pressed={sound} onClick={() => { engine.current?.sound(!sound); setSound(!sound); }}>{sound ? <Volume2 size={19} /> : <VolumeX size={19} />}</button>
            </div>
          </div>
          <div className={styles.stage} ref={stage} tabIndex={0} role="application" aria-label={info.title} aria-describedby="arcade-controls"
            data-state={state.status} data-score={state.score} onPointerDown={e => touch(e, true)} onPointerMove={touchMove} onPointerUp={e => touch(e, false)} onPointerCancel={release} onLostPointerCapture={release}>
            <div ref={host} className={styles.canvas} aria-hidden="true" />
            {!active && <div className={styles.overlay} onPointerDown={e => e.stopPropagation()}>
              <div className={styles.stateContent} role="status">
                <p className={styles.stateKicker}>{state.status === 'over' ? 'END OF THE RUN' : state.status === 'paused' ? 'TAKE A BREATHER' : 'LOCAL JAGOFF ARCADE'}</p>
                <h2>{state.status === 'loading' ? 'LOADING...' : state.status === 'error' ? "COULDN'T LOAD." : state.status === 'paused' ? 'PAUSED.' : state.status === 'over' ? info.over : info.ready}</h2>
                {state.status === 'over' && <p className={styles.finalScore}>{state.score}<span>POINTS</span></p>}
                {state.status === 'error' ? <button className={styles.play} onClick={() => window.location.reload()}><RotateCcw size={18} /> Reload</button> :
                  <button className={styles.play} disabled={state.status === 'loading'} onClick={start}>{state.status === 'over' ? <RotateCcw size={19} /> : <Play size={19} fill="currentColor" />}{state.status === 'over' ? 'Run it back' : state.status === 'paused' ? 'Back to it' : "Let's go"}</button>}
              </div>
            </div>}
          </div>
          <div className={styles.controlBar}>
            <span className={styles.liveState}><i className={active ? styles.live : ''} />{active ? 'IN PLAY' : state.status === 'over' ? 'RUN COMPLETE' : 'LOCAL JAGOFF / 412'}</span>
            <div className={styles.touchControls}>{mode === 'jump' ? control('jump', 'Jump: Space or Up arrow', ArrowUp) : <>{control('left', 'Move left: A or Left arrow', ArrowLeft)}{control('right', 'Move right: D or Right arrow', ArrowRight)}{control('fire', 'Fire: Space', Crosshair)}</>}</div>
          </div>
          <p id="arcade-controls" className="sr-only">{mode === 'jump' ? 'Tap the scene, press Space, or press Up to jump. Collect gold tokens and avoid obstacles.' : 'Use Left and Right arrows or A and D to move. Hold Space to fire. On touchscreens drag the scene to move and fire, or use the buttons.'} P or Escape pauses. Tab moves out of the game. Sound starts muted.</p>
          <p className="sr-only" aria-live="polite">{state.status === 'over' ? 'Game over. Score ' + state.score + '. Best ' + state.best : state.status === 'paused' ? 'Game paused' : ''}</p>
        </div>
        <aside className={styles.gameAside}><p className={styles.index}>LJ / ARCADE<br />EST. IN THE 412</p><h2>{info.line}</h2><div className={styles.record}><Trophy size={22} /><span>YOUR BEST<strong>{String(state.best).padStart(5, '0')}</strong></span></div><Link href={'/' + info.otherSlug}>Next up<br /><strong>{info.other}</strong><ArrowUpRight size={24} /></Link><Link href="/contact">Got a game idea?<ArrowUpRight size={18} /></Link></aside>
      </div>
      <div className={styles.gameBottom}><span>PITTSBURGH ROOTS. QUICK REFLEXES.</span><Link href="/tees">Back to the collection <ArrowRight size={18} /></Link></div>
    </main>
  </div>;
}
