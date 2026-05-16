import { Navigation } from '@/components/navigation'
import { ModelDocumentation } from '@/components/model-documentation'

export default function ModelInfoPage() {
  return (
    <>
      <Navigation />
      <main className="relative min-h-screen overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,oklch(0.4_0.12_290/0.2)_0%,transparent_70%)] blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <ModelDocumentation />
        </div>
      </main>
    </>
  )
}
