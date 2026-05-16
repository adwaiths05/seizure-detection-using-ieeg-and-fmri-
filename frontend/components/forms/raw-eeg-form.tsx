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

interface RawEEGFormProps {
  onSubmit: (payload: { rawCsv: string; sfreq: number; channelNamesText: string }) => Promise<void>
  loading: boolean
  error?: string
}

export function RawEEGForm({ onSubmit, loading, error }: RawEEGFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [sfreq, setSfreq] = useState('500')
  const [channelNames, setChannelNames] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return
    const rate = parseFloat(sfreq)
    if (!Number.isFinite(rate) || rate <= 0) {
      return
    }
    const text = await selectedFile.text()
    await onSubmit({ rawCsv: text, sfreq: rate, channelNamesText: channelNames.trim() })
    setSelectedFile(null)
    setChannelNames('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Card className="border border-border bg-card">
      <CardHeader>
        <CardTitle>Raw iEEG prediction</CardTitle>
        <CardDescription>
          POST <span className="font-mono text-xs">/predict/raw</span> — JSON body{' '}
          <span className="font-mono text-xs">{'{ raw_eeg, sfreq, channel_names? }'}</span>. Upload CSV: each row =
          one channel, columns = time samples (comma or tab). EDF/HDF5 are not parsed here; convert to CSV first.
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

          <div className="space-y-2">
            <Label htmlFor="sfreq">sfreq (Hz)</Label>
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
            <Label htmlFor="eeg-file" className="text-base">
              raw_eeg (CSV file)
            </Label>
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:bg-muted/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto mb-2 h-8 w-8 text-primary" />
              <p className="mb-1 font-medium text-foreground">
                {selectedFile ? selectedFile.name : 'Choose CSV file'}
              </p>
              <p className="text-sm text-muted-foreground">Backend: ≥2 channels, ≥100 samples per channel</p>
              <input
                ref={fileInputRef}
                type="file"
                id="eeg-file"
                onChange={handleFileChange}
                accept=".csv,.txt,text/csv"
                disabled={loading}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="raw-channel-names">channel_names (optional, one per line)</Label>
            <Textarea
              id="raw-channel-names"
              placeholder={'LA1\nLA2'}
              value={channelNames}
              onChange={(e) => setChannelNames(e.target.value)}
              disabled={loading}
              className="min-h-20 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">If set, count must match the number of rows in the CSV.</p>
          </div>

          <Button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Spinner className="mr-2" />
                Running…
              </>
            ) : (
              'POST /predict/raw'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
