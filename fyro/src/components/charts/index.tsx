import { ReactNode } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ReferenceLine, Legend } from 'recharts';
import { useUI } from '@/store';

export function useChartColors() {
  const theme = useUI((s) => s.theme);
  return theme === 'dark'
    ? { c: ['#C9A27E', '#A47148', '#E3C9A8', '#8B5E3C', '#F2E3CF'], grid: '#5A3E28', text: '#E8D6BE', bg: '#2A1C11' }
    : { c: ['#6B4226', '#A47148', '#C9A27E', '#8B5E3C', '#3B2414'], grid: '#E4D2B8', text: '#000000', bg: '#FBF5EC' };
}

export const tipStyle = (bg: string, text: string) => ({ background: bg, border: '1px solid #D9C3A5', borderRadius: 14, boxShadow: '0 10px 30px -8px rgba(59,36,20,.3)', color: text, fontSize: 12, padding: '8px 12px' });

export function ChartBox({ height = 240, children }: { height?: number; children: ReactNode }) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">{children as never}</ResponsiveContainer>
    </div>
  );
}

export function AreaTrend({ data, x, keys, height = 240, stacked, labels }: { data: Record<string, unknown>[]; x: string; keys: string[]; height?: number; stacked?: boolean; labels?: Record<string, string> }) {
  const k = useChartColors();
  return (
    <ChartBox height={height}>
      <AreaChart data={data} margin={{ left: -18, right: 6, top: 8 }}>
        <defs>
          {keys.map((key, i) => (
            <linearGradient key={key} id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={k.c[i % 5]} stopOpacity={0.5} />
              <stop offset="100%" stopColor={k.c[i % 5]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={k.grid} strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey={x} tick={{ fill: k.text, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={{ fill: k.text, fontSize: 11 }} tickLine={false} axisLine={false} />
        <RTooltip contentStyle={tipStyle(k.bg, k.text)} cursor={{ stroke: k.c[1], strokeDasharray: '3 3' }} />
        {keys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {keys.map((key, i) => (
          <Area key={key} name={labels?.[key] ?? key} type="monotone" dataKey={key} stackId={stacked ? 's' : undefined} stroke={k.c[i % 5]} strokeWidth={2.2} fill={`url(#g-${key})`} />
        ))}
      </AreaChart>
    </ChartBox>
  );
}

export function BarsChart({ data, x, keys, height = 240, horizontal, stacked, labels, colorByIndex }: { data: Record<string, unknown>[]; x: string; keys: string[]; height?: number; horizontal?: boolean; stacked?: boolean; labels?: Record<string, string>; colorByIndex?: boolean }) {
  const k = useChartColors();
  return (
    <ChartBox height={height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: horizontal ? 8 : -18, right: 12, top: 6 }}>
        <CartesianGrid stroke={k.grid} strokeDasharray="3 5" horizontal={!horizontal} vertical={!!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fill: k.text, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey={x} width={130} tick={{ fill: k.text, fontSize: 11 }} tickLine={false} axisLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey={x} tick={{ fill: k.text, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: k.text, fontSize: 11 }} tickLine={false} axisLine={false} />
          </>
        )}
        <RTooltip contentStyle={tipStyle(k.bg, k.text)} cursor={{ fill: 'rgba(164,113,72,.12)' }} />
        {keys.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {keys.map((key, i) => (
          <Bar key={key} name={labels?.[key] ?? key} dataKey={key} stackId={stacked ? 's' : undefined} fill={k.c[i % 5]} radius={stacked ? 0 : [8, 8, 8, 8]} maxBarSize={36}>
            {colorByIndex && data.map((_, idx) => <Cell key={idx} fill={k.c[idx % 5]} />)}
          </Bar>
        ))}
      </BarChart>
    </ChartBox>
  );
}

export function Donut({ data, height = 200, center }: { data: { name: string; value: number }[]; height?: number; center?: ReactNode }) {
  const k = useChartColors();
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke={k.bg} strokeWidth={2}>
            {data.map((_, i) => <Cell key={i} fill={k.c[i % 5]} />)}
          </Pie>
          <RTooltip contentStyle={tipStyle(k.bg, k.text)} />
        </PieChart>
      </ResponsiveContainer>
      {center && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">{center}</div>}
    </div>
  );
}

export function Spark({ data, height = 36, color, fired }: { data: number[]; height?: number; color?: string; fired?: number }) {
  const k = useChartColors();
  const d = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ height, width: '100%' }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={d} margin={{ top: 4, bottom: 4, left: 2, right: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color ?? k.c[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
          {fired !== undefined && <ReferenceLine x={fired} stroke={k.c[1]} strokeDasharray="2 3" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export { LineChart, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, RTooltip, Legend, Area, AreaChart, Bar, BarChart, ResponsiveContainer };
