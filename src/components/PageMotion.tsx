import { useEffect } from 'react'
import Lenis from 'lenis'

/** Page motion lives outside React render state and never changes a Three camera. */
export function PageMotion() {
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let lenis: Lenis | undefined
    let frame = 0
    let elements: HTMLElement[] = []
    let page = ''
    const refresh = () => {
      const nextPage = document.querySelector('[aria-current="step"]')?.getAttribute('aria-label') || 'landing'
      if (page && page !== nextPage) lenis?.scrollTo(0, { immediate: true })
      page = nextPage
      elements = Array.from(document.querySelectorAll<HTMLElement>('.model-viewer, .landing-copy h1, .reference-artwork'))
      schedule()
    }
    const paint = () => {
      frame = 0
      if (preference.matches) return
      const height = window.innerHeight
      for (const element of elements) {
        if (element.classList.contains('reference-artwork')) {
          element.style.setProperty('--scroll-y', `${-Math.min(12, window.scrollY * 0.012)}px`)
          continue
        }
        const rect = element.getBoundingClientRect()
        const progress = Math.max(0, Math.min(1, 1 - (rect.top + rect.height / 2) / height))
        const heading = element.tagName === 'H1'
        element.style.setProperty('--scroll-scale', String(heading ? 0.985 + progress * 0.015 : 0.97 + progress * 0.05))
        element.style.setProperty('--scroll-y', `${heading ? (0.5 - progress) * 8 : 0}px`)
      }
    }
    function schedule() {
      if (!frame && !preference.matches) frame = requestAnimationFrame(paint)
    }
    const configure = () => {
      lenis?.destroy()
      lenis = undefined
      cancelAnimationFrame(frame)
      frame = 0
      elements.forEach(element => {
        element.style.removeProperty('--scroll-scale')
        element.style.removeProperty('--scroll-y')
      })
      if (!preference.matches) {
        lenis = new Lenis({
          autoRaf: true,
          lerp: 0.2,
          anchors: true,
          // Preserve native scrolling/editing within form controls.
          prevent: node => node.matches('textarea, select, [contenteditable="true"], [data-native-scroll]'),
        })
        schedule()
      }
    }
    const observer = new MutationObserver(refresh)
    // An intentional click/drag takes priority over any residual scroll inertia.
    const stopInertia = () => lenis?.scrollTo(lenis.actualScroll, { immediate: true })
    observer.observe(document.getElementById('root')!, { childList: true, subtree: true })
    refresh()
    configure()
    preference.addEventListener('change', configure)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('pointerdown', stopInertia, { passive: true })
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', configure)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('pointerdown', stopInertia)
      cancelAnimationFrame(frame)
      lenis?.destroy()
      elements.forEach(element => {
        element.style.removeProperty('--scroll-scale')
        element.style.removeProperty('--scroll-y')
      })
    }
  }, [])
  return null
}
