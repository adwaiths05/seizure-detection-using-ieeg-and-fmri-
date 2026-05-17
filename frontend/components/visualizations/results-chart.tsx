'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ResultsChartProps {
  data: Record<string, number>
}

export function ResultsChart({ data }: ResultsChartProps) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: key.replace(/_/g, ' ').toUpperCase(),
    score: typeof value === 'number' ? parseFloat((value * 100).toFixed(2)) : 0,
    value: typeof value === 'number' ? value : 0,
  }))

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--color-border))" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'hsl(var(--color-foreground))', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--color-foreground))', fontSize: 12 }}
            label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--color-foreground))',
              border: '1px solid hsl(var(--color-border))',
              borderRadius: '8px',
              color: 'hsl(var(--color-background))',
            }}
            itemStyle={{ color: 'hsl(var(--color-background))' }}
            cursor={{ fill: 'hsl(var(--color-muted))', opacity: 0.1 }}
            formatter={(value: number) => `${value.toFixed(2)}%`}
          />
          <Bar
            dataKey="score"
            fill="#3b82f6"
            radius={[8, 8, 0, 0]}
            animationDuration={500}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
