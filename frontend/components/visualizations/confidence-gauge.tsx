'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface ConfidenceGaugeProps {
  value: number
}

export function ConfidenceGauge({ value }: ConfidenceGaugeProps) {
  const percentage = Math.round(value * 100)
  const data = [
    { name: 'Confidence', value: percentage },
    { name: 'Remaining', value: 100 - percentage },
  ]

  const getColor = (val: number) => {
    if (val >= 80) return 'hsl(var(--color-chart-2))'
    if (val >= 60) return 'hsl(var(--color-chart-4))'
    return 'hsl(var(--color-chart-5))'
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              startAngle={180}
              endAngle={0}
              dataKey="value"
            >
              <Cell fill={getColor(percentage)} />
              <Cell fill="hsl(var(--color-muted))" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">
              {percentage}%
            </p>
            <p className="text-xs text-foreground/60">Confidence</p>
          </div>
        </div>
      </div>

      <div className="w-full space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-foreground/70">Confidence Score</span>
          <span className="font-semibold text-foreground">
            {value.toFixed(3)}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <p className={`text-sm font-medium text-center ${
        percentage >= 80 ? 'text-green-600 dark:text-green-400' :
        percentage >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
        'text-red-600 dark:text-red-400'
      }`}>
        {percentage >= 80 ? 'High Confidence' :
         percentage >= 60 ? 'Moderate Confidence' :
         'Low Confidence'}
      </p>
    </div>
  )
}
