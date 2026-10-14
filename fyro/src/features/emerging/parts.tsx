import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Cell, ReferenceLine, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { APMap } from '@/components/APMap';
import { useChartColors, tipStyle } from '@/components/charts';
import type { DetectDay } from '@/mocks/derived';
import { STORES } from '@/mocks/geo';

/** Daily counts with EARS C2 limit overlay. `upTo` limits the visible days for replay. */
export function DetectorChart({ days, dates, upTo, height = 260 }: { days: (DetectDay & { channels?: number })[]; dates: string[]; upTo: number; height?: number }) {
  const k = useChartColors();
  const data = days.slice(0, upTo + 1).map((d, i) => ({
    date: dates[i]?.slice(5) ?? String(i), count: d.count, mean: Number(d.mean.toFixed(2)), c2: Number(d.c2Threshold.toFixed(2)), fired: d.fired, poisson: d.poissonP,
  }));
  return (
    <div style={{ height }} role="img" aria-label="Daily report counts with detector threshold">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: -14, right: 8, top: 10 }}>
          <CartesianGrid stroke={k.grid} strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: k.text, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
          <YAxis tick={{ fill: k.text, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, (m: number) => Math.max(8, Math.ceil(m * 1.1))]} />
          <RTooltip contentStyle={tipStyle(k.bg, k.text)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" name="Reports" radius={[6, 6, 0, 0]} maxBarSize={22} isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={d.fired ? k.c[4] : k.c[2]} />)}
          </Bar>
          <Line dataKey="mean" name="Baseline mean" stroke={k.c[1]} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="c2" name="C2 limit (mean + 3σ)" stroke={k.c[0]} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          {upTo > 0 && <ReferenceLine x={data[data.length - 1]?.date} stroke={k.c[1]} strokeDasharray="2 3" />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Animated radar sweep over the AP outline, with pulsing blips for flagged stores. */
export function RadarVisual({ flagged, size = 380 }: { flagged: string[]; size?: number }) {
  const stores = STORES.filter((s) => flagged.includes(s.id)).map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, emerging: true, districtId: s.districtId }));
  return (
    <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-b900" style={{ maxWidth: size }} role="img" aria-label="Radar view of flagged stores">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(201,162,126,.18), rgba(59,36,20,0) 70%)' }} />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        {[16, 30, 44].map((r) => <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="rgba(244,217,178,.28)" strokeWidth=".35" />)}
        <line x1="50" y1="3" x2="50" y2="97" stroke="rgba(244,217,178,.22)" strokeWidth=".3" /><line x1="3" y1="50" x2="97" y2="50" stroke="rgba(244,217,178,.22)" strokeWidth=".3" />
      </svg>
      <div className="absolute inset-[9%] opacity-90"><APMap dark pinsOnly showLabels={false} interactive={false} stores={stores} pulse={flagged} /></div>
      <motion.div className="pointer-events-none absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 0deg, rgba(255,214,160,0) 0deg, rgba(255,214,160,0) 290deg, rgba(255,200,130,.55) 355deg, rgba(255,230,190,.9) 360deg)' }}
        animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 6, ease: 'linear' }} />
      <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-sand/50" />
    </div>
  );
}
