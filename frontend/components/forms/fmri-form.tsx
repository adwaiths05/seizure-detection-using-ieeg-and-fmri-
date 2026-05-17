'use client'

import { useState, useRef } from 'react'
import { AlertCircle, UploadCloud } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface FmriFormProps {
  onSubmit: (payload: { fcMatrix: number[][]; nodeFeatures?: number[][] }) => Promise<void>
  onUpload?: (file: File) => Promise<void>
  loading: boolean
  error?: string
}

function parseNumericMatrix(text: string, label: string): number[][] {
  const value = JSON.parse(text)
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty JSON array of arrays.`)
  }

  return value.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length === 0) {
      throw new Error(`${label} row ${rowIndex + 1} must be a non-empty array.`)
    }
    return row.map((entry, colIndex) => {
      const numberValue = Number(entry)
      if (!Number.isFinite(numberValue)) {
        throw new Error(`${label} row ${rowIndex + 1}, column ${colIndex + 1} must be a finite number.`)
      }
      return numberValue
    })
  })
}

export function FmriForm({ onSubmit, onUpload, loading, error }: FmriFormProps) {
  const [fcMatrixText, setFcMatrixText] = useState('')
  const [nodeFeaturesText, setNodeFeaturesText] = useState('')
  const [formError, setFormError] = useState<string>()
  const [activeTab, setActiveTab] = useState('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(undefined)

    try {
      if (!fcMatrixText.trim()) {
        throw new Error('Paste an FC matrix in JSON format first.')
      }

      const fcMatrix = parseNumericMatrix(fcMatrixText.trim(), 'fc_matrix')
      const nRois = fcMatrix.length
      for (const [rowIndex, row] of fcMatrix.entries()) {
        if (row.length !== nRois) {
          throw new Error(`fc_matrix must be square. Row ${rowIndex + 1} has ${row.length} columns, expected ${nRois}.`)
        }
      }

      let nodeFeatures: number[][] | undefined
      if (nodeFeaturesText.trim()) {
        nodeFeatures = parseNumericMatrix(nodeFeaturesText.trim(), 'node_features')
        if (nodeFeatures.length !== nRois) {
          throw new Error(`node_features must have the same number of rows as fc_matrix (${nRois}).`)
        }
        for (const [rowIndex, row] of nodeFeatures.entries()) {
          if (row.length !== 5) {
            throw new Error(`node_features row ${rowIndex + 1} must contain exactly 5 values.`)
          }
        }
      }

      await onSubmit({ fcMatrix, ...(nodeFeatures ? { nodeFeatures } : {}) })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Invalid FMRI payload')
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(undefined)
    if (!selectedFile) {
      setFormError('Please select a NIfTI file (.nii or .nii.gz) to upload.')
      return
    }
    if (onUpload) {
      try {
        await onUpload(selectedFile)
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'File upload failed')
      }
    }
  }

  return (
    <Card className="border border-border bg-card">
      <CardHeader>
        <CardTitle>fMRI prediction</CardTitle>
        <CardDescription>
          Upload a NIfTI fMRI image (.nii or .nii.gz) to convert and analyze, or manually paste an FC matrix as JSON.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(error || formError) && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{formError || error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="upload">Upload fMRI Image</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry (JSON)</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <form onSubmit={handleUploadSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fmri-file" className="text-base">
                  Select NIfTI File
                </Label>
                <div
                  className="flex items-center justify-center w-full min-h-32 rounded-md border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer transition-colors bg-muted/20"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
                    <UploadCloud className="h-8 w-8 mb-2" />
                    {selectedFile ? (
                      <span className="text-sm font-medium text-foreground">{selectedFile.name}</span>
                    ) : (
                      <span className="text-sm">Click to select a .nii or .nii.gz file</span>
                    )}
                  </div>
                  <input
                    id="fmri-file"
                    type="file"
                    accept=".nii,.nii.gz"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !selectedFile}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2" />
                    Processing & Predicting…
                  </>
                ) : (
                  'Upload & Predict'
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="manual">
            <form onSubmit={handleSubmitManual} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fc-matrix" className="text-base">
                  FC matrix JSON
                </Label>
                <Textarea
                  id="fc-matrix"
                  value={fcMatrixText}
                  onChange={(e) => setFcMatrixText(e.target.value)}
                  disabled={loading}
                  className="min-h-56 font-mono text-sm"
                  placeholder={`[
  [0, 0.12, -0.08, 0.03],
  [0.12, 0, 0.07, -0.02],
  [-0.08, 0.07, 0, 0.10],
  [0.03, -0.02, 0.10, 0]
]`}
                />
                <p className="text-xs text-muted-foreground">
                  The matrix must be square and finite. Values are usually Fisher z, correlation, or other FC weights.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="node-features" className="text-base">
                  node_features JSON (optional)
                </Label>
                <Textarea
                  id="node-features"
                  value={nodeFeaturesText}
                  onChange={(e) => setNodeFeaturesText(e.target.value)}
                  disabled={loading}
                  className="min-h-40 font-mono text-sm"
                  placeholder={`[
  [0.10, 0.20, 3, 0.01, 0.00],
  [0.11, 0.18, 4, 0.02, 0.00],
  [0.09, 0.22, 2, 0.01, 0.00],
  [0.12, 0.19, 5, 0.03, 0.00]
]`}
                />
                <p className="text-xs text-muted-foreground">
                  If provided, each row must have 5 values and the row count must match the FC matrix size.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || !fcMatrixText.trim()}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2" />
                    Running…
                  </>
                ) : (
                  'POST /predict/fmri'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}