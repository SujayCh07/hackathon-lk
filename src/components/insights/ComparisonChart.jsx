import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const tooltipStyles = {
  backgroundColor: 'rgba(13, 59, 102, 0.9)',
  color: '#FAF9F6',
  borderRadius: '12px',
  padding: '12px 16px',
  border: 'none'
};

export function ComparisonChart({ data }) {
  return (
    <div className="h-72 w-full overflow-hidden rounded-3xl border border-white/50 bg-white/75 p-4 shadow-inner shadow-teal/10">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,59,102,0.08)" />
          <XAxis dataKey="city" stroke="#2B2B2B" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#2B2B2B" fontSize={12} tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={tooltipStyles}
            cursor={{ fill: 'rgba(46,196,182,0.08)' }}
            formatter={(value, name) => [`${value}%`, name === 'value' ? 'Savings' : name]}
          />
          <Bar dataKey="value" radius={[12, 12, 12, 12]} fill="#2EC4B6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ComparisonChart;
