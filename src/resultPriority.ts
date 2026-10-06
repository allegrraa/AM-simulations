export type PerformanceChanges = {
  stress_change_percent: number
  displacement_change_percent: number
  factor_of_safety_change_percent: number
}

// Presentation priority, not an engineering certification or a new solver rule.
export function prioritizeResults(changes: PerformanceChanges, actualSafetyFactor: number) {
  const metrics = [
    { key: 'safety', label: 'Factor of safety', delta: changes.factor_of_safety_change_percent, adverse: changes.factor_of_safety_change_percent < 0 },
    { key: 'displacement', label: 'Displacement', delta: changes.displacement_change_percent, adverse: changes.displacement_change_percent > 0 },
    { key: 'stress', label: 'Maximum stress', delta: changes.stress_change_percent, adverse: changes.stress_change_percent > 0 },
  ] as const
  const changed = (delta: number) => Number.isFinite(delta) && Math.abs(delta) > 1e-8
  const score = (metric: typeof metrics[number]) => {
    if (!changed(metric.delta)) return -1
    if (metric.key === 'safety' && metric.adverse && actualSafetyFactor < 1.5) return Number.MAX_VALUE
    return (metric.adverse ? 1e9 : 0) + Math.abs(metric.delta)
  }
  return {
    title: metrics.some(metric => changed(metric.delta)) ? 'Performance changed.' : 'Performance unchanged.',
    metrics: [...metrics].sort((a, b) => score(b) - score(a)),
  }
}
