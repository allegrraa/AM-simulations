import { afterEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({ effect: undefined as undefined | (() => void | (() => void)), instances: [] as { destroy: ReturnType<typeof vi.fn>; scrollTo: ReturnType<typeof vi.fn>; actualScroll: number }[] }))
vi.mock('react', () => ({ useEffect: (effect: () => void | (() => void)) => { harness.effect = effect } }))
vi.mock('lenis', () => ({ default: class {
  destroy = vi.fn()
  scrollTo = vi.fn()
  actualScroll = 80
  constructor() { harness.instances.push(this) }
} }))
import { PageMotion } from './PageMotion'

afterEach(() => { vi.unstubAllGlobals(); harness.instances.length = 0 })

function mount(reduced: boolean) {
  const media = { matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  const events = new Map<string, () => void>()
  const style = { removeProperty: vi.fn(), setProperty: vi.fn() }
  vi.stubGlobal('window', { matchMedia: () => media, innerHeight: 982, scrollY: 80, addEventListener: (name: string, callback: () => void) => events.set(name, callback), removeEventListener: vi.fn() })
  vi.stubGlobal('document', { querySelector: () => null, querySelectorAll: () => [{ style }], getElementById: () => ({}) })
  vi.stubGlobal('MutationObserver', class { observe = vi.fn(); disconnect = vi.fn() })
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  PageMotion()
  const cleanup = harness.effect?.()
  return { media, events, style, cleanup }
}

describe('page motion accessibility and lifecycle', () => {
  it('never enables inertia or schedules transforms with reduced motion', () => {
    const { cleanup, style } = mount(true)
    expect(harness.instances).toHaveLength(0)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(style.removeProperty).toHaveBeenCalledWith('--scroll-scale')
    cleanup?.()
  })
  it('cancels residual inertia when a user starts an interaction', () => {
    const { events, cleanup } = mount(false)
    events.get('pointerdown')?.()
    expect(harness.instances[0].scrollTo).toHaveBeenCalledWith(80, { immediate: true })
    cleanup?.()
    expect(harness.instances[0].destroy).toHaveBeenCalledOnce()
  })
  it('responds immediately when reduced-motion preference changes', () => {
    const { media, cleanup } = mount(false)
    media.matches = true
    const onChange = media.addEventListener.mock.calls[0][1] as () => void
    onChange()
    expect(harness.instances[0].destroy).toHaveBeenCalledOnce()
    expect(harness.instances).toHaveLength(1)
    cleanup?.()
  })
})
