/**
 * TypeScript mirrors of backend `app.schemas.schemas` (FastAPI / Pydantic).
 * Keep in sync when the API contract changes.
 */

export interface ClassProbability {
  normal: number
  soz: number
}

export interface ChannelResult {
  channel: string
  prediction: string
  soz_probability: number
}

/** Response body for POST /predict and POST /predict/raw */
export interface PredictResponse {
  status: string
  predictions: number[]
  soz_probabilities: number[]
  class_probabilities: ClassProbability[]
  per_channel: ChannelResult[]
  channel_names: string[]
  confidence: number
  risk_score: number
  n_soz_predicted: number
  n_channels: number
  features_extracted?: boolean | null
}

/** Client-only timing; not returned by the API */
export type PredictResponseClient = PredictResponse & { client_timing_ms?: number }

/** Response body for POST /predict/fmri */
export interface FmriPredictResponse {
  status: string
  prob_gat: number
  roi_probs: number[]
  n_rois?: number
}

export type FmriPredictResponseClient = FmriPredictResponse & { client_timing_ms?: number }

/** Response body for POST /predict/batch */
export interface BatchPredictResponse {
  status: string
  n_samples: number
  results: unknown[]
}

export interface BatchResultSuccess extends PredictResponse {
  sample_index: number
  status: 'ok'
}

export interface BatchResultError {
  sample_index: number
  status?: string
  error: string
}

export type BatchPredictResponseClient = BatchPredictResponse & { client_timing_ms?: number }

export interface CombinedPredictResponseClient {
  status: string
  ieeg: PredictResponseClient
  fmri: FmriPredictResponseClient
  combined_risk: number
  client_timing_ms?: number
}

export function isBatchResultSuccess(row: Record<string, unknown>): row is BatchResultSuccess {
  return row.status === 'ok' && Array.isArray(row.predictions) && typeof row.sample_index === 'number'
}

export function isBatchResultError(row: Record<string, unknown>): row is BatchResultError {
  return typeof row.error === 'string' && row.status !== 'ok'
}
