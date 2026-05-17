'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ExternalLink, Cpu, Activity } from 'lucide-react'
import { ConfidenceGauge } from './visualizations/confidence-gauge'
import { ResultsChart } from './visualizations/results-chart'
import { ChannelResults } from './visualizations/channel-results'
import { FmriOverlay } from './visualizations/fmri-overlay'
import { format } from 'date-fns'
import {
  type BatchPredictResponseClient,
  type FmriPredictResponseClient,
  type PredictResponseClient,
  type CombinedPredictResponseClient,
  isBatchResultSuccess,
  isBatchResultError,
} from '@/lib/types/soz-api'

export type { PredictResponseClient, BatchPredictResponseClient, FmriPredictResponseClient, CombinedPredictResponseClient } from '@/lib/types/soz-api'

export interface AnalysisResult {
  mode: 'features' | 'raw_eeg' | 'batch' | 'fmri' | 'combined'
  data: PredictResponseClient | BatchPredictResponseClient | FmriPredictResponseClient | CombinedPredictResponseClient
  timestamp: string
}

interface AnalysisResultsProps {
  result: AnalysisResult
}

function isBatchPayload(
  data: PredictResponseClient | BatchPredictResponseClient | FmriPredictResponseClient
): data is BatchPredictResponseClient {
  return 'n_samples' in data && 'results' in data && Array.isArray((data as BatchPredictResponseClient).results)
}

