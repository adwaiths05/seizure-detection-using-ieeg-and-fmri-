'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface BatchFormProps {
  onSubmit: (batchText: string) => Promise<void>
  loading: boolean
  error?: string
}

export function BatchForm({ onSubmit, loading, error }: BatchFormProps) {
  const [text, setText] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      await onSubmit(text.trim())
    }
  }

  return (
    <Card className="border border-border bg-card">
      <CardHeader>
        <CardTitle>Batch prediction</CardTitle>
        <CardDescription>
          POST <span className="font-mono text-xs">/predict/batch</span> — multiple samples separated by a line
          containing only <span className="font-mono">---</span>. Each block uses the same 15-feature-per-line format
          as the Features tab.
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
            <Label htmlFor="batch-text">Samples (--- between blocks)</Label>
            <Textarea
              id="batch-text"
              placeholder={
                '# Sample 1 — two channels\n' +
                '0.1,0.2,0.3,0.1,0.05,1.2,0.8,0.6,0.9,1.1,0.7,3.2,0.5,0.1,0.02\n' +
                '0.5,-0.1,2.1,0.3,0.08,0.9,0.7,0.4,1.2,2.5,1.8,3.5,8.2,1.2,0.15\n' +
                '---\n' +
                '# Sample 2 — one channel\n' +
                '0.2,0.1,0.8,0.2,0.06,1.0,0.6,0.5,0.8,0.9,0.6,3.0,0.3,0.2,0.01'
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              className="min-h-56 font-mono text-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={loading || !text.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Spinner className="mr-2" />
                Running…
              </>
            ) : (
              'POST /predict/batch'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
