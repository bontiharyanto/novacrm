'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { NamedCount, TrendPoint } from '@/lib/reports/schema';

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      {label ? <p className="mb-1.5 font-mono text-[11px] text-zinc-500">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="font-mono text-zinc-100">{item.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const interval = data.length > 40 ? 13 : data.length > 14 ? 3 : 0;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="openedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="closedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#27272a' }}
            interval={interval}
            tickFormatter={(value) => String(value).slice(5)}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#3f3f46' }} />
          <Area type="monotone" dataKey="opened" stroke="#3b82f6" strokeWidth={2} fill="url(#openedFill)" name="Opened" />
          <Area type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2} fill="url(#closedFill)" name="Closed" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VolumeBars({ data }: { data: NamedCount[] }) {
  if (data.length === 0) {
    return <p className="flex h-56 items-center justify-center text-sm text-zinc-500">No tickets in this window.</p>;
  }
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#27272a' }}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={78}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#18181b' }} />
          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Tickets" barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
