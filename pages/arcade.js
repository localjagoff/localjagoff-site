import Head from 'next/head';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import styles from '../styles/Arcade.module.css';
export default function Arcade() {
  return <div className={styles.page}><Head><title>Local Jagoff Arcade | Jagoff Jump & Yinzer Invaders</title><meta name="description" content="Two original Local Jagoff games. Run your block in Jagoff Jump. Defend the three rivers in Yinzer Invaders." key="description" /></Head><Navbar />
    <main id="main-content" className={styles.arcadeMain}>
      <header className={styles.arcadeHeading}><div><p>LOCAL JAGOFF / OFF THE CLOCK</p><h1>THE ARCADE<span>.</span></h1></div><p>A LITTLE LOCAL NONSENSE.<br />A LOT OF ATTITUDE.</p></header>
      <div className={styles.gameGrid}>
        <Link className={styles.gameCard} href="/jagoff-jump"><div className={styles.cover}><img className={styles.coverWorld} src="/arcade/street.svg" alt="Illustrated Pittsburgh bridge and city street" width="1440" height="720" /><img className={styles.coverRunner} src="/arcade/runner-1.svg" alt="" width="84" height="116" /><img className={styles.coverChair} src="/arcade/chair.svg" alt="" width="76" height="90" /><img className={styles.coverToken} src="/arcade/token.svg" alt="" width="46" height="46" /><span className={styles.coverIndex}>01</span><span className={styles.coverArrow}><ArrowUpRight size={28} /></span></div><div className={styles.cardMeta}><div><p>STREET RUNNER</p><h2>Jagoff Jump</h2><span>Your block. Your problem.</span></div><ArrowUpRight size={24} /></div></Link>
        <Link className={styles.gameCard} href="/yinzer-invaders"><div className={styles.cover}><img className={styles.coverWorld} src="/arcade/river.svg" alt="Illustrated Pittsburgh river and gold suspension bridge at night" width="1440" height="720" /><img className={styles.coverShip} src="/arcade/ship.svg" alt="" width="100" height="100" />{[0,1,2].map(i => <img key={i} className={styles.coverDrone} style={{left: (25+i*22)+'%',top:(20+i%2*9)+'%'}} src="/arcade/drone.svg" alt="" width="78" height="64" />)}<span className={styles.coverIndex}>02</span><span className={styles.coverArrow}><ArrowUpRight size={28} /></span></div><div className={styles.cardMeta}><div><p>RIVER DEFENSE</p><h2>Yinzer Invaders</h2><span>Hold the line. Keep it local.</span></div><ArrowUpRight size={24} /></div></Link>
      </div>
      <div className={styles.arcadeBottom}><Link href="/contact"><span>GOT SOMETHING TO SAY?</span><strong>Send it our way.</strong><ArrowUpRight size={23} /></Link><Link href="/tees"><span>BACK ON THE CLOCK</span><strong>Find your uniform.</strong><ArrowRight size={23} /></Link></div>
    </main>
  </div>;
}
