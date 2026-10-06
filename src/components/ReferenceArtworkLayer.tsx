import { memo, useEffect, useRef } from 'react'
import { artworkGrid, renderSurface, stageFold, type ArtworkStage } from './artworkSurface'
import './reference-artwork.css'

// Preserve the decorative motion phase when landing/workspace mounts change.
let resumeAngle = .45

export const ReferenceArtworkLayer = memo(function ReferenceArtworkLayer({ stage }: { stage: ArtworkStage }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const target = useRef(stageFold[stage])
  const refreshStatic = useRef(() => {})
  useEffect(() => { target.current = stageFold[stage]; refreshStatic.current() }, [stage])
  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d', { alpha: true })
    if (!element || !context) return
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0, last = 0, angle = resumeAngle, fold = target.current
    let width = 1, height = 1
    const draw = () => {
      const { cols, rows } = artworkGrid(width, height)
      const lines = renderSurface(cols, rows, angle, fold)
      context.clearRect(0, 0, width, height)
      context.fillStyle = '#adadad'
      context.font = '10px "Courier New", monospace'
      context.textBaseline = 'top'
      const offsetX = (width - cols * 5) / 2
      const offsetY = (height - rows * 10) / 2
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const glyph = lines[row][col]
          if (glyph !== ' ') context.fillText(glyph, offsetX + col * 5, offsetY + row * 10)
        }
      }
    }
    const tick = (now: number) => {
      if (now - last >= 45) {
        const dt = Math.min((now - (last || now)) / 1000, .15)
        last = now
        angle += dt * .028
        fold += (target.current - fold) * (1 - Math.exp(-dt * 3))
        draw()
      }
      frame = requestAnimationFrame(tick)
    }
    const start = () => {
      cancelAnimationFrame(frame)
      last = 0
      if (document.hidden) return
      if (motion.matches) { fold = target.current; draw() }
      else frame = requestAnimationFrame(tick)
    }
    refreshStatic.current = () => { if (motion.matches) { fold = target.current; draw() } }
    const resize = () => {
      width = element.clientWidth
      height = element.clientHeight
      const ratio = Math.min(devicePixelRatio || 1, 2)
      element.width = Math.round(width * ratio)
      element.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      draw()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    resize()
    start()
    motion.addEventListener('change', start)
    document.addEventListener('visibilitychange', start)
    return () => {
      resumeAngle = angle
      refreshStatic.current = () => {}
      cancelAnimationFrame(frame)
      observer.disconnect()
      motion.removeEventListener('change', start)
      document.removeEventListener('visibilitychange', start)
    }
  }, [])
  return <div className="reference-artwork" aria-hidden="true" data-stage={stage}><canvas ref={canvas} /></div>
})
