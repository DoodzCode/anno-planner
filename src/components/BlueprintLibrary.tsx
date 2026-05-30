import { useEffect, useState, useCallback } from 'react'
import type { Blueprint } from '../types/domain'
import {
  listLibrary, saveToLibrary, loadFromLibrary,
  deleteFromLibrary, renameInLibrary, duplicateInLibrary,
} from '../state/persistence'
import { useBlueprintStore } from '../state/blueprintStore'

interface Props {
  onClose: () => void
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function BlueprintLibrary({ onClose }: Props) {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [saveName, setSaveName]     = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal]   = useState('')
  const [busy, setBusy]             = useState(false)

  const currentName = useBlueprintStore(s => s.blueprintName)

  const refresh = useCallback(async () => {
    setBlueprints(await listLibrary())
  }, [])

  useEffect(() => {
    refresh()
    setSaveName(currentName)
  }, [refresh, currentName])

  // Dismiss on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = async () => {
    if (!saveName.trim()) return
    setBusy(true)
    await saveToLibrary(saveName.trim())
    useBlueprintStore.getState().setBlueprintName(saveName.trim())
    await refresh()
    setBusy(false)
  }

  const handleLoad = async (id: string) => {
    setBusy(true)
    await loadFromLibrary(id)
    setBusy(false)
    onClose()
  }

  const handleDelete = async (id: string) => {
    await deleteFromLibrary(id)
    await refresh()
  }

  const handleDuplicate = async (id: string) => {
    await duplicateInLibrary(id)
    await refresh()
  }

  const startRename = (bp: Blueprint) => {
    setRenamingId(bp.id)
    setRenameVal(bp.name)
  }

  const commitRename = async (id: string) => {
    if (renameVal.trim()) await renameInLibrary(id, renameVal.trim())
    setRenamingId(null)
    await refresh()
  }

  return (
    <div className="lib-backdrop" onClick={onClose}>
      <div className="lib-modal" onClick={e => e.stopPropagation()}>
        <div className="lib-header">
          <h2>Blueprint Library</h2>
          <button className="lib-close" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        {/* Save current */}
        <div className="lib-save-row">
          <input
            className="lib-name-input"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Blueprint name…"
          />
          <button className="lib-btn lib-btn-primary" onClick={handleSave} disabled={busy || !saveName.trim()}>
            Save current
          </button>
        </div>

        {/* List */}
        {blueprints.length === 0 ? (
          <p className="lib-empty">No saved blueprints yet.</p>
        ) : (
          <div className="lib-list">
            {blueprints.map(bp => (
              <div key={bp.id} className="lib-row">
                <div className="lib-row-info">
                  {renamingId === bp.id ? (
                    <input
                      className="lib-inline-rename"
                      value={renameVal}
                      autoFocus
                      onChange={e => setRenameVal(e.target.value)}
                      onBlur={() => commitRename(bp.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRename(bp.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                    />
                  ) : (
                    <span className="lib-row-name" onDoubleClick={() => startRename(bp)}>{bp.name}</span>
                  )}
                  <span className="lib-row-meta">
                    {bp.placements.length} buildings · {formatDate(bp.updatedAt)}
                  </span>
                </div>
                <div className="lib-row-actions">
                  <button className="lib-btn" onClick={() => handleLoad(bp.id)} disabled={busy} title="Load blueprint">Load</button>
                  <button className="lib-btn" onClick={() => startRename(bp)} title="Rename">✎</button>
                  <button className="lib-btn" onClick={() => handleDuplicate(bp.id)} title="Duplicate">⧉</button>
                  <button className="lib-btn lib-btn-danger" onClick={() => handleDelete(bp.id)} title="Delete">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
