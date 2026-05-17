'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, FileText, Beaker, AlertCircle, Code2 } from 'lucide-react'

import { getApiBaseUrl } from '@/lib/api'

export function ModelDocumentation() {
  return (
    <div className="w-full">
      <div className="mb-10">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          NeuroMap Model Documentation
        </h2>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground leading-relaxed">
          Clinical decision-support for seizure onset zone (SOZ) localization from functional MRI (fMRI) and intracranial EEG using
          Graph Attention Networks trained on open clinical data.
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex h-auto min-h-11 w-full flex-wrap gap-1 bg-muted/40 p-1 sm:flex-nowrap">
          <TabsTrigger value="overview" className="flex flex-1 basis-[calc(50%-2px)] items-center justify-center gap-2 py-2.5 text-xs sm:basis-0 sm:text-sm">
            <BookOpen className="h-4 w-4 shrink-0 opacity-80" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="architecture" className="flex flex-1 basis-[calc(50%-2px)] items-center justify-center gap-2 py-2.5 text-xs sm:basis-0 sm:text-sm">
            <Code2 className="h-4 w-4 shrink-0 opacity-80" />
            <span className="truncate">Architecture</span>
          </TabsTrigger>
          <TabsTrigger value="training" className="flex flex-1 basis-[calc(50%-2px)] items-center justify-center gap-2 py-2.5 text-xs sm:basis-0 sm:text-sm">
            <Beaker className="h-4 w-4 shrink-0 opacity-80" />
            Training
          </TabsTrigger>
          <TabsTrigger value="api" className="flex flex-1 basis-[calc(50%-2px)] items-center justify-center gap-2 py-2.5 text-xs sm:basis-0 sm:text-sm">
            <FileText className="h-4 w-4 shrink-0 opacity-80" />
            API
          </TabsTrigger>
          <TabsTrigger value="limitations" className="flex min-w-[calc(50%-2px)] flex-1 basis-[calc(50%-2px)] items-center justify-center gap-2 py-2.5 text-xs sm:min-w-0 sm:basis-0 sm:text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 opacity-80" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8 space-y-6 focus-visible:outline-none">
          <Card className="border-border/80 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Model overview</CardTitle>
              <CardDescription>What NeuroMap does and how it fits clinical workflows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                NeuroMap (Seizure Onset Zone — Graph Attention Network) identifies SOZ likelihood using a combination of Graph Attention Networks 
                for both fMRI and iEEG modalities. For fMRI, the core model is <strong>EpilepsyGAT</strong>, utilizing GATv2Conv layers with GraphNorm 
                operating on Functional Connectivity (FC) matrices, ensembled with a 2D CNN (FCMatrixCNN). For iEEG, it uses a 3-layer graph attention model with a skip connection.
              </p>
              <p>
                The fMRI path extracts graph-theoretic node features (degree, betweenness, clustering) from the BOLD time-series alongside the FC adjacency matrix. 
                The iEEG path computes fifteen hand-crafted metrics per channel, using gamma-band coherence for its edges. Both approaches allow the network to capture complex topological biomarkers of epileptogenic networks.
              </p>
              <p>
                Outputs include per-channel SOZ probability, aggregate risk and confidence, and batch support for
                research pipelines. The service loads a trained checkpoint and fitted scaler once at startup — there
                is no online training during inference.
              </p>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="mb-2 font-medium text-foreground">Key capabilities</p>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex gap-2">
                    <span className="text-primary">▸</span>
                    Feature-based inference from 15 metrics per channel, or full raw-iEEG preprocessing server-side
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">▸</span>
                    Graph construction from coherence (adaptive median threshold) when raw traces are supplied
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">▸</span>
                    Standardized JSON API with health and model metadata endpoints
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">▸</span>
                    Batch prediction for up to 50 samples per request
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">▸</span>
                    fMRI functional-connectivity inference with ROI overlay on the client
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="architecture" className="mt-8 space-y-6 focus-visible:outline-none">
          <Card className="border-border/80 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Architecture</CardTitle>
              <CardDescription>Aligned with the deployed NeuroMap checkpoint</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm leading-relaxed text-muted-foreground">
              <p>
                The deployed fMRI model is a <strong className="text-foreground">Graph Attention Network (EpilepsyGAT)</strong>{' '}
                with 3 GATv2 layers, GraphNorm, and global pooling, ensembled with a 2D ResNet-style CNN. The fMRI GAT operates on an 
                FC adjacency matrix thresholded at |r| {'>'} 0.15, using graph metrics as node features. 
                The deployed iEEG model is a <strong className="text-foreground">3-layer GAT</strong> with a skip connection, 
                operating on an electrode graph with gamma-band coherence edges (adaptive median threshold).
              </p>

              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Pipelines</h4>
                <p className="rounded-md border border-border/60 bg-muted/30 p-3 font-mono text-xs text-foreground/90">
                  fMRI → BOLD extraction → FC matrix & graph metrics → EpilepsyGAT + CNN Ensemble → ROI logits<br/>
                  iEEG → feature extraction (15 / channel) → PyG graph → GAT → channel logits
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Input features (fMRI EpilepsyGAT)</h4>
                <ol className="list-decimal space-y-1 pl-5 text-xs sm:text-sm">
                  <li>BOLD time-series mean & standard deviation</li>
                  <li>Graph degree, betweenness centrality, and clustering coefficient</li>
                </ol>
              </div>

              <div className="space-y-2 mt-4">
                <h4 className="font-medium text-foreground">Input features (iEEG)</h4>
                <ol className="list-decimal space-y-1 pl-5 text-xs sm:text-sm">
                  <li>variance, skewness, kurtosis, line_length, zero_crossing_rate, spectral_entropy, hfo_rate, spike_rate, pac_theta_gamma</li>
                  <li>logpower (delta, theta, alpha, beta, low_gamma, high_gamma)</li>
                </ol>
              </div>

              <div className="space-y-2 mt-4">
                <h4 className="font-medium text-foreground">Outputs</h4>
                <ul className="space-y-1 text-xs sm:text-sm">
                  <li>• Binary SOZ vs normal prediction and SOZ probability per channel/ROI</li>
                  <li>• GAT node embeddings and CNN features for fusion representation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="mt-8 space-y-6 focus-visible:outline-none">
          <Card className="border-border/80 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Training & validation</CardTitle>
              <CardDescription>Dataset and evaluation design</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Training for fMRI follows the OpenNeuro ds004469 dataset protocols using Schaefer-2018 (100 ROIs) parcellation, 
                balanced via hybrid synthetic control injection, and evaluated via Stratified K-Fold. 
                Training for iEEG follows the OpenNeuro ds004752 protocol with clinical SOZ labels from BIDS metadata, 
                and is evaluated via leave-one-subject-out (LOSO) cross-validation, achieving ~91% LOSO-CV accuracy.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/25 p-4">
                  <h4 className="mb-2 font-medium text-foreground">Datasets</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• OpenNeuro ds004469 (fMRI - 20 subjects)</li>
                    <li>• OpenNeuro ds004752 (iEEG)</li>
                    <li>• Focal loss (alpha=0.75, gamma=2.0)</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/25 p-4">
                  <h4 className="mb-2 font-medium text-foreground">Preprocessing</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• fMRI: Schaefer-2018 (100 ROIs) BOLD extraction & FC Thresholding</li>
                    <li>• iEEG: StandardScaler fitted per LOSO fold & 15-feature extraction</li>
                    <li>• Both: Custom graph construction (FC edges vs. gamma coherence)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="mt-8 space-y-6 focus-visible:outline-none">
          <Card className="border-border/80 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader>
              <CardTitle>API reference</CardTitle>
              <CardDescription>FastAPI service — configure the frontend with NEXT_PUBLIC_API_URL</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <h4 className="mb-2 font-medium text-foreground">Base URL</h4>
                <p className="rounded-md border border-border/60 bg-muted/40 p-3 font-mono text-xs text-foreground/90">
                  {getApiBaseUrl()}
                </p>
              </div>

              <div>
                <h4 className="mb-3 font-medium text-foreground">Endpoints</h4>
                <div className="space-y-2">
                  {[
                    { method: 'GET', path: '/health', desc: 'Service status and whether the model loaded' },
                    { method: 'GET', path: '/model-info', desc: 'Architecture string, feature names, device, version' },
                    { method: 'POST', path: '/predict', desc: 'Pre-extracted 15 features per channel (+ optional raw for graph)' },
                    { method: 'POST', path: '/predict/raw', desc: 'Raw iEEG windows; features and graph built server-side' },
                    { method: 'POST', path: '/predict/fmri', desc: 'FC matrix + optional node features for ROI probability overlay' },
                    { method: 'POST', path: '/predict/batch', desc: 'Up to 50 feature-based requests in one call' },
                  ].map((row) => (
                    <div
                      key={row.path}
                      className="rounded-lg border border-border/50 bg-muted/20 p-3 transition-colors hover:border-primary/25"
                    >
                      <p className="mb-1 font-mono text-xs font-semibold text-primary">
                        {row.method} {row.path}
                      </p>
                      <p className="text-xs text-muted-foreground">{row.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-medium text-foreground">Example — POST /predict (truncated)</h4>
                <pre className="max-h-64 overflow-x-auto overflow-y-auto rounded-md border border-border/60 bg-[oklch(0.1_0.02_250)] p-3 font-mono text-[11px] leading-relaxed text-foreground/85 sm:text-xs">
                  {`{
  "status": "ok",
  "predictions": [0, 1],
  "soz_probabilities": [0.12, 0.88],
  "per_channel": [
    { "channel": "LA1", "prediction": "Normal", "soz_probability": 0.12 },
    { "channel": "LA2", "prediction": "SOZ", "soz_probability": 0.88 }
  ],
  "confidence": 0.88,
  "risk_score": 0.50,
  "n_soz_predicted": 1,
  "n_channels": 2
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limitations" className="mt-8 space-y-6 focus-visible:outline-none">
          <Card className="border-border/80 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Important considerations</CardTitle>
              <CardDescription>Limitations and safe use</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <p className="mb-2 font-medium text-destructive">Clinical use disclaimer</p>
                <p className="text-xs leading-relaxed text-foreground/85">
                  NeuroMap is a decision-support tool only. It must not be the sole basis for diagnosis, surgical
                  planning, or treatment. Interpret outputs with qualified epilepsy expertise and corroborating clinical,
                  imaging, and electrophysiological data.
                </p>
              </div>

              <div>
                <h4 className="mb-2 font-medium text-foreground">Limitations</h4>
                <ul className="space-y-1.5 text-xs">
                  <li>• Performance depends on montage, sampling rate, artifact burden, and label quality.</li>
                  <li>• Without a fitted scaler, predictions are unreliable — always deploy scaler.pkl with the checkpoint.</li>
                  <li>• Fully connected fallback graphs omit true coherence structure when raw iEEG is not provided.</li>
                  <li>• Pediatric or atypical epilepsy phenotypes may require separate validation.</li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-medium text-foreground">Best practices</h4>
                <ul className="space-y-1.5 text-xs">
                  <li>✓ Review per-channel probabilities alongside raw traces and clinical context.</li>
                  <li>✓ Track calibration with surgical or stereo-EEG ground truth when available.</li>
                  <li>✓ Use /health and /model-info in operations dashboards for load and version drift.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-12 grid gap-4 border-t border-border/60 pt-10 sm:grid-cols-3">
        <Card className="border-border/60 bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">API version</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm text-foreground">1.0.0</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Synced with backend README and /model-info schema.</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Contact your institution&apos;s clinical engineering team.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
