import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { TaraMood, taraAmp } from '@/store';
import { cn } from '@/lib';

const OrbCanvas = lazy(() => import('./OrbCanvas'));

function webglOk(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Tara: a glowing orb with a face. `webgl` renders the shader sphere (lazy-loaded Three.js); otherwise pure CSS. */
export function Orb({ size = 64, mood = 'idle', webgl = false, className, live = false }: { size?: number; mood?: TaraMood; webgl?: boolean; className?: string; live?: boolean }) {
  const useGl = useMemo(() => webgl && webglOk() && !reduced(), [webgl]);
  const mouth = useRef<SVGPathElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  // drive mouth + glow from live audio amplitude without React re-renders
  useEffect(() => {
    if (!live && mood !== 'speaking' && mood !== 'listening') return;
    let raf = 0;
    const tick = () => {
      const a = taraAmp.value;
      if (mood === 'speaking' && mouth.current) mouth.current.setAttribute('d', `M36 60 Q50 ${64 + a * 20} 64 60`);
      if (glow.current) glow.current.style.transform = `scale(${1 + a * 0.35})`;
      if (ring.current && mood === 'listening') ring.current.style.transform = `scale(${1.08 + a * 0.5})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mood, live]);

  const swirl = mood === 'thinking' ? '2.2s' : mood === 'speaking' ? '4s' : '9s';
  const happy = mood === 'happy';
  const concerned = mood === 'concerned';
  return (
    <div className={cn('relative inline-block shrink-0', className)} style={{ width: size, height: size }} role="img" aria-label={`Tara, ${mood}`}>
      <div ref={glow} className="absolute -inset-[18%] rounded-full opacity-70 blur-xl transition-transform duration-100" style={{ background: 'radial-gradient(circle, rgba(201,162,126,.85), rgba(164,113,72,0) 70%)' }} />
      {mood === 'listening' && <div ref={ring} className="absolute inset-0 rounded-full border-2 border-sand/80 transition-transform duration-75" style={{ animation: 'orb-ring 1.4s ease-out infinite' }} />}
      <div className="relative h-full w-full" style={{ animation: reduced() ? undefined : 'orb-breathe 4.2s ease-in-out infinite' }}>
        {useGl ? (
          <Suspense fallback={<div className="orb-core h-full w-full" />}>
            <OrbCanvas mood={mood} />
          </Suspense>
        ) : (
          <div className="orb-core h-full w-full" style={{ ['--orb-swirl' as string]: swirl }} />
        )}
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <g style={{ transform: mood === 'thinking' ? 'translateY(-3px)' : undefined, transition: 'transform .3s' }}>
            {happy ? (
              <>
                <path d="M30 48 Q36 40 42 48" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" fill="none" />
                <path d="M58 48 Q64 40 70 48" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" fill="none" />
              </>
            ) : (
              <>
                <ellipse className="orb-eye" cx="37" cy="47" rx={concerned ? 4.2 : 4.6} ry="5.6" fill="#fff" />
                <ellipse className="orb-eye" cx="63" cy="47" rx={concerned ? 4.2 : 4.6} ry="5.6" fill="#fff" style={{ animationDelay: '.05s' }} />
              </>
            )}
            {concerned && <path d="M30 36 L43 40 M70 36 L57 40" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity=".85" />}
            <path
              ref={mouth}
              d={concerned ? 'M39 67 Q50 61 61 67' : happy ? 'M34 58 Q50 76 66 58' : 'M37 60 Q50 69 63 60'}
              stroke="#fff" strokeWidth={mood === 'speaking' ? 4 : 3.4} strokeLinecap="round" fill="none"
            />
          </g>
        </svg>
        {mood === 'thinking' && (
          <div className="absolute inset-[-14%]" style={{ animation: 'orbit 2.6s linear infinite' }} aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="absolute h-[7%] w-[7%] rounded-full bg-sand shadow-[0_0_8px_rgba(255,214,160,.9)]" style={{ left: `${50 + 48 * Math.cos((i * Math.PI) / 2)}%`, top: `${50 + 48 * Math.sin((i * Math.PI) / 2)}%` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
