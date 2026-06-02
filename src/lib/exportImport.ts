import type Konva from 'konva'
import type { Blueprint, Building } from '../types/domain'
import { migratePlacements } from './migration'

// ── Helpers ────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function safeName(name: string) {
  return name.replace(/[^a-z0-9_-]/gi, '_').slice(0, 60) || 'blueprint'
}

// ── JSON Export ────────────────────────────────────────────

export function exportJSON(blueprint: Blueprint): void {
  const json = JSON.stringify(blueprint, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  downloadBlob(blob, `${safeName(blueprint.name)}.json`)
}

// ── JSON Import ────────────────────────────────────────────

export async function importJSON(
  file: File,
  buildingMap: Map<string, Building>,
): Promise<Blueprint> {
  const text = await file.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('File is not valid JSON.')
  }

  if (typeof data !== 'object' || data === null || !('placements' in data)) {
    throw new Error('File does not look like an Anno Planner blueprint.')
  }

  const raw = data as Blueprint
  // Migrate legacy building ids before validating against current catalog
  const migrated = migratePlacements(raw.placements ?? [])
  const validPlacements = migrated.filter(p => buildingMap.has(p.buildingId))
  const skipped = migrated.length - validPlacements.length
  if (skipped > 0) {
    console.warn(`importJSON: skipped ${skipped} placement(s) with unknown buildingId`)
  }

  return {
    id: raw.id ?? crypto.randomUUID(),
    name: String(raw.name ?? 'Imported Blueprint'),
    gridSize: raw.gridSize ?? { w: 60, h: 40 },
    placements: validPlacements,
    metadata: raw.metadata ?? { version: '0.1.0', dlcs: [] },
    createdAt: raw.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  }
}

// ── PNG Export ─────────────────────────────────────────────

export function exportPNG(stage: Konva.Stage, name = 'blueprint'): void {
  const dataUrl = stage.toDataURL({ pixelRatio: 2 })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${safeName(name)}.png`
  a.click()
}

// ── File System Access API (power users) ──────────────────

const hasFSAA = typeof window !== 'undefined' && 'showSaveFilePicker' in window

export async function saveFile(blueprint: Blueprint): Promise<void> {
  const json = JSON.stringify(blueprint, null, 2)
  if (hasFSAA) {
    try {
      const handle = await (window as Window & typeof globalThis & {
        showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>
      }).showSaveFilePicker({
        suggestedName: `${safeName(blueprint.name)}.json`,
        types: [{ description: 'Anno Blueprint', accept: { 'application/json': ['.json'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return
    } catch (e) {
      // User cancelled or FSAA failed — fall through to blob download
      if ((e as DOMException).name === 'AbortError') return
    }
  }
  downloadBlob(new Blob([json], { type: 'application/json' }), `${safeName(blueprint.name)}.json`)
}

export async function openFile(
  buildingMap: Map<string, Building>,
): Promise<Blueprint | null> {
  if (hasFSAA) {
    try {
      const [handle] = await (window as Window & typeof globalThis & {
        showOpenFilePicker: (opts: unknown) => Promise<FileSystemFileHandle[]>
      }).showOpenFilePicker({
        types: [{ description: 'Anno Blueprint', accept: { 'application/json': ['.json'] } }],
      })
      const file = await handle.getFile()
      return await importJSON(file, buildingMap)
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return null
      throw e
    }
  }
  // Fallback: hidden file input
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      try { resolve(await importJSON(file, buildingMap)) }
      catch (err) { reject(err) }
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}
