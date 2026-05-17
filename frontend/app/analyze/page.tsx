'use client'

import { useState } from 'react'
import { Navigation } from '@/components/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeaturesForm } from '@/components/forms/features-form'
import { FmriForm } from '@/components/forms/fmri-form'
import { RawEEGForm } from '@/components/forms/raw-eeg-form'
import { BatchForm } from '@/components/forms/batch-form'
import { CombinedForm } from '@/components/forms/combined-form'
import { AnalysisResults, type AnalysisResult } from '@/components/analysis-results'
import type { BatchPredictResponseClient, FmriPredictResponseClient, PredictResponseClient, CombinedPredictResponseClient } from '@/lib/types/soz-api'
import { getApiBaseUrl, readErrorDetail } from '@/lib/api'
import { parseBatchFeatureBlocks, parseChannelNames, parseFeatureMatrix, parseRawEegCsv } from '@/lib/parse-eeg'
import { Activity, Brain, Cpu, BarChart3, Layers } from 'lucide-react'

const N_FEATURES = 15

export default function AnalyzePage() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [activeTab, setActiveTab] = useState('combined')

  const API_URL = getApiBaseUrl()

  const handleFeaturesSubmit = async ({
    featuresText,
    channelNamesText,
  }: {
    featuresText: string
    channelNamesText: string
  }) => {
    setLoading(true)
    setError(undefined)
    try {
      const features = parseFeatureMatrix(featuresText, N_FEATURES)
      const channel_names = parseChannelNames(channelNamesText)
      if (channel_names && channel_names.length !== features.length) {
        throw new Error('Number of channel names must match number of feature rows (or leave names empty).')
      }
      const t0 = performance.now()
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features,
          ...(channel_names ? { channel_names } : {}),
          sfreq: 500,
        }),
        mode: 'cors',
      })
      const elapsed = performance.now() - t0
      if (!response.ok) {
        throw new Error(await readErrorDetail(response))
      }
      const data = (await response.json()) as PredictResponseClient
      setAnalysisResult({
        mode: 'features',
        data: { ...data, client_timing_ms: elapsed },
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRawEEGSubmit = async ({
    rawCsv,
    sfreq,
    channelNamesText,
  }: {
    rawCsv: string
    sfreq: number
    channelNamesText: string
  }) => {
    setLoading(true)
    setError(undefined)
    try {
      if (!Number.isFinite(sfreq) || sfreq <= 0) {
        throw new Error('Enter a valid sampling rate (Hz).')
      }
      const raw_eeg = parseRawEegCsv(rawCsv)
      const channel_names = parseChannelNames(channelNamesText)
      if (channel_names && channel_names.length !== raw_eeg.length) {
        throw new Error('Number of channel names must match number of CSV rows (channels), or leave names empty.')
      }
      const t0 = performance.now()
      const response = await fetch(`${API_URL}/predict/raw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_eeg,
          sfreq,
          ...(channel_names ? { channel_names } : {}),
        }),
        mode: 'cors',
      })
      const elapsed = performance.now() - t0
      if (!response.ok) {
        throw new Error(await readErrorDetail(response))
      }
      const data = (await response.json()) as PredictResponseClient
      setAnalysisResult({
        mode: 'raw_eeg',
        data: { ...data, client_timing_ms: elapsed },
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleBatchSubmit = async (batchText: string) => {
    setLoading(true)
    setError(undefined)
    try {
      const samples = parseBatchFeatureBlocks(batchText, N_FEATURES)
      const t0 = performance.now()
      const response = await fetch(`${API_URL}/predict/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples }),
        mode: 'cors',
      })
      const elapsed = performance.now() - t0
      if (!response.ok) {
        throw new Error(await readErrorDetail(response))
      }
      const data = (await response.json()) as BatchPredictResponseClient
      setAnalysisResult({
        mode: 'batch',
        data: { ...data, client_timing_ms: elapsed },
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleFmriSubmit = async ({ fcMatrix, nodeFeatures }: { fcMatrix: number[][]; nodeFeatures?: number[][] }) => {
    setLoading(true)
    setError(undefined)
    try {
      const t0 = performance.now()
      const response = await fetch(`${API_URL}/predict/fmri`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fc_matrix: fcMatrix,
          ...(nodeFeatures ? { node_features: nodeFeatures } : {}),
        }),
        mode: 'cors',
      })
      const elapsed = performance.now() - t0
      if (!response.ok) {
        throw new Error(await readErrorDetail(response))
      }
      const data = (await response.json()) as FmriPredictResponseClient
      setAnalysisResult({
        mode: 'fmri',
        data: { ...data, client_timing_ms: elapsed },
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleFmriUpload = async (file: File) => {
    setLoading(true)
    setError(undefined)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const t0 = performance.now()
      const response = await fetch(`${API_URL}/predict/fmri/upload`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      })
      const elapsed = performance.now() - t0
      if (!response.ok) {
        throw new Error(await readErrorDetail(response))
      }
      const data = (await response.json()) as FmriPredictResponseClient
      setAnalysisResult({
        mode: 'fmri',
        data: { ...data, client_timing_ms: elapsed },
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCombinedSubmit = async ({
    rawCsv,
    sfreq,
    channelNamesText,
    fmriFile
  }: {
    rawCsv: string
    sfreq: number
    channelNamesText: string
    fmriFile: File
  }) => {
    setLoading(true)
    setError(undefined)
    try {
      if (!Number.isFinite(sfreq) || sfreq <= 0) {
        throw new Error('Enter a valid sampling rate (Hz) for iEEG.')
      }
      const raw_eeg = parseRawEegCsv(rawCsv)
      const channel_names = parseChannelNames(channelNamesText)
      if (channel_names && channel_names.length !== raw_eeg.length) {
        throw new Error('Number of channel names must match number of CSV rows (channels).')
      }

      const t0 = performance.now()
      
      const eegPromise = fetch(`${API_URL}/predict/raw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_eeg,
          sfreq,
          ...(channel_names ? { channel_names } : {}),
        }),
        mode: 'cors',
      })

      const fmriFormData = new FormData()
      fmriFormData.append('file', fmriFile)
      
      const fmriPromise = fetch(`${API_URL}/predict/fmri/upload`, {
        method: 'POST',
        body: fmriFormData,
        mode: 'cors',
      })

      const [eegResponse, fmriResponse] = await Promise.all([eegPromise, fmriPromise])
      const elapsed = performance.now() - t0

      if (!eegResponse.ok) throw new Error(`iEEG Error: ${await readErrorDetail(eegResponse)}`)
      if (!fmriResponse.ok) throw new Error(`fMRI Error: ${await readErrorDetail(fmriResponse)}`)

      const ieegData = (await eegResponse.json()) as PredictResponseClient
      const fmriData = (await fmriResponse.json()) as FmriPredictResponseClient

      const combinedRisk = (ieegData.risk_score + fmriData.prob_gat) / 2.0

      setAnalysisResult({
        mode: 'combined',
        data: {
          status: 'ok',
          ieeg: ieegData,
          fmri: fmriData,
          combined_risk: combinedRisk,
          client_timing_ms: elapsed
        } as CombinedPredictResponseClient,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Combined request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-foreground sm:text-4xl">Analysis workspace</h1>
            <p className="text-muted-foreground">
              All requests go to <span className="font-mono text-xs text-foreground">{API_URL}</span> (set{' '}
              <span className="font-mono text-xs">NEXT_PUBLIC_API_URL</span> for Docker or remote hosts).
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-muted">
                  <TabsTrigger value="combined" className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <span className="hidden sm:inline">Combined</span>
                  </TabsTrigger>
                  <TabsTrigger value="features" className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    <span className="hidden sm:inline">Features</span>
                  </TabsTrigger>
                  <TabsTrigger value="raw_eeg" className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    <span className="hidden sm:inline">Raw</span>
                  </TabsTrigger>
                  <TabsTrigger value="fmri" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span className="hidden sm:inline">fMRI</span>
                  </TabsTrigger>
                  <TabsTrigger value="batch" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Batch</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="combined" className="mt-6">
                  <CombinedForm onSubmit={handleCombinedSubmit} loading={loading} error={error} />
                </TabsContent>

                <TabsContent value="features" className="mt-6">
                  <FeaturesForm onSubmit={handleFeaturesSubmit} loading={loading} error={error} />
                </TabsContent>

                <TabsContent value="raw_eeg" className="mt-6">
                  <RawEEGForm onSubmit={handleRawEEGSubmit} loading={loading} error={error} />
                </TabsContent>

                <TabsContent value="fmri" className="mt-6">
                  <FmriForm onSubmit={handleFmriSubmit} onUpload={handleFmriUpload} loading={loading} error={error} />
                </TabsContent>

                <TabsContent value="batch" className="mt-6">
                  <BatchForm onSubmit={handleBatchSubmit} loading={loading} error={error} />
                </TabsContent>
              </Tabs>
            </div>

            <div className="lg:col-span-1">
              {analysisResult ? (
                <AnalysisResults result={analysisResult} />
              ) : (
                <div className="rounded-lg border border-border bg-card p-8 text-center">
                  <Brain className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Submit a request to render live API results here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
