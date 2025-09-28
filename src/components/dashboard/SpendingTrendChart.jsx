import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const tooltipStyles = {
  backgroundColor: 'rgba(20, 33, 61, 0.92)',
  borderRadius: '12px',
  border: 'none',
  color: '#FAF9F6',
  padding: '12px 16px',
};

export function SpendingTrendChart({ data = [] }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center rounded-3xl border border-dashed border-navy/20 bg-white/60 text-sm text-charcoal/50">
        No transactions yet — once you sync a card we’ll chart your trend here.
      </div>
    );
  }

  return (
    <div className="h-60 w-full overflow-hidden rounded-3xl border border-white/40 bg-white/80 p-4 shadow-inner shadow-teal/10">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2EC4B6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#2EC4B6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,59,102,0.08)" />
          <XAxis dataKey="label" stroke="#2B2B2B" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#2B2B2B"
            fontSize={12}
            tickFormatter={(value) => `$${Math.round(value)}`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyles}
            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Spent']}
            labelFormatter={(label) => `Week of ${label}`}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#2EC4B6"
            strokeWidth={3}
            fill="url(#trend)"
            dot={{ stroke: '#EE6C4D', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#EE6C4D' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SpendingTrendChart;
