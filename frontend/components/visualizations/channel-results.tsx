'use client'

import { Card } from '@/components/ui/card'

interface ChannelData {
  name: string
  value: number
  score?: number
  /** From API `per_channel[].prediction` ("SOZ" | "Normal") */
  prediction?: string
}

interface ChannelResultsProps {
  channels: ChannelData[]
}

export function ChannelResults({ channels }: ChannelResultsProps) {
  const sortedChannels = [...channels].sort((a, b) => (b.score || b.value) - (a.score || a.value))

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground/70 font-medium">
        Per-Channel Analysis ({channels.length} channels)
      </p>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedChannels.map((channel, index) => {
          const score = (channel.score || channel.value) * 100
          const isHighScore = score >= 70

          return (
            <div
              key={`${channel.name}-${index}`}
              className="bg-muted/50 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="min-w-0">
                  <span className="font-medium text-foreground text-sm">{channel.name}</span>
                  {channel.prediction != null && channel.prediction !== '' && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      {channel.prediction}
                    </span>
                  )}
                </div>
                <span className={`font-bold text-sm ${
                  isHighScore
                    ? 'text-green-600 dark:text-green-400'
                    : score >= 50
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {score.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isHighScore
                      ? 'bg-green-500 dark:bg-green-400'
                      : score >= 50
                      ? 'bg-yellow-500 dark:bg-yellow-400'
                      : 'bg-red-500 dark:bg-red-400'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {channels.length === 0 && (
        <div className="text-center py-8 text-foreground/50">
          <p className="text-sm">No channel data available</p>
        </div>
      )}
    </div>
  )
}
