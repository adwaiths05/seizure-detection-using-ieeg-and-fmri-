'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface FeaturesFormProps {
  onSubmit: (payload: { featuresText: string; channelNamesText: string }) => Promise<void>
  loading: boolean
  error?: string
}

export function FeaturesForm({ onSubmit, loading, error }: FeaturesFormProps) {
  const [features, setFeatures] = useState('')
  const [channelNames, setChannelNames] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (features.trim()) {
      await onSubmit({ featuresText: features.trim(), channelNamesText: channelNames.trim() })
    }
  }

  return (
    <Card className="border border-border bg-card">
      <CardHeader>
        <CardTitle>Features-based prediction</CardTitle>
        <CardDescription>
          POST <span className="font-mono text-xs">/predict</span> — exactly 15 comma-separated floats per channel
          row (same order as model docs).
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
            <Label htmlFor="features-input" className="text-base">
              Feature matrix (one channel per line)
            </Label>
            <Textarea
              id="features-input"
              placeholder={
                '15 values per line, comma-separated, e.g.\n' +
                '0.1,0.2,0.3,0.1,0.05,1.2,0.8,0.6,0.9,1.1,0.7,3.2,0.5,0.1,0.02\n' +
                '0.5,-0.1,2.1,0.3,0.08,0.9,0.7,0.4,1.2,2.5,1.8,3.5,8.2,1.2,0.15'
              }
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              disabled={loading}
              className="min-h-40 font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-names-input" className="text-base">
              Channel names (optional, one per line)
            </Label>
            <Textarea
              id="channel-names-input"
              placeholder={'LA1\nLA2\nLH1'}
              value={channelNames}
              onChange={(e) => setChannelNames(e.target.value)}
              disabled={loading}
              className="min-h-20 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              If omitted, labels default to Ch0, Ch1, … If provided, count must match feature rows.
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || !features.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Spinner className="mr-2" />
                Running…
              </>
            ) : (
              'POST /predict'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
