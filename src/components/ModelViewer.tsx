import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type ComponentRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, MOUSE, PerspectiveCamera, Vector3 } from 'three'
import { Box, LoaderCircle, Move, RotateCcw, Plus, Minus } from 'lucide-react'
import { fitCamera, prepareStl, prepareStlPair } from './meshGeometry'

interface ModelViewerProps {
  data?: ArrayBuffer | null
  overlayData?: ArrayBuffer | null
  label: string
  accent?: string
  unitScale?: number
  frameSize?: number
  initialZoom?: number
  loading?: boolean
  error?: string
  displacement?: { coordinates: number[][]; vectors: number[][]; scale?: number }
}

function CameraFit({ revision, radius, panMode, initialZoom, zoom }: { revision: number; radius: number; panMode: boolean; initialZoom: number; zoom: number }) {
  const { camera, size } = useThree()
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  useLayoutEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      fitCamera(camera, size.width / Math.max(size.height, 1), radius)
      // Editorial opening crop only. Reset always restores the complete fitted object.
      camera.zoom = revision === 0 ? initialZoom : 1
      camera.updateProjectionMatrix()
      controls.current?.target.set(0, 0, 0)
      controls.current?.update()
    }
  }, [camera, size.width, size.height, revision, radius, initialZoom])
  useLayoutEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.zoom = (revision === 0 ? initialZoom : 1) * zoom
      camera.updateProjectionMatrix()
    }
  }, [camera, zoom, revision, initialZoom, size.width, size.height, radius])
  // Disabled zoom makes OrbitControls return before preventing the wheel event.
  return <OrbitControls ref={controls} mouseButtons={{ LEFT: panMode ? MOUSE.PAN : MOUSE.ROTATE, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN }} makeDefault enablePan enableZoom={false} enableRotate enableDamping dampingFactor={0.08} minDistance={0.02} maxDistance={1000} />
}

function DisplacementPoints({ coordinates, vectors, scale = 12, center, displayScale }: NonNullable<ModelViewerProps['displacement']> & { center: Vector3; displayScale: number }) {
  const geometry = useMemo(() => {
    const count = Math.min(coordinates.length, vectors.length)
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const magnitudes = vectors.slice(0, count).map(v => Math.hypot(...v))
    const maximum = Math.max(...magnitudes, 1e-12)
    for (let i = 0; i < count; i++) {
      for (let axis = 0; axis < 3; axis++) positions[i * 3 + axis] = (coordinates[i][axis] + vectors[i][axis] * scale - center.getComponent(axis)) * displayScale
      colors.set(new Color().setHSL(0.48 - magnitudes[i] / maximum * 0.45, 0.9, 0.58).toArray(), i * 3)
    }
    const points = new BufferGeometry()
    points.setAttribute('position', new BufferAttribute(positions, 3))
    points.setAttribute('color', new BufferAttribute(colors, 3))
    return points
  }, [coordinates, vectors, scale, center, displayScale])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <points geometry={geometry}><pointsMaterial size={0.009} vertexColors sizeAttenuation /></points>
}

class ViewerBoundary extends Component<{ children: ReactNode }, { error?: string }> {
  state: { error?: string } = {}
  static getDerivedStateFromError(error: Error) { return { error: error.message } }
  componentDidCatch(error: Error) { console.error('Model viewer failed:', error) }
  render() { return this.state.error ? <div role="alert" className="viewer-empty">Model could not be loaded<small>{this.state.error}</small></div> : this.props.children }
}

