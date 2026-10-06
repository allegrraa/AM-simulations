import type { ReactNode } from 'react'

interface MetricProps {
  label: string
  value: ReactNode
  unit?: string
  tone?: 'default' | 'positive' | 'warning' | 'danger'
  large?: boolean
}

export function Metric({ label, value, unit, tone = 'default', large }: MetricProps) {
  return (
    <div className={`metric metric-${tone}${large ? ' metric-large' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {unit ? <small>{unit}</small> : null}
    </div>
  )
}
