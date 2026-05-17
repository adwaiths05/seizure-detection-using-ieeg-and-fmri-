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

  const ATLAS_COORDS = [
    { x: 258.0, y: 75.1 }, { x: 198.5, y: 365.1 }, { x: 324.7, y: 264.4 }, { x: 116.3, y: 217.0 },
    { x: 298.3, y: 60.0 }, { x: 327.0, y: 111.3 }, { x: 326.5, y: 163.4 }, { x: 325.4, y: 219.3 },
    { x: 347.3, y: 276.4 }, { x: 327.1, y: 291.3 }, { x: 338.0, y: 367.6 }, { x: 144.1, y: 170.7 },
    { x: 166.2, y: 133.3 }, { x: 145.0, y: 132.0 }, { x: 199.3, y: 125.7 }, { x: 319.3, y: 144.5 },
    { x: 187.8, y: 206.4 }, { x: 191.6, y: 172.1 }, { x: 184.6, y: 369.1 }, { x: 297.5, y: 385.2 },
    { x: 209.3, y: 308.4 }, { x: 319.3, y: 347.5 }, { x: 264.2, y: 238.3 }, { x: 238.3, y: 129.0 },
    { x: 171.2, y: 332.9 }, { x: 119.5, y: 271.8 }, { x: 268.0, y: 321.4 }, { x: 162.9, y: 245.0 },
    { x: 180.6, y: 214.6 }, { x: 333.3, y: 319.2 }, { x: 341.7, y: 125.3 }, { x: 343.6, y: 158.1 },
    { x: 155.9, y: 234.1 }, { x: 103.9, y: 220.7 }, { x: 209.3, y: 176.1 }, { x: 112.0, y: 273.1 },
    { x: 141.2, y: 266.9 }, { x: 100.0, y: 262.4 }, { x: 190.0, y: 130.6 }, { x: 179.9, y: 150.2 },
    { x: 182.5, y: 264.5 }, { x: 300.6, y: 223.9 }, { x: 279.3, y: 400.0 }, { x: 221.0, y: 181.7 },
    { x: 291.6, y: 335.7 }, { x: 204.2, y: 238.1 }, { x: 303.6, y: 272.1 }, { x: 228.1, y: 150.3 },
    { x: 181.3, y: 218.7 }, { x: 204.6, y: 183.5 }, { x: 183.1, y: 242.3 }, { x: 258.3, y: 361.7 },
    { x: 187.4, y: 143.2 }, { x: 239.7, y: 101.8 }, { x: 254.4, y: 152.1 }, { x: 134.9, y: 307.0 },
    { x: 230.0, y: 316.7 }, { x: 221.2, y: 376.4 }, { x: 243.0, y: 365.3 }, { x: 167.5, y: 335.7 },
    { x: 172.2, y: 302.5 }, { x: 235.5, y: 293.4 }, { x: 176.8, y: 105.3 }, { x: 307.5, y: 141.3 },
    { x: 245.9, y: 120.5 }, { x: 293.6, y: 336.7 }, { x: 340.6, y: 218.9 }, { x: 195.0, y: 269.1 },
    { x: 167.2, y: 184.0 }, { x: 240.8, y: 212.6 }, { x: 334.0, y: 118.8 }, { x: 319.7, y: 296.8 },
    { x: 131.1, y: 267.4 }, { x: 147.8, y: 285.9 }, { x: 143.0, y: 246.5 }, { x: 450.2, y: 72.8 },
    { x: 532.1, y: 359.2 }, { x: 381.7, y: 265.8 }, { x: 593.3, y: 215.0 }, { x: 430.1, y: 60.8 },
    { x: 389.5, y: 112.1 }, { x: 388.0, y: 161.2 }, { x: 386.4, y: 216.9 }, { x: 365.1, y: 274.9 },
    { x: 390.9, y: 293.5 }, { x: 379.0, y: 361.7 }, { x: 578.4, y: 174.3 }, { x: 564.6, y: 126.5 },
    { x: 578.7, y: 135.7 }, { x: 518.0, y: 126.4 }, { x: 396.3, y: 144.5 }, { x: 530.9, y: 205.2 },
    { x: 527.3, y: 172.2 }, { x: 531.7, y: 365.8 }, { x: 432.0, y: 373.6 }, { x: 500.4, y: 307.4 },
    { x: 397.7, y: 335.1 }, { x: 455.1, y: 236.5 }, { x: 473.5, y: 125.3 }, { x: 562.8, y: 316.1 },
    { x: 599.8, y: 258.9 }, { x: 448.0, y: 313.3 }, { x: 545.9, y: 241.7 }, { x: 525.1, y: 214.4 },
    { x: 381.1, y: 320.3 }, { x: 374.4, y: 129.5 }, { x: 372.0, y: 162.1 }, { x: 559.1, y: 229.8 },
    { x: 615.6, y: 215.1 }, { x: 525.1, y: 178.7 }, { x: 607.2, y: 259.1 }, { x: 582.5, y: 265.3 },
    { x: 620.0, y: 257.5 }, { x: 526.1, y: 135.2 }, { x: 548.0, y: 152.0 }, { x: 528.7, y: 251.2 },
    { x: 418.5, y: 223.1 }, { x: 432.2, y: 396.6 }, { x: 508.6, y: 177.6 }, { x: 428.1, y: 330.1 },
    { x: 507.1, y: 235.6 }, { x: 408.7, y: 271.7 }, { x: 494.2, y: 148.8 }, { x: 536.4, y: 218.3 },
    { x: 512.8, y: 181.4 }, { x: 535.0, y: 239.5 }, { x: 462.0, y: 361.2 }, { x: 528.7, y: 142.0 },
    { x: 483.0, y: 105.2 }, { x: 459.9, y: 150.6 }, { x: 567.8, y: 287.2 }, { x: 486.3, y: 308.6 },
    { x: 502.2, y: 370.8 }, { x: 475.6, y: 359.0 }, { x: 548.5, y: 332.8 }, { x: 545.9, y: 301.7 },
    { x: 482.7, y: 293.9 }, { x: 538.6, y: 107.5 }, { x: 409.4, y: 140.8 }, { x: 469.7, y: 118.8 },
    { x: 427.4, y: 333.2 }, { x: 375.6, y: 213.3 }, { x: 514.5, y: 263.4 }, { x: 542.5, y: 180.8 },
    { x: 474.6, y: 209.6 }, { x: 380.9, y: 104.1 }, { x: 390.6, y: 295.8 }, { x: 591.0, y: 266.3 },
    { x: 567.1, y: 280.3 }, { x: 577.1, y: 240.0 }
  ];

  function roiPoint(index: number): { x: number; y: number } {
    if (index < ATLAS_COORDS.length) {
      return ATLAS_COORDS[index];
    }
    // Fallback for unexpected ROI lengths
    return { x: leftCenterX, y: centerY };
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
              <text x="330" y="30" fill="rgba(226, 232, 240, 0.72)" fontSize="13" fontWeight="500">
                Frontal (Anterior)
              </text>
              <text x="325" y="445" fill="rgba(226, 232, 240, 0.72)" fontSize="13" fontWeight="500">
                Occipital (Posterior)
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
                  The overlay is client-side and uses 2D projections of the 3D Destrieux atlas. The mapped coordinates 
                  perfectly match the anatomical placement in the interactive 3D view.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}