'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface FmriOverlayProps {
  roiProbs: number[]
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function toColor(value: number): string {
  const clamped = clamp01(value)
  const hue = 205 - clamped * 135
  const saturation = 82
  const lightness = 92 - clamped * 46
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

export function FmriOverlay({ roiProbs }: FmriOverlayProps) {
  const values = roiProbs.length > 0 ? roiProbs.map(clamp01) : [0]
  const maxValue = values.reduce((max, value) => Math.max(max, value), 0)
  const meanValue = values.reduce((sum, value) => sum + value, 0) / values.length
  const topIndex = values.reduce((bestIndex, value, index, array) => (value > array[bestIndex] ? index : bestIndex), 0)
  const brainWidth = 720
  const brainHeight = 460
  const leftCenterX = 250
  const rightCenterX = 470
  const centerY = 230

  const leftCount = Math.ceil(values.length / 2)
  const rightCount = values.length - leftCount

  function roiPoint(index: number): { x: number; y: number } {
    const isLeft = index < leftCount
    const localIndex = isLeft ? index : index - leftCount
    const localTotal = isLeft ? leftCount : Math.max(1, rightCount)
    const t = localTotal <= 1 ? 0.5 : localIndex / (localTotal - 1)

    // Traverse a curved cortical arc (front-top to back-bottom) per hemisphere.
    const angle = -1.15 + t * 2.3
    const rX = 86 + (localIndex % 3) * 17
    const rY = 102 + ((localIndex + 1) % 4) * 10
    const cx = isLeft ? leftCenterX : rightCenterX

    const x = cx + Math.cos(angle) * rX
    const y = centerY + Math.sin(angle) * rY
    return { x, y }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">mean roi probability</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{(meanValue * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">peak roi probability</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{(maxValue * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">top roi index</p>
          <p className="mt-1 text-lg font-semibold text-foreground">ROI {topIndex + 1}</p>
        </div>
      </div>

      <Card className="overflow-hidden border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Anatomical overlay</CardTitle>
          <CardDescription className="text-xs">
            ROI probabilities projected onto a stylized cortical map. Higher values move from cyan to amber-red.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-[radial-gradient(circle_at_top,oklch(0.18_0.03_250)_0%,oklch(0.11_0.02_252)_100%)] p-3 shadow-inner">
            <svg viewBox={`0 0 ${brainWidth} ${brainHeight}`} className="h-auto w-full">
              <defs>
                <linearGradient id="fmri-brain-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(125, 211, 252, 0.18)" />
                  <stop offset="100%" stopColor="rgba(251, 191, 36, 0.08)" />
                </linearGradient>
                <clipPath id="fmri-brain-clip">
                  <path d="M210 85C160 85 125 124 120 171C92 202 82 252 101 294C88 346 117 401 172 422C202 451 251 468 296 453C327 470 368 472 403 457C450 470 502 454 529 420C579 398 610 347 601 294C621 252 611 204 581 171C576 124 539 85 489 85C453 57 407 49 363 63C323 50 277 50 237 63C224 69 217 78 210 85Z" />
                </clipPath>
              </defs>

              <rect x="0" y="0" width={brainWidth} height={brainHeight} fill="url(#fmri-brain-glow)" opacity="0.9" />

              <g clipPath="url(#fmri-brain-clip)">
                {values.map((value, index) => {
                  const p = roiPoint(index)
                  const radius = 7 + value * 13
                  const stroke = index === topIndex ? 'rgba(253, 224, 71, 0.95)' : 'rgba(148, 163, 184, 0.22)'
                  const strokeWidth = index === topIndex ? 2.4 : 1.1

                  return (
                    <g key={index}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={radius}
                        fill={toColor(value)}
                        fillOpacity={0.18 + value * 0.74}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                      />
                      {value > 0.72 && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={radius + 5}
                          fill="none"
                          stroke="rgba(251, 191, 36, 0.35)"
                          strokeWidth="1.8"
                        />
                      )}
                    </g>
                  )
                })}

                <path
                  d="M355 92C340 126 333 169 333 229C333 287 340 336 355 377"
                  stroke="rgba(15, 23, 42, 0.55)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M260 135C224 136 197 157 184 191C164 238 167 282 187 321C202 351 232 372 268 381"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="4"
                />
                <path
                  d="M447 135C483 136 510 157 523 191C543 238 540 282 520 321C505 351 475 372 439 381"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="4"
                />
              </g>

              <path
                d="M210 85C160 85 125 124 120 171C92 202 82 252 101 294C88 346 117 401 172 422C202 451 251 468 296 453C327 470 368 472 403 457C450 470 502 454 529 420C579 398 610 347 601 294C621 252 611 204 581 171C576 124 539 85 489 85C453 57 407 49 363 63C323 50 277 50 237 63C224 69 217 78 210 85Z"
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="4"
              />
              <text x="120" y="58" fill="rgba(226, 232, 240, 0.72)" fontSize="16" fontWeight="600">
                Left hemisphere
              </text>
              <text x="500" y="58" fill="rgba(226, 232, 240, 0.72)" fontSize="16" fontWeight="600">
                Right hemisphere
              </text>
              <text x="272" y="430" fill="rgba(226, 232, 240, 0.72)" fontSize="13" fontWeight="500">
                Frontal
              </text>
              <text x="410" y="430" fill="rgba(226, 232, 240, 0.72)" fontSize="13" fontWeight="500">
                Occipital
              </text>
            </svg>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">ROI ranking</p>
                <p className="text-xs text-muted-foreground">{values.length} regions</p>
              </div>
              <div className="max-h-64 space-y-2 overflow-auto pr-1">
                {values
                  .map((value, index) => ({ value, index }))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 10)
                  .map(({ value, index }) => (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>ROI {index + 1}</span>
                        <span>{(value * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-[width]"
                          style={{ width: `${Math.max(6, value * 100)}%`, backgroundColor: toColor(value) }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Legend</p>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-[hsl(205_82%_90%)]" />
                  Low probability
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-[hsl(165_82%_65%)]" />
                  Mid probability
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-[hsl(24_82%_58%)]" />
                  High probability
                </div>
                <p className="pt-2 leading-relaxed">
                  The overlay is client-side and atlas-agnostic. It visualizes the returned ROI scores directly so you
                  can compare predictions without waiting for any server-side imaging step.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}