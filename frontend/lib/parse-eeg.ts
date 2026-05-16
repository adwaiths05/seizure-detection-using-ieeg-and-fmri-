/** Parse lines of comma-separated floats; each line must have exactly `dim` values. */
export function parseFeatureMatrix(text: string, dim: number): number[][] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const rows: number[][] = []
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(/[,\t]+/).map((p) => p.trim())
    const nums = parts.map((p) => {
      const n = Number(p)
      if (!Number.isFinite(n)) {
        throw new Error(`Line ${i + 1}: invalid number "${p}"`)
      }
      return n
    })
    if (nums.length !== dim) {
      throw new Error(`Line ${i + 1}: expected ${dim} values, got ${nums.length}`)
    }
    rows.push(nums)
  }
  if (rows.length === 0) {
    throw new Error('Enter at least one channel row')
  }
  return rows
}

/** Optional channel names: one label per non-empty line. */
export function parseChannelNames(text: string): string[] | undefined {
  const names = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  return names.length ? names : undefined
}

/** Raw EEG CSV: one row per channel, columns = time samples (comma or tab). */
export function parseRawEegCsv(text: string, minSamples = 100): number[][] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) {
    throw new Error('Need at least 2 channel rows')
  }
  const rows: number[][] = []
  let nSamples = -1
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(/[,\t]+/).map((p) => p.trim())
    const nums = parts.map((p) => {
      const n = Number(p)
      if (!Number.isFinite(n)) {
        throw new Error(`Row ${i + 1}: invalid number "${p}"`)
      }
      return n
    })
    if (nSamples < 0) nSamples = nums.length
    else if (nums.length !== nSamples) {
      throw new Error(`Row ${i + 1}: expected ${nSamples} samples, got ${nums.length}`)
    }
    rows.push(nums)
  }
  if (nSamples < minSamples) {
    throw new Error(`Need at least ${minSamples} samples per channel (backend requirement)`)
  }
  return rows
}

/**
 * Batch: samples separated by a line containing only ---.
 * Each block is the same format as the features textarea (N lines × 15 floats).
 */
export function parseBatchFeatureBlocks(text: string, dim: number): { features: number[][] }[] {
  const blocks = text
    .split(/\r?\n---\r?\n|\n---\n/)
    .map((b) => b.trim())
    .filter(Boolean)
  if (blocks.length === 0) {
    throw new Error('Enter at least one sample block (use --- on its own line between samples)')
  }
  return blocks.map((block, idx) => {
    try {
      return { features: parseFeatureMatrix(block, dim) }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      throw new Error(`Sample ${idx + 1}: ${msg}`)
    }
  })
}
