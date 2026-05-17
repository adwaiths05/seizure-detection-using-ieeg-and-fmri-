import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { ModelDocumentation } from '@/components/model-documentation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, BarChart3, Brain, Cpu, Shield, Sparkles, Stethoscope, Zap } from 'lucide-react'

export default function Home() {
  return (
    <>
      <Navigation />
      <main className="relative min-h-screen overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,oklch(0.45_0.14_195/0.35)_0%,transparent_68%)] blur-3xl" />
          <div className="absolute -right-24 top-40 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,oklch(0.42_0.12_290/0.28)_0%,transparent_65%)] blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-64 w-[min(90%,48rem)] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,oklch(0.35_0.1_195/0.12)_0%,transparent_70%)]" />
        </div>

        <div className="relative z-10">
          <section className="px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
            <div className="mx-auto max-w-5xl text-center">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary shadow-[0_0_24px_-8px_oklch(0.65_0.14_195/0.5)] sm:text-sm">
                <Stethoscope className="h-3.5 w-3.5 opacity-90" aria-hidden />
                Clinical decision support · fMRI & iEEG
              </div>

              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.08]">
                <span className="text-gradient-clinical">Seizure onset zone</span>
                <span className="block text-foreground">analysis with NeuroMap</span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                Graph attention inference on fMRI functional connectivity & multi-channel iEEG — topological graph learning, coherence-aware graphs, multi-domain features, and calibrated probabilities for epilepsy surgery planning workflows.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Link href="/analyze">
                  <Button
                    size="lg"
                    className="h-12 min-w-[12rem] bg-primary text-primary-foreground shadow-[0_0_32px_-6px_oklch(0.55_0.14_195/0.55)] transition-[box-shadow,transform] hover:bg-primary/90 hover:shadow-[0_0_40px_-4px_oklch(0.6_0.16_195/0.65)]"
                  >
                    <Sparkles className="mr-2 h-4 w-4 opacity-90" />
                    Start analysis
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-12 min-w-[12rem] border-primary/30 bg-background/40 backdrop-blur-sm" asChild>
                  <a href="#documentation">Model documentation</a>
                </Button>
              </div>
            </div>
          </section>

          <section className="border-y border-border/50 bg-card/30 px-4 py-16 backdrop-blur-sm sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-7xl">
              <div className="mx-auto mb-14 max-w-2xl text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Analysis modes</h2>
                <p className="mt-3 text-muted-foreground">
                  Choose the path that matches your data pipeline — from research batches to single-window review.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    icon: Brain,
                    title: 'Feature vectors',
                    desc: 'Submit fifteen pre-computed metrics per channel when your pipeline already extracted biomarkers.',
                  },
                  {
                    icon: Cpu,
                    title: 'Raw iEEG',
                    desc: 'Server-side feature extraction and coherence graph construction from windowed traces.',
                  },
                  {
                    icon: Activity,
                    title: 'fMRI FC matrices',
                    desc: 'Submit functional connectivity matrices for EpilepsyGAT processing and view ROI probabilities in a client-side anatomical overlay.',
                  },
                  {
                    icon: BarChart3,
                    title: 'Batch inference',
                    desc: 'Process up to fifty structured samples in one request for cohort studies and QC passes.',
                  },
                ].map(({ icon: Icon, title, desc }) => (
                  <Card
                    key={title}
                    className="group border-border/70 bg-card/60 medical-card-glow transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5"
                  >
                    <CardHeader>
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-gradient-to-br from-primary/15 to-secondary/10 text-primary">
                        <Icon className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <CardTitle className="text-lg">{title}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">{desc}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Built for clinical rigor</h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Dark, low-glare presentation for reading rooms; API status in the nav; responses structured for audit
                  trails and downstream EMR integration patterns.
                </p>
                <ul className="mt-8 space-y-5">
                  {[
                    { icon: Shield, title: 'Governance-ready', desc: 'Separate inference from training — fixed weights and scaler at deploy time.' },
                    { icon: Zap, title: 'Low-latency path', desc: 'Warm-loaded model and vectorized preprocessing for responsive review sessions.' },
                    { icon: Stethoscope, title: 'Human-in-the-loop', desc: 'Designed as adjunct analytics; not a stand-alone diagnostic.' },
                  ].map(({ icon: Icon, title, desc }) => (
                    <li key={title} className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-secondary/25 bg-secondary/10 text-secondary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-medium text-foreground">{title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <Card className="border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.06] medical-card-glow">
                <CardContent className="p-8 sm:p-10">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" aria-hidden />
                      <Brain className="relative h-28 w-28 text-primary/90" strokeWidth={1} />
                    </div>
                    <p className="text-sm font-medium uppercase tracking-widest text-primary">NeuroMap</p>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                      EpilepsyGAT & CNN Ensemble for fMRI · 3-layer GAT for iEEG · Coherence & FC edges · OpenNeuro ds004469 & ds004752 training lineage
                    </p>
                    <Button variant="secondary" className="mt-8 border border-secondary/30 bg-secondary/15 text-secondary-foreground hover:bg-secondary/25" asChild>
                      <Link href="/analyze">Open analysis workspace</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section id="documentation" className="scroll-mt-20 border-t border-border/50 bg-muted/15 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-4xl">
              <ModelDocumentation />
              <p className="mt-8 text-center text-sm text-muted-foreground">
                Prefer a dedicated page?{' '}
                <Link href="/model-info" className="font-medium text-primary underline-offset-4 hover:underline">
                  Open full-width documentation
                </Link>
                .
              </p>
            </div>
          </section>

          <section className="px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-secondary/10 p-10 text-center medical-card-glow sm:p-12">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Ready when your team is</h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Connect the frontend to your deployment with <code className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_API_URL</code>
                , then run analyses from the workspace.
              </p>
              <div className="mt-8">
                <Link href="/analyze">
                  <Button size="lg" className="h-12 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                    Launch workspace
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <footer className="border-t border-border/60 bg-card/40 px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
              <p className="text-center text-sm text-muted-foreground sm:text-left">© {new Date().getFullYear()} NeuroMap. Research and clinical support use only.</p>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <Link href="/model-info" className="text-muted-foreground transition-colors hover:text-primary">
                  Documentation
                </Link>
                <a href="#documentation" className="text-muted-foreground transition-colors hover:text-primary">
                  On this page
                </a>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </>
  )
}
