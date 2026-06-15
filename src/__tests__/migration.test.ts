import { describe, it, expect } from 'vitest'
import { LEGACY_ID_MAP, migratePlacements } from '../lib/migration'
import type { Placement } from '../types/domain'

const makePlace = (buildingId: string, overrides: Partial<Placement> = {}): Placement => ({
  id: 'p1', buildingId, x: 0, y: 0, rotation: 0, ...overrides,
})

describe('LEGACY_ID_MAP', () => {
  it('maps the legacy farmers warehouse id', () => {
    expect(LEGACY_ID_MAP['logistic-02-warehouse-i']).toBe('logistic-02-warehouse-farmers')
  })

  it('maps the legacy duplicate warehouse id to investors (what BUILDING_MAP resolved to)', () => {
    expect(LEGACY_ID_MAP['logistic-02-warehouse-i-1010371']).toBe('logistic-02-warehouse-investors')
  })
})

describe('migratePlacements', () => {
  it('rewrites the legacy farmers warehouse id', () => {
    const result = migratePlacements([makePlace('logistic-02-warehouse-i')])
    expect(result[0].buildingId).toBe('logistic-02-warehouse-farmers')
  })

  it('rewrites the legacy duplicate warehouse id', () => {
    const result = migratePlacements([makePlace('logistic-02-warehouse-i-1010371')])
    expect(result[0].buildingId).toBe('logistic-02-warehouse-investors')
  })

  it('passes through unknown ids unchanged', () => {
    const result = migratePlacements([makePlace('some-other-building')])
    expect(result[0].buildingId).toBe('some-other-building')
  })

  it('preserves all other placement fields during migration', () => {
    const p = makePlace('logistic-02-warehouse-i', { id: 'abc', x: 5, y: 10, rotation: 90 })
    const [result] = migratePlacements([p])
    expect(result.id).toBe('abc')
    expect(result.x).toBe(5)
    expect(result.y).toBe(10)
    expect(result.rotation).toBe(90)
  })

  it('handles a mixed blueprint: legacy + already-migrated + other buildings', () => {
    const placements = [
      makePlace('logistic-02-warehouse-i',        { id: 'a' }),
      makePlace('logistic-02-warehouse-i-1010371', { id: 'b' }),
      makePlace('logistic-02-warehouse-farmers',   { id: 'c' }),
      makePlace('agriculture-11-bell-pepper-farm',  { id: 'd' }),
    ]
    const result = migratePlacements(placements)
    expect(result.map(p => p.buildingId)).toEqual([
      'logistic-02-warehouse-farmers',
      'logistic-02-warehouse-investors',
      'logistic-02-warehouse-farmers',
      'agriculture-11-bell-pepper-farm',
    ])
  })

  it('returns an empty array when given an empty array', () => {
    expect(migratePlacements([])).toHaveLength(0)
  })

  it('is idempotent — migrating already-migrated placements changes nothing', () => {
    const placements = [makePlace('logistic-02-warehouse-farmers')]
    expect(migratePlacements(migratePlacements(placements))).toEqual(placements)
  })
})
