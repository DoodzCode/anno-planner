import { describe, it, expect } from 'vitest'
import rawCatalog from '../data/building-catalog.json'
import rawGoods from '../data/goods.json'
import type { BuildingFamily } from '../types/domain'

const catalog = rawCatalog as unknown as BuildingFamily[]
const goods   = rawGoods as { id: string; name: string; category: string }[]

// ── Unified catalog integrity ──────────────────────────────

describe('building-catalog.json', () => {
  const allVariants   = catalog.flatMap(f => f.variants)
  const allVariantIds = allVariants.map(v => v.id)

  it('is non-empty', () => {
    expect(catalog.length).toBeGreaterThan(0)
  })

  it('has no duplicate family ids', () => {
    const ids   = catalog.map(f => f.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dupes).toHaveLength(0)
  })

  it('has no duplicate variant ids', () => {
    const dupes = allVariantIds.filter((id, i) => allVariantIds.indexOf(id) !== i)
    expect(dupes).toHaveLength(0)
  })

  it('every defaultVariantId resolves within its family', () => {
    const broken = catalog
      .filter(f => !f.variants.find(v => v.id === f.defaultVariantId))
      .map(f => f.id)
    expect(broken).toHaveLength(0)
  })

  it('every family has a valid BuildingCategory', () => {
    const valid = new Set(['residence', 'production', 'public_service', 'infrastructure'])
    const bad   = catalog.filter(f => !valid.has(f.category)).map(f => `${f.id}: ${f.category}`)
    expect(bad).toHaveLength(0)
  })

  it('every variant has required fields (id, name, footprint)', () => {
    const broken = allVariants
      .filter(v => !v.id || !v.name || !v.footprint?.w || !v.footprint?.h)
      .map(v => v.id ?? '(missing id)')
    expect(broken).toHaveLength(0)
  })

  it('every variant with production has required production fields', () => {
    const broken: string[] = []
    for (const v of allVariants) {
      if (!v.production) continue
      if (!v.production.output?.good)           broken.push(`${v.id}: missing output.good`)
      if (typeof v.production.baseCycleSeconds !== 'number')
                                                broken.push(`${v.id}: missing baseCycleSeconds`)
      if (typeof v.production.requiresElectricity !== 'boolean')
                                                broken.push(`${v.id}: missing requiresElectricity`)
    }
    expect(broken).toHaveLength(0)
  })
})

// ── Goods list integrity ───────────────────────────────────

describe('goods.json', () => {
  it('is non-empty', () => {
    expect(goods.length).toBeGreaterThan(0)
  })

  it('has no duplicate good ids', () => {
    const ids   = goods.map(g => g.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dupes).toHaveLength(0)
  })

  it('every production output good exists in goods list', () => {
    const goodIds = new Set(goods.map(g => g.id))
    const missing: string[] = []
    for (const f of catalog) {
      for (const v of f.variants) {
        if (v.production && !goodIds.has(v.production.output.good)) {
          missing.push(`${v.id} → ${v.production.output.good}`)
        }
      }
    }
    expect(missing).toHaveLength(0)
  })

  it('every production input good exists in goods list', () => {
    const goodIds = new Set(goods.map(g => g.id))
    const missing: string[] = []
    for (const f of catalog) {
      for (const v of f.variants) {
        for (const inp of v.production?.inputs ?? []) {
          if (!goodIds.has(inp.good)) missing.push(`${v.id} → ${inp.good}`)
        }
      }
    }
    expect(missing).toHaveLength(0)
  })
})
