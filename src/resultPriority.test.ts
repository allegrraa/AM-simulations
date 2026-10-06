import { describe, expect, it } from 'vitest'
import { prioritizeResults } from './resultPriority'

describe('result hierarchy', () => {
  it('leads with reduced safety margin, not unchanged stress', () => {
    const result = prioritizeResults({ stress_change_percent: 0, displacement_change_percent: 25, factor_of_safety_change_percent: -16 }, 1.34)
    expect(result.title).toBe('Performance changed.')
    expect(result.metrics.map(metric => metric.key)).toEqual(['safety', 'displacement', 'stress'])
  })
  it('otherwise leads with the largest adverse change', () => {
    expect(prioritizeResults({ stress_change_percent: 0, displacement_change_percent: 25, factor_of_safety_change_percent: -10 }, 2).metrics[0].key).toBe('displacement')
  })
  it('does not turn improvements into warnings or lead with zero', () => {
    const result = prioritizeResults({ stress_change_percent: 0, displacement_change_percent: -25, factor_of_safety_change_percent: 16 }, 2)
    expect(result.metrics[0].key).toBe('displacement')
    expect(result.metrics[0].adverse).toBe(false)
  })
  it('handles a genuinely unchanged response', () => {
    expect(prioritizeResults({ stress_change_percent: 0, displacement_change_percent: 0, factor_of_safety_change_percent: 0 }, 2).title).toBe('Performance unchanged.')
  })
})
