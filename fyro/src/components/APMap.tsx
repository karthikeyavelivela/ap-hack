import { useEffect, useMemo, useState } from 'react';
import { Delaunay } from 'd3-delaunay';
import { motion, useMotionValue, useMotionTemplate, animate } from 'framer-motion';
import { AP_OUTLINE, DISTRICTS, MAP_H, MAP_W, project, REGIONS, RegionId } from '@/mocks/geo';
import { cn } from '@/lib';

const HEAT = ['#F1E3CC', '#E6CDA8', '#D3AE82', '#B98558', '#8B5E3C', '#5A3820', '#3B2414'];
const REGION_FILL: Record<RegionId, string> = { uttarandhra: '#D8B992', coastal: '#E7CFAB', rayalaseema: '#C9A27E' };
const REGION_FILL_DARK: Record<RegionId, string> = { uttarandhra: '#5A3E28', coastal: '#4A3322', rayalaseema: '#6B4A30' };

const pts = DISTRICTS.map((d) => project(d.lon, d.lat));
const vor = Delaunay.from(pts as [number, number][]).voronoi([-40, -40, MAP_W + 40, MAP_H + 40]);
const cells = DISTRICTS.map((_, i) => vor.renderCell(i));
const outline = 'M' + AP_OUTLINE.map(([lo, la]) => project(lo, la).join(',')).join('L') + 'Z';

function bbox(ids: number[]) {
  const xs = ids.map((i) => pts[i][0]); const ys = ids.map((i) => pts[i][1]);
  const pad = 70;
  return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
}

export interface MapStore { id: string; lat: number; lng: number; count?: number; emerging?: boolean; districtId?: string; name?: string; s1?: number }

