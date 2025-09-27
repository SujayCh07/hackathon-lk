import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const tooltipStyles = {
  backgroundColor: 'rgba(13, 59, 102, 0.9)',
  color: '#FAF9F6',
  borderRadius: '12px',
  padding: '12px 16px',
  border: 'none',
};

export function ComparisonChart({ data }) {
  const categories = ['Rent', 'Groceries', 'Transport'];

  return (
    <div className="h-80 w-full overflow-hidden rounded-3xl border border-white/50 bg-white/75 p-4 shadow-inner shadow-teal/10">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} stackOffset="expand">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,59,102,0.08)" />
          <XAxis dataKey="city" stroke="#2B2B2B" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#2B2B2B"
            fontSize={12}
            tickFormatter={(value) => `${Math.round(value * 100)}%`}
            axisLine={false}
            tickLine={false}
            domain={[0, 1]}
          />
          <Tooltip
            contentStyle={tooltipStyles}
            cursor={{ fill: 'rgba(46,196,182,0.08)' }}
            formatter={(value, name) => [`${Math.round(value * 100)}%`, name]}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" />
          {categories.map((category, index) => (
            <Bar
              key={category}
              dataKey={category}
              stackId="spend"
              fill={[ '#2EC4B6', '#EE6C4D', '#3D5A80' ][index]}
              radius={index === categories.length - 1 ? [0, 0, 12, 12] : [12, 12, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ComparisonChart;