export function ModelViewer({ data, overlayData, label, accent = '#737b7b', displacement, unitScale = 1, frameSize, initialZoom = 1.25, loading, error }: ModelViewerProps) {
  const [revision, setRevision] = useState(0)
  const [panMode, setPanMode] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [realityColor] = useState(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())
  const parsed = useMemo<{ model?: ReturnType<typeof prepareStl>; overlay?: ReturnType<typeof prepareStl>; error?: string } | null>(() => {
    if (!data) return null
    try { return overlayData ? prepareStlPair(data, overlayData, unitScale) : { model: prepareStl(data, unitScale, frameSize), overlay: undefined } }
    catch (cause) { return { error: cause instanceof Error ? cause.message : String(cause) } }
  }, [data, overlayData, unitScale, frameSize])
  const model = parsed?.model
  const overlay = parsed?.overlay
  const failure = error || parsed?.error
  useEffect(() => { if (failure) console.error(`Model could not be loaded (${label}): ${failure}`) }, [failure, label])
  useEffect(() => () => model?.geometry.dispose(), [model])
  useEffect(() => () => overlay?.geometry.dispose(), [overlay])
  const radius = useMemo(() => {
    let result = 0.5
    if (model && displacement) displacement.coordinates.forEach((point, i) => {
      const v = displacement.vectors[i]
      if (v) result = Math.max(result, new Vector3(...point as [number, number, number]).addScaledVector(new Vector3(...v as [number, number, number]), displacement.scale || 12).sub(model.center).length() * model.displayScale)
    })
    return result
  }, [model, displacement])
  return (
    <div className="model-viewer" aria-label={`${label} model viewer`} data-zoom-level={zoom} data-mesh-status={failure ? 'error' : model ? 'ready' : loading ? 'loading' : 'empty'}>
      <div className="viewer-label"><span className="eyebrow">{label}</span><span className="viewer-hint">Drag: {panMode ? 'pan' : 'orbit'} · Scroll: page · + / −: zoom · Right-drag: pan</span></div>
      {failure ? <div className="viewer-empty" role="alert"><strong>Model could not be loaded</strong><small>{failure}</small></div> : model ? (
        <ViewerBoundary key={`${model.geometry.uuid}-${revision}`}>
          <Canvas resize={{ scroll: false, offsetSize: true }} gl={{ alpha: true }} onCreated={({ gl }) => { gl.setClearAlpha(0); gl.domElement.tabIndex = 0; gl.domElement.setAttribute('aria-label', `${label} interactive geometry`); }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} camera={{ position: [4, 3, 5], fov: 40 }} dpr={[1, 1.75]} fallback={<div className="viewer-empty" role="alert">Model could not be loaded: WebGL is unavailable in this browser.</div>}>
            <ambientLight intensity={1.4} />
            <directionalLight position={[4, 7, 6]} intensity={2.5} />
            <directionalLight position={[-5, -2, -4]} intensity={1.2} />
            <mesh geometry={model.geometry}><meshStandardMaterial color={accent === 'var(--accent)' ? realityColor : accent} roughness={0.42} metalness={0.25} side={DoubleSide} wireframe={Boolean(overlay)} /></mesh>
            {overlay ? <mesh geometry={overlay.geometry}><meshStandardMaterial color={realityColor} roughness={0.4} side={DoubleSide} transparent opacity={0.66} depthWrite={false} /></mesh> : null}
            {displacement ? <DisplacementPoints {...displacement} center={model.center} displayScale={model.displayScale} /> : null}
            <CameraFit revision={revision} radius={radius} panMode={panMode} initialZoom={displacement ? 1 : initialZoom} zoom={zoom} />
          </Canvas>
        </ViewerBoundary>
      ) : <div className="viewer-empty" role="status">{loading ? <LoaderCircle className="spin" size={30} /> : <Box size={36} />}<span>{loading ? `Loading ${label.toLowerCase()} geometry…` : 'Upload an STL to view geometry'}</span></div>}
      <button disabled={!model || Boolean(failure)} className="icon-button viewer-pan" type="button" aria-pressed={panMode} onClick={() => setPanMode(value => !value)} aria-label="Pan model" title="Toggle pan tool"><Move size={16} /></button>
      <button disabled={!model || Boolean(failure) || zoom <= 0.5} className="icon-button viewer-zoom-out" type="button" onClick={() => setZoom(value => Math.max(0.5, value / 1.2))} aria-label="Zoom model out" title="Zoom out"><Minus size={16} /></button>
      <button disabled={!model || Boolean(failure) || zoom >= 3} className="icon-button viewer-zoom-in" type="button" onClick={() => setZoom(value => Math.min(3, value * 1.2))} aria-label="Zoom model in" title="Zoom in"><Plus size={16} /></button>
      <button disabled={!model || Boolean(failure)} className="icon-button viewer-reset" type="button" onClick={() => { setPanMode(false); setZoom(1); setRevision(v => v + 1) }} aria-label="Reset model camera" title="Reset camera"><RotateCcw size={16} /></button>
    </div>
  )
}
