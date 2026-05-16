'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Activity, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { fetchHealth, getApiBaseUrl, type HealthPayload } from '@/lib/api'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/analyze', label: 'Analyze' },
  { href: '/model-info', label: 'Model info' },
]

/** Legacy GET /health had only status, model_loaded, version */
function hasExtendedHealthFields(h: HealthPayload): boolean {
  return (
    typeof h.inference_ready === 'boolean' ||
    typeof h.checkpoint_loaded === 'boolean' ||
    typeof h.scaler_loaded === 'boolean'
  )
}

export function Navigation() {
  const [health, setHealth] = useState<HealthPayload | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchHealth()
        setHealth(data)
        setFetchError(null)
      } catch (e) {
        setHealth(null)
        setFetchError(e instanceof Error ? e.message : 'Health check failed')
      }
    }
    run()
    const interval = setInterval(run, 30000)
    return () => clearInterval(interval)
  }, [])

  const apiReachable = health != null && fetchError == null

  const extended = health != null && hasExtendedHealthFields(health)
  const inferenceReady = health
    ? extended
      ? health.inference_ready === true
      : health.model_loaded === true
    : false

  const statusMessage = !apiReachable
    ? fetchError || 'API offline'
    : extended
      ? inferenceReady
        ? 'API ready'
        : 'API up — inference blocked'
      : health?.model_loaded
        ? 'API ready'
        : 'API up'

  const statusColor = apiReachable
    ? inferenceReady
      ? 'text-emerald-400'
      : 'text-amber-400'
    : 'text-red-400'

  const dotColor = apiReachable
    ? inferenceReady
      ? 'bg-emerald-400 shadow-[0_0_8px_oklch(0.72_0.14_160)]'
      : 'bg-amber-400'
    : 'bg-red-400'

  const readinessLine =
    extended && health && health.inference_ready === false && health.readiness_detail
      ? health.readiness_detail
      : null

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px nav-line-glow opacity-80" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 md:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(100%,20rem)] border-border/60 bg-card/95 backdrop-blur-xl">
                <SheetHeader>
                  <SheetTitle className="text-left font-semibold tracking-tight">Navigate</SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/" className="group flex min-w-0 items-center gap-2">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 shadow-[0_0_20px_-4px_oklch(0.65_0.14_195/0.6)]">
                <Activity className="h-5 w-5 text-primary" strokeWidth={2.25} />
              </span>
              <span className="truncate text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                SOZ_GAT
              </span>
            </Link>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-initial">
            <div
              className={`hidden max-w-[14rem] flex-col items-end truncate text-xs font-medium sm:flex ${statusColor}`}
              title={readinessLine || getApiBaseUrl()}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                <span className="truncate">{statusMessage}</span>
              </div>
              {readinessLine && (
                <span className="mt-0.5 max-w-[14rem] truncate text-[10px] font-normal text-muted-foreground">
                  {readinessLine}
                </span>
              )}
            </div>
            <div className={`flex flex-col items-end sm:hidden ${statusColor}`} title={statusMessage}>
              <span className={`h-2 w-2 rounded-full ${dotColor}`} />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
