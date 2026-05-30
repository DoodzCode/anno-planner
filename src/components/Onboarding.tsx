import { useEffect } from 'react'
import { useBlueprintStore } from '../state/blueprintStore'
import { TUTORIAL_PLACEMENTS } from '../data/tutorialBlueprint'

const STORAGE_KEY = 'anno-planner-onboarded'

interface Props {
  onDismiss: () => void
}

export function shouldShowOnboarding(): boolean {
  try {
    return !localStorage.getItem(STORAGE_KEY)
  } catch {
    return false
  }
}

function markOnboarded() {
  try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
}

export default function Onboarding({ onDismiss }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleSkip() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const handleSkip = () => {
    markOnboarded()
    onDismiss()
  }

  const handleLoadTutorial = () => {
    useBlueprintStore.getState().loadPlacements(TUTORIAL_PLACEMENTS, 'Tutorial — Farmers Chain')
    markOnboarded()
    onDismiss()
  }

  return (
    <div className="onboarding-backdrop" onClick={handleSkip}>
      <div className="onboarding-modal" onClick={e => e.stopPropagation()}>
        <div>
          <div className="onboarding-title">Anno 1800 Blueprint Planner</div>
          <div className="onboarding-subtitle">Offline city layout tool</div>
        </div>

        <div className="onboarding-body">
          <div className="onboarding-tip">
            <span className="onboarding-tip-icon">🗂</span>
            <span className="onboarding-tip-text">
              <strong>Palette (left)</strong> — browse 156 Old World buildings by tier.
              Search by name or filter by tier tab. Click a building to start placing.
            </span>
          </div>
          <div className="onboarding-tip">
            <span className="onboarding-tip-icon">🖱</span>
            <span className="onboarding-tip-text">
              <strong>Canvas (center)</strong> — click to place, drag to move.
              <strong> R</strong> rotates, <strong>Del</strong> removes, <strong>Ctrl+Z</strong> undoes.
              Scroll to zoom, Space+drag to pan.
            </span>
          </div>
          <div className="onboarding-tip">
            <span className="onboarding-tip-icon">📊</span>
            <span className="onboarding-tip-text">
              <strong>Inspector (right)</strong> — select a building to see its stats.
              Live <strong>production tallies</strong> show t/min surplus and deficit for your whole layout.
            </span>
          </div>
          <div className="onboarding-tip">
            <span className="onboarding-tip-icon">💾</span>
            <span className="onboarding-tip-text">
              Use the toolbar to <strong>Save</strong> to a named library, export as <strong>JSON</strong> or <strong>PNG</strong>,
              or copy a <strong>Share</strong> link. Works fully offline once installed.
            </span>
          </div>
        </div>

        <div className="onboarding-actions">
          <button className="onboarding-btn onboarding-btn-secondary" onClick={handleSkip}>
            Start blank
          </button>
          <button className="onboarding-btn onboarding-btn-primary" onClick={handleLoadTutorial}>
            Load tutorial layout →
          </button>
        </div>
      </div>
    </div>
  )
}
