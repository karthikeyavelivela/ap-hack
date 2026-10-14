import { ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';
import { cn } from '@/lib';

export function Section({ children, className, id, dark }: { children: ReactNode; className?: string; id?: string; dark?: boolean }) {
  return <section id={id} className={cn('py-16 sm:py-24', dark && 'bg-b900 text-white', className)}><div className="container-x">{children}</div></section>;
}
export function Heading({ eyebrow, title, sub, center, dark }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; center?: boolean; dark?: boolean }) {
  return (
    <div className={cn('mb-10 max-w-2xl', center && 'mx-auto text-center')}>
      {eyebrow && <div className={cn('eyebrow mb-3', dark && '!text-sand')}>{eyebrow}</div>}
      <h2 className="font-display text-4xl leading-[1.02] sm:text-6xl">{title}</h2>
      {sub && <p className={cn('mt-4 text-[17px] leading-relaxed', dark ? 'text-white/75' : 'text-ink/65')}>{sub}</p>}
    </div>
  );
}
export function Fade({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, delay, ease: 'easeOut' }} className={className}>{children}</motion.div>;
}
export function CountUp({ to, decimals = 0, suffix = '', className }: { to: number; decimals?: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => { if (!inView) return; const c = animate(0, to, { duration: 1.6, ease: 'easeOut', onUpdate: setV }); return () => c.stop(); }, [inView, to]);
  return <span ref={ref} className={cn('tabular-nums', className)}>{v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}
