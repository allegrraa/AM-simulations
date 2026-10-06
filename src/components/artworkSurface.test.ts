import { describe, expect, it } from 'vitest'
import { artworkGrid, renderSurface, stageFold, surfacePoint } from './artworkSurface'

describe('original character-field artwork', () => {
  it('bounds rendering resolution on large displays', () => {
    expect(artworkGrid(8000, 4000)).toEqual({ cols: 350, rows: 150 })
  })
  it('renders one deterministic monochrome character field', () => {
    const frame = renderSurface(160, 100, .4, .2)
    expect(frame).toHaveLength(100)
    expect(frame.every(line => line.length === 160)).toBe(true)
    expect(frame.join('')).toMatch(/^[ .,:;=+*o#-]+$/)
    expect(frame.join('').trim().length).toBeGreaterThan(0)
    expect(frame).toEqual(renderSurface(160, 100, .4, .2))
  })
  it('changes projection rather than translating independent decorations', () => {
    expect(renderSurface(160, 100, .4, .2)).not.toEqual(renderSurface(160, 100, .9, .2))
  })
  it('keeps every workflow parameter finite and part of the same surface', () => {
    for (const fold of Object.values(stageFold)) {
      for (const u of [0, .25, .5, .75, 1]) expect(surfacePoint(u, .5, fold).every(Number.isFinite)).toBe(true)
    }
  })
})