export function AnalysisResults({ result }: AnalysisResultsProps) {
  const formattedTime = format(new Date(result.timestamp), 'MMM dd, yyyy HH:mm:ss')

  if (result.mode === 'combined') {
    const data = result.data as CombinedPredictResponseClient

    return (
      <div className="space-y-6">
        <Card className="border border-border bg-card ring-2 ring-primary/20">
          <CardHeader>
            <CardTitle className="text-base text-primary">Multimodal combined analysis</CardTitle>
            <CardDescription className="text-xs">{formattedTime}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
              <p className="text-sm font-medium text-primary-foreground mb-1 text-center">Combined SOZ Risk Score</p>
              <p className="text-3xl font-bold text-primary text-center">{(data.combined_risk * 100).toFixed(1)}%</p>
              <p className="text-xs text-center text-muted-foreground mt-2">Averaged across iEEG ({((data.ieeg.risk_score || 0)*100).toFixed(1)}%) and fMRI ({((data.fmri.prob_gat || 0)*100).toFixed(1)}%)</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="ieeg" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted text-xs h-10">
            <TabsTrigger value="ieeg" className="gap-2"><Cpu className="h-4 w-4"/> iEEG Results</TabsTrigger>
            <TabsTrigger value="fmri" className="gap-2"><Activity className="h-4 w-4"/> fMRI Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ieeg" className="mt-4">
            <AnalysisResults result={{ mode: 'raw_eeg', data: data.ieeg, timestamp: result.timestamp }} />
          </TabsContent>
          <TabsContent value="fmri" className="mt-4">
            <AnalysisResults result={{ mode: 'fmri', data: data.fmri, timestamp: result.timestamp }} />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  if (result.mode === 'fmri') {
    const data = result.data as FmriPredictResponseClient
    const roiValues = data.roi_probs ?? []
    const topRoiIndex = roiValues.reduce(
      (bestIndex, value, index, array) => (value > array[bestIndex] ? index : bestIndex),
      0
    )
    const timingLabel =
      typeof data.client_timing_ms === 'number' ? `${Math.round(data.client_timing_ms)} ms (client)` : '—'

    return (
      <div className="space-y-6">
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">fMRI prediction results</CardTitle>
            <CardDescription className="text-xs">{formattedTime}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">status</p>
                <p className="font-mono text-sm font-semibold text-foreground">{data.status}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">prob_gat</p>
                <p className="text-lg font-bold text-primary">{(data.prob_gat * 100).toFixed(1)}%</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">n_rois</p>
                <p className="text-sm font-medium text-foreground">{data.n_rois ?? roiValues.length}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">top roi</p>
                <p className="text-sm font-medium text-foreground">
                  ROI {topRoiIndex + 1} ({((roiValues[topRoiIndex] ?? 0) * 100).toFixed(1)}%)
                </p>
              </div>
              <div className="col-span-2 rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Client round-trip</p>
                <p className="text-sm font-medium text-foreground">{timingLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overlay" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted text-xs">
            <TabsTrigger value="overlay">overlay</TabsTrigger>
            <TabsTrigger value="raw">raw roi_probs</TabsTrigger>
          </TabsList>

          <TabsContent value="overlay" className="mt-4">
            <FmriOverlay roiProbs={roiValues} />
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={() => {
                  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                  const url = `${baseUrl.replace(/\/$/, '')}/predict/fmri/3d?probs=${roiValues.join(',')}`;
                  window.open(url, '_blank');
                }}
                variant="outline"
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Interactive 3D Visualization
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="raw" className="mt-4">
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Returned values</CardTitle>
                <CardDescription className="text-xs">Backend fMRI response payload</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">prob_gat</p>
                  <p className="font-mono text-sm text-foreground">{data.prob_gat}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">roi_probs</p>
                  <p className="max-h-56 overflow-auto font-mono text-xs text-foreground">
                    {JSON.stringify(roiValues)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  if (isBatchPayload(result.data)) {
    const batch = result.data
    return (
      <div className="space-y-6">
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Batch results</CardTitle>
            <CardDescription className="text-xs">{formattedTime}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              <span className="font-mono text-foreground">{batch.status}</span> · n_samples={batch.n_samples}
              {typeof batch.client_timing_ms === 'number' && (
                <> · client_ms={Math.round(batch.client_timing_ms)}</>
              )}
            </p>
            <div className="max-h-[32rem] space-y-2 overflow-y-auto">
              {batch.results.map((rowUnknown, idx) => {
                const row = rowUnknown as Record<string, unknown>
                if (isBatchResultSuccess(row)) {
                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-border/60 bg-muted/20 p-3 font-mono text-xs"
                    >
                      <p className="mb-2 font-sans text-sm font-medium text-foreground">
                        sample_index={row.sample_index}{' '}
                        <span className="text-emerald-500">status=ok</span>
                      </p>
                      <p className="text-muted-foreground">
                        risk_score={row.risk_score} · confidence={row.confidence} · n_soz_predicted=
                        {row.n_soz_predicted} · n_channels={row.n_channels}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        predictions={JSON.stringify(row.predictions)}
                      </p>
                    </div>
                  )
                }
                if (isBatchResultError(row)) {
                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-border/60 bg-muted/20 p-3 font-mono text-xs"
                    >
                      <p className="mb-1 font-sans text-sm font-medium text-foreground">
                        sample_index={typeof row.sample_index === 'number' ? row.sample_index : idx}{' '}
                        <span className="text-destructive">error</span>
                      </p>
                      <p className="text-destructive">{row.error}</p>
                    </div>
                  )
                }
                return (
                  <div key={idx} className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(row, null, 0)}</pre>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const data = result.data as PredictResponseClient
  const avgNormal =
    data.class_probabilities.reduce((a, c) => a + c.normal, 0) / Math.max(1, data.class_probabilities.length)
  const avgSoz =
    data.class_probabilities.reduce((a, c) => a + c.soz, 0) / Math.max(1, data.class_probabilities.length)
  const chartScores: Record<string, number> = {
    normal: avgNormal,
    soz: avgSoz,
  }

  const channels = data.per_channel.map((p) => ({
    name: p.channel,
    value: p.soz_probability,
    prediction: p.prediction,
  }))

  const timingLabel =
    typeof data.client_timing_ms === 'number' ? `${Math.round(data.client_timing_ms)} ms (client)` : '—'

  return (
    <div className="space-y-6">
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Prediction results</CardTitle>
          <CardDescription className="text-xs">{formattedTime}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">risk_score</p>
              <p className="text-lg font-bold text-primary">{(data.risk_score * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">confidence</p>
              <p className="text-lg font-bold text-secondary">{(data.confidence * 100).toFixed(1)}%</p>
            </div>
            <div className="col-span-2 rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">n_soz_predicted / n_channels</p>
              <p className="text-sm font-medium text-foreground">
                {data.n_soz_predicted} / {data.n_channels}
              </p>
            </div>
            <div className="col-span-2 rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">predictions (0=Normal, 1=SOZ)</p>
              <p className="font-mono text-xs text-foreground">{JSON.stringify(data.predictions)}</p>
            </div>
            <div className="col-span-2 rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">soz_probabilities</p>
              <p className="line-clamp-3 font-mono text-xs text-foreground">
                {JSON.stringify(data.soz_probabilities)}
              </p>
            </div>
            <div className="col-span-2 rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">channel_names</p>
              <p className="font-mono text-xs text-foreground">{JSON.stringify(data.channel_names)}</p>
            </div>
            <div className="col-span-2 rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Client round-trip</p>
              <p className="text-sm font-medium text-foreground">{timingLabel}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="gauge" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted text-xs sm:text-sm h-10">
          <TabsTrigger value="gauge">Confidence</TabsTrigger>
          <TabsTrigger value="chart">Classes</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
        </TabsList>

        <TabsContent value="gauge" className="mt-4">
          <Card className="border border-border bg-card">
            <CardContent className="pt-6">
              <ConfidenceGauge value={data.confidence} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart" className="mt-4">
          <Card className="border border-border bg-card">
            <CardContent className="pt-6">
              <ResultsChart data={chartScores} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="mt-4">
          <Card className="border border-border bg-card">
            <CardContent className="pt-6">
              <ChannelResults channels={channels} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