export function APMap({ values, max, focusRegion, focusDistrict, stores, pulse = [], onRegion, onDistrict, onStore, showLabels = true, className, dark, interactive = true, pinsOnly }: {
  values?: Record<string, number>; max?: number; focusRegion?: RegionId | null; focusDistrict?: string | null; stores?: MapStore[]; pulse?: string[];
  onRegion?: (r: RegionId) => void; onDistrict?: (id: string) => void; onStore?: (id: string) => void; showLabels?: boolean; className?: string; dark?: boolean; interactive?: boolean; pinsOnly?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const x = useMotionValue(0); const y = useMotionValue(0); const w = useMotionValue(MAP_W); const h = useMotionValue(MAP_H);
  const viewBox = useMotionTemplate`${x} ${y} ${w} ${h}`;

  const target = useMemo(() => {
    if (focusDistrict) { const i = DISTRICTS.findIndex((d) => d.id === focusDistrict); return bbox([i]); }
    if (focusRegion) { const ids = DISTRICTS.map((d, i) => (d.region === focusRegion ? i : -1)).filter((i) => i >= 0); return bbox(ids); }
    return { x: 0, y: 0, w: MAP_W, h: MAP_H };
  }, [focusRegion, focusDistrict]);
  useEffect(() => {
    const cfg = { type: 'spring' as const, stiffness: 120, damping: 24 };
    const a = [animate(x, target.x, cfg), animate(y, target.y, cfg), animate(w, target.w, cfg), animate(h, target.h, cfg)];
    return () => a.forEach((c) => c.stop());
  }, [target, x, y, w, h]);

  const mx = max ?? Math.max(1, ...Object.values(values ?? { a: 1 }));
  const fillFor = (i: number) => {
    const d = DISTRICTS[i];
    if (values && values[d.id] !== undefined) return HEAT[Math.min(HEAT.length - 1, Math.floor((values[d.id] / mx) * (HEAT.length - 1) + 0.0001))];
    return (dark ? REGION_FILL_DARK : REGION_FILL)[d.region];
  };
  const zoomed = !!(focusRegion || focusDistrict);
  const k = zoomed ? Math.max(0.3, Math.min(1, (target.w / MAP_W) * 1.15)) : 1;
  const hoverD = hover ? DISTRICTS.find((d) => d.id === hover) : null;

  return (
    <div className={cn('relative w-full', className)}>
      <motion.svg viewBox={viewBox as unknown as string} className="h-full w-full" role="img" aria-label="Map of Andhra Pradesh by region and district" preserveAspectRatio="xMidYMid meet">
        <defs>
          <clipPath id="ap-clip"><path d={outline} /></clipPath>
          <filter id="ap-shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#3B2414" floodOpacity="0.25" /></filter>
        </defs>
        <path d={outline} fill={dark ? (pinsOnly ? "#5A3820" : "#4A3322") : "#C9A27E"} fillOpacity={pinsOnly ? 0.75 : 1} filter={pinsOnly ? undefined : "url(#ap-shadow)"} />
        <g clipPath="url(#ap-clip)">
          {!pinsOnly && DISTRICTS.map((d, i) => {
            const dim = (focusRegion && d.region !== focusRegion) || (focusDistrict && d.id !== focusDistrict);
            const isHover = hover === d.id;
            return (
              <path key={d.id} d={cells[i] ?? ''} fill={fillFor(i)} stroke={dark ? '#1E140C' : '#FBF5EC'} strokeWidth={isHover ? 2.2 : 1.1} opacity={dim ? 0.35 : 1}
                className={cn('transition-[opacity,fill] duration-300', interactive && 'cursor-pointer')} style={{ filter: isHover ? 'brightness(1.08)' : undefined }}
                onMouseEnter={() => setHover(d.id)} onMouseLeave={() => setHover(null)}
                onClick={interactive ? () => (onDistrict ? onDistrict(d.id) : onRegion?.(d.region)) : undefined}
                tabIndex={interactive ? 0 : undefined} role={interactive ? 'button' : undefined} aria-label={`${d.name} district`}
                onKeyDown={interactive ? (e) => { if (e.key === 'Enter') (onDistrict ? onDistrict(d.id) : onRegion?.(d.region)); } : undefined} />
            );
          })}
        </g>
        <path d={outline} fill="none" stroke={dark ? '#C9A27E' : '#6B4226'} strokeWidth={2} strokeLinejoin="round" />
        {showLabels && !zoomed && REGIONS.map((r) => {
          const ids = DISTRICTS.map((d, i) => (d.region === r.id ? i : -1)).filter((i) => i >= 0);
          const cx = ids.reduce((a, i) => a + pts[i][0], 0) / ids.length; const cy = ids.reduce((a, i) => a + pts[i][1], 0) / ids.length;
          return <text key={r.id} x={cx} y={cy} textAnchor="middle" className="pointer-events-none select-none" fontSize="15" fontWeight="700" fill={dark ? '#fff' : '#3B2414'} style={{ paintOrder: 'stroke', stroke: dark ? '#1E140C' : '#F5EBDD', strokeWidth: 4, strokeLinejoin: 'round' }}>{r.name.toUpperCase()}</text>;
        })}
        {showLabels && zoomed && DISTRICTS.map((d, i) => {
          if ((focusRegion && d.region !== focusRegion) || (focusDistrict && d.id !== focusDistrict)) return null;
          return <text key={d.id} x={pts[i][0]} y={pts[i][1] - 14 * k} textAnchor="middle" className="pointer-events-none select-none" fontSize={(focusDistrict ? 12 : 11) * k} fontWeight="600" fill={dark ? '#fff' : '#3B2414'} style={{ paintOrder: 'stroke', stroke: dark ? '#1E140C' : '#F5EBDD', strokeWidth: 3 * k, strokeLinejoin: 'round' }}>{d.name}</text>;
        })}
        {stores?.map((s) => {
          const [px, py] = project(s.lng, s.lat);
          const dim = (focusRegion && DISTRICTS.find((d) => d.id === s.districtId)?.region !== focusRegion) || (focusDistrict && s.districtId !== focusDistrict);
          if (dim) return null;
          const hot = pulse.includes(s.id) || s.emerging;
          const r = (zoomed ? 4.5 + Math.min(4, (s.count ?? 0) / 5) : 3.2 + Math.min(4, (s.count ?? 0) / 8)) * k;
          return (
            <g key={s.id} className={cn(onStore && 'cursor-pointer')} onClick={onStore ? () => onStore(s.id) : undefined} tabIndex={onStore ? 0 : undefined} role={onStore ? 'button' : undefined} aria-label={`Store ${s.id}`}
              onKeyDown={onStore ? (e) => { if (e.key === 'Enter') onStore(s.id); } : undefined}>
              {hot && <circle cx={px} cy={py} r={r} fill="#FFB347" style={{ transformOrigin: `${px}px ${py}px`, animation: 'pulse-pin 1.9s ease-out infinite' }} />}
              <circle cx={px} cy={py} r={r} fill={hot ? '#3B2414' : '#6B4226'} stroke="#FFE2B8" strokeWidth={1.4} />
              {zoomed && (s.s1 ?? 0) > 0 && <text x={px} y={py + 3 * k} textAnchor="middle" fontSize={7 * k} fontWeight="800" fill="#fff" className="pointer-events-none">!</text>}
            </g>
          );
        })}
      </motion.svg>
      {hoverD && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-2xl border border-line bg-surface px-3 py-2 text-xs shadow-lift">
          <div className="font-semibold">{hoverD.name}</div>
          <div className="text-ink/60">{REGIONS.find((r) => r.id === hoverD.region)!.name}{values && values[hoverD.id] !== undefined ? ` · ${values[hoverD.id].toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : ''}</div>
        </div>
      )}
    </div>
  );
}

export function HeatLegend({ label = 'Low', labelHi = 'High' }: { label?: string; labelHi?: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-medium text-ink/65">
      <span>{label}</span>
      <div className="flex h-2.5 overflow-hidden rounded-full border border-line">{HEAT.map((c) => <span key={c} className="h-full w-6" style={{ background: c }} />)}</div>
      <span>{labelHi}</span>
    </div>
  );
}
