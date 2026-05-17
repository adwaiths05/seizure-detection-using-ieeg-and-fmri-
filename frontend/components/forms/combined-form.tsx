'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, Upload } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CombinedFormProps {
  onSubmit: (payload: { rawCsv: string; sfreq: number; channelNamesText: string; fmriFile: File }) => Promise<void>
  loading: boolean
  error?: string
}

export function CombinedForm({ onSubmit, loading, error }: CombinedFormProps) {
  const [eegFile, setEegFile] = useState<File | null>(null)
  const [sfreq, setSfreq] = useState('500')
  const [channelNames, setChannelNames] = useState('')
  const [fmriFile, setFmriFile] = useState<File | null>(null)
  
  const eegFileInputRef = useRef<HTMLInputElement>(null)
  const fmriFileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eegFile || !fmriFile) return
    const rate = parseFloat(sfreq)
    if (!Number.isFinite(rate) || rate <= 0) return
    
    const text = await eegFile.text()
    await onSubmit({
      rawCsv: text,
      sfreq: rate,
      channelNamesText: channelNames.trim(),
      fmriFile
    })
  }

  return (
    <Card className="border border-border bg-card">
      <CardHeader>
        <CardTitle>Multimodal combined prediction</CardTitle>
        <CardDescription>
          Provide both Raw iEEG data and an fMRI NIfTI file in a single analysis request to get joint multimodal prediction results.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* iEEG Section */}
            <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/20">
              <h3 className="font-semibold px-1">1. iEEG Data</h3>
              <div className="space-y-2">
                <Label htmlFor="sfreq">Sampling Frequency (Hz)</Label>
                <Input
                  id="sfreq"
                  type="number"
                  min={1}
                  step="any"
                  value={sfreq}
                  onChange={(e) => setSfreq(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eeg-file">raw_eeg (CSV file)</Label>
                <div
                  className="cursor-pointer rounded-lg border-2 border-dashed border-border p-4 text-center transition-colors hover:bg-muted/50"
                  onClick={() => eegFileInputRef.current?.click()}
                >
                  <Upload className="mx-auto mb-2 h-6 w-6 text-primary" />
                  <p className="mb-1 text-sm font-medium text-foreground">
                    {eegFile ? eegFile.name : 'Choose CSV file'}
                  </p>
                  <input
                    ref={eegFileInputRef}
                    type="file"
                    id="eeg-file"
                    onChange={(e) => setEegFile(e.target.files?.[0] || null)}
                    accept=".csv,.txt,text/csv"
                    disabled={loading}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="raw-channel-names">channel_names (optional)</Label>
                <Textarea
                  id="raw-channel-names"
                  placeholder={'LA1\nLA2'}
                  value={channelNames}
                  onChange={(e) => setChannelNames(e.target.value)}
                  disabled={loading}
                  className="min-h-16 font-mono text-sm"
                />
              </div>
            </div>

            {/* fMRI Section */}
            <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/20">
              <h3 className="font-semibold px-1">2. fMRI Data</h3>
              <div className="space-y-2">
                <Label htmlFor="fmri-file">fMRI Scan (.nii / .nii.gz)</Label>
                <div
                  className="cursor-pointer flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:bg-muted/50 h-full"
                  onClick={() => fmriFileInputRef.current?.click()}
                >
                  <Upload className="mx-auto mb-2 h-8 w-8 text-primary" />
                  <p className="mb-1 text-sm font-medium text-foreground">
                    {fmriFile ? fmriFile.name : 'Choose NIfTI file'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Upload a preprocessed NIfTI scan for ROI connectivity analysis.</p>
                  <input
                    ref={fmriFileInputRef}
                    type="file"
                    id="fmri-file"
                    onChange={(e) => setFmriFile(e.target.files?.[0] || null)}
                    accept=".nii,.nii.gz"
                    disabled={loading}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !eegFile || !fmriFile}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Running joint inference...
              </>
            ) : (
              'Run Combined Analysis'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
