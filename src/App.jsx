import { useEffect, useRef, useState } from 'react';
import { createStage } from './stage.js';
import { assetUrl } from './asset-url.js';
import { clamp, smoothstep, getStoryState } from './story.js';
import '@fontsource/oswald/cyrillic-700.css';
import '@fontsource/oswald/latin-700.css';
import '@fontsource/manrope/cyrillic-400.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/caveat/cyrillic-400.css';
import '@fontsource/caveat/latin-400.css';

export function App() {
  const storyRef = useRef(null);
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const [has3d, setHas3d] = useState(true);

  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let stage;
    try {
      stage = createStage(canvasRef.current, { reducedMotion: motion.matches });
      stageRef.current = stage;
    } catch (error) {
      console.warn('3D scene unavailable; showing the still portrait.', error);
      setHas3d(false);
    }
    const onMotionChange = () => stage?.setReducedMotion(motion.matches);
    motion.addEventListener('change', onMotionChange);
    return () => {
      motion.removeEventListener('change', onMotionChange);
      stage?.dispose();
      stageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const story = storyRef.current;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    let previousTime = 0;
    let current = 0;
    let target = 0;
    let lastPhase;
    const measure = () => {
      const range = story.offsetHeight - viewport.offsetHeight;
      target = clamp((window.scrollY - story.offsetTop) / Math.max(range, 1));
    };
    const render = (now) => {
      const delta = Math.min((now - previousTime) / 1000 || 0.016, 0.05);
      previousTime = now;
      current = motion.matches ? target : current + (target - current) * (1 - Math.exp(-delta * 12));
      if (Math.abs(target - current) < 0.0001) current = target;
      const s = getStoryState(current);
      viewport.style.setProperty('--curtain-open', s.open);
      viewport.style.setProperty('--intro-opacity', 1 - smoothstep(0.025, 0.11, current));
      viewport.style.setProperty('--intro-y', `${-smoothstep(0.025, 0.11, current) * 24}px`);
      viewport.style.setProperty('--stage-brightness', `${0.24 + s.ambient * 0.18 + s.spotlight * 0.48}`);
      viewport.style.setProperty('--garland-light', s.garlands);
      viewport.style.setProperty('--spotlight', s.spotlight);
      viewport.style.setProperty('--portrait-light', `${0.35 + s.spotlight * 0.65}`);
      viewport.style.setProperty('--hero-opacity', s.heroOpacity);
      viewport.style.setProperty('--hero-y', `${(1 - smoothstep(0.12, 0.3, current)) * 32 - s.finale * 35}px`);
      viewport.style.setProperty('--note-opacity', s.noteOpacity);
      viewport.style.setProperty('--note-y', `${(1 - s.noteOpacity) * 35}px`);
      viewport.style.setProperty('--signature-opacity', s.signatureOpacity);
      viewport.style.setProperty('--finale', s.finale);
      viewport.style.setProperty('--actor-opacity', smoothstep(0.20, 0.28, current));
      viewport.dataset.progress = current.toFixed(4);
      const phase = current < 0.26 ? 'closed' : current < 0.63 ? 'dance' : 'letter';
      if (lastPhase !== phase) {
        viewport.dataset.phase = phase;
        lastPhase = phase;
      }
      stageRef.current?.setProgress(current);
      frame = requestAnimationFrame(render);
    };
    measure();
    current = target;
    frame = requestAnimationFrame(render);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <main className="story" ref={storyRef} aria-label="Поздравление папе с Днём отца">
      <div className="viewport" ref={viewportRef} data-phase="closed">
        <section className="curtains" aria-label="С Днём отца">
          <div className="curtain-half curtain-left" aria-hidden="true" />
          <div className="curtain-half curtain-right" aria-hidden="true" />
          <h1 className="intro-title"><span>С ДНЁМ</span><span>ОТЦА!</span></h1>
        </section>
        <div className="stage-background" aria-hidden="true" />
        <section className="hero-copy" aria-label="Самый лучший папа">
          <h2><span>САМЫЙ</span><span>ЛУЧШИЙ</span><span>ПАПА</span></h2>
        </section>
        <div className="character" aria-hidden="true">
          <canvas ref={canvasRef} className="character-canvas" />
          {!has3d && <img className="character-fallback" src={assetUrl('assets/dad-still.png')} alt="" />}
        </div>
        <section className="letter" aria-label="Пожелание от Артема">
          <div className="letter-inner">
            <h2>ЛЮБЛЮ ТЕБЯ,<br /> ПАП!</h2>
            <p>Побольше здоровья, поменьше забот.<br className="desktop-break" /> Времени на себя и на всё, что любишь.<br className="desktop-break" /> Спасибо, что ты рядом!</p>
            <p className="signature">Твой Артем</p>
          </div>
        </section>
      </div>
    </main>
  );
}
