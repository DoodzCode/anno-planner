import LZString from 'lz-string'
import type { Placement } from '../types/domain'
import { migratePlacements } from './migration'

const HASH_PREFIX = '#bp='

/**
 * Encode placements into a URL-safe compressed hash fragment.
 * Returns the full URL with the fragment appended.
 */
export function encodeShareURL(placements: Placement[]): string {
  const json = JSON.stringify(placements)
  const compressed = LZString.compressToEncodedURIComponent(json)
  const url = `${window.location.origin}${window.location.pathname}${HASH_PREFIX}${compressed}`
  return url
}

/**
 * Try to decode placements from the current URL hash (or a given hash string).
 * Returns null if the hash is absent, invalid, or malformed.
 */
export function decodeShareURL(hash: string = window.location.hash): Placement[] | null {
  if (!hash.startsWith(HASH_PREFIX)) return null
  const compressed = hash.slice(HASH_PREFIX.length)
  if (!compressed) return null
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed)
    if (!json) return null
    const data = JSON.parse(json)
    if (!Array.isArray(data)) return null
    // Basic shape validation
    const placements = data.filter(
      (p): p is Placement =>
        typeof p === 'object' &&
        p !== null &&
        typeof p.id === 'string' &&
        typeof p.buildingId === 'string' &&
        typeof p.x === 'number' &&
        typeof p.y === 'number',
    )
    const migrated = migratePlacements(placements)
    return migrated.length > 0 ? migrated : null
  } catch {
    return null
  }
}
