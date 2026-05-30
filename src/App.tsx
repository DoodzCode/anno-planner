import { useEffect, useRef, useState, useCallback } from 'react'
import type Konva from 'konva'
import './App.css'
import Palette from './components/Palette'
import Canvas from './components/Canvas'
import Inspector from './components/Inspector'
import OverlayBar from './components/OverlayBar'
import BlueprintLibrary from './components/BlueprintLibrary'
import Onboarding, { shouldShowOnboarding } from './components/Onboarding'
import { loadCurrentBlueprint, startAutoSave } from './state/persistence'
import { useBlueprintStore } from './state/blueprintStore'
import { BUILDING_MAP } from './data/catalog'
import { exportJSON, exportPNG, openFile, saveFile } from './lib/exportImport'
import { encodeShareURL, decodeShareURL } from './lib/share'

export default function App() {
  const [showLibrary,    setShowLibrary]    = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [toast, setToast]                   = useState<string | null>(null)
  const stageRef      = useRef<Konva.Stage | null>(null)
  const blueprintName = useBlueprintStore(s => s.blueprintName)

  // ── Bootstrap ────────────────────────────────────────────
  useEffect(() => {
    let unsub: (() => void) | null = null

    // Check for shared blueprint in URL hash before loading saved state
    const shared = decodeShareURL(window.location.hash)
    if (shared) {
      useBlueprintStore.getState().loadPlacements(shared, 'Shared Blueprint')
      window.history.replaceState(null, '', window.location.pathname)
      unsub = startAutoSave()
    } else {
      loadCurrentBlueprint().then(() => {
        unsub = startAutoSave()
        // Show onboarding only if no saved placements exist
        if (shouldShowOnboarding()) {
          const { placements } = useBlueprintStore.getState()
          if (placements.length === 0) setShowOnboarding(true)
        }
      })
    }
    return () => unsub?.()
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }, [])

  // ── Toolbar actions ──────────────────────────────────────
  const handleExportJSON = () => {
    const { placements, blueprintName: name } = useBlueprintStore.getState()
    exportJSON({
      id: 'export', name,
      gridSize: { w: 60, h: 40 }, placements,
      metadata: { version: '0.1.0', dlcs: [] },
      createdAt: Date.now(), updatedAt: Date.now(),
    })
  }

  const handleExportPNG = () => {
    if (!stageRef.current) return
    exportPNG(stageRef.current, blueprintName)
  }

  const handleSaveFile = async () => {
    const { placements, blueprintName: name } = useBlueprintStore.getState()
    await saveFile({
      id: 'export', name,
      gridSize: { w: 60, h: 40 }, placements,
      metadata: { version: '0.1.0', dlcs: [] },
      createdAt: Date.now(), updatedAt: Date.now(),
    })
  }

  const handleImport = async () => {
    try {
      const bp = await openFile(BUILDING_MAP)
      if (!bp) return
      useBlueprintStore.getState().loadPlacements(bp.placements, bp.name)
      showToast(`Imported "${bp.name}"`)
    } catch (err) {
      showToast((err as Error).message ?? 'Import failed')
    }
  }

  const handleShare = async () => {
    const { placements } = useBlueprintStore.getState()
    const url = encodeShareURL(placements)
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link copied to clipboard!')
    } catch {
      // Clipboard API not available — show the URL
      showToast(url.length > 60 ? 'Link ready (clipboard unavailable)' : url)
    }
  }

  return (
    <div className="app-shell">
      <Palette />
      <div className="canvas-column">
        <OverlayBar />
        <div className="toolbar">
          <span className="toolbar-name">{blueprintName}</span>
          <div className="toolbar-actions">
            <button className="toolbar-btn" onClick={() => setShowLibrary(true)} title="Open blueprint library">
              Library
            </button>
            <button className="toolbar-btn" onClick={handleSaveFile} title="Save as file">
              Save
            </button>
            <button className="toolbar-btn" onClick={handleImport} title="Import blueprint from file">
              Import
            </button>
            <button className="toolbar-btn" onClick={handleExportJSON} title="Export as JSON">
              JSON
            </button>
            <button className="toolbar-btn" onClick={handleExportPNG} title="Export as PNG screenshot">
              PNG
            </button>
            <button className="toolbar-btn toolbar-btn-share" onClick={handleShare} title="Copy shareable link">
              Share
            </button>
          </div>
        </div>
        <Canvas onStageReady={stage => { stageRef.current = stage }} />
      </div>
      <Inspector />

      {showLibrary    && <BlueprintLibrary onClose={() => setShowLibrary(false)} />}
      {showOnboarding && <Onboarding onDismiss={() => setShowOnboarding(false)} />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
