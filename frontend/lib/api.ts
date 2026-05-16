/**
 * Base URL for the SOZ_GAT FastAPI service (Docker on host port 8000 by default).
 * Set NEXT_PUBLIC_API_URL in frontend/.env.local when the API is not on localhost:8000.
 */
export function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  }
  return 'http://localhost:8000'
}

export async function readErrorDetail(response: Response): Promise<string> {
  const text = await response.text()
  try {
    const j = JSON.parse(text) as { detail?: unknown }
    if (typeof j.detail === 'string') return j.detail
    if (Array.isArray(j.detail)) {
      return j.detail
        .map((item: unknown) => {
          if (typeof item === 'object' && item !== null && 'msg' in item) {
            return String((item as { msg: string }).msg)
          }
          return JSON.stringify(item)
        })
        .join('; ')
    }
    if (j.detail != null) return JSON.stringify(j.detail)
  } catch {
    /* not JSON */
  }
  return text.trim() || response.statusText
}

export interface HealthPayload {
  status: string
  /** Legacy: sole readiness flag before extended fields existed */
  model_loaded: boolean
  version: string
  /** Present on newer APIs; when absent, Navigation treats `model_loaded` as readiness */
  inference_ready?: boolean
  checkpoint_loaded?: boolean
  scaler_loaded?: boolean
  readiness_detail?: string | null
}

export async function fetchHealth(): Promise<HealthPayload> {
  const res = await fetch(`${getApiBaseUrl()}/health`, { method: 'GET', mode: 'cors' })
  if (!res.ok) {
    throw new Error(await readErrorDetail(res))
  }
  return res.json() as Promise<HealthPayload>
}
