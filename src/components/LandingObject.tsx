import { useMemo } from 'react'
import { ExtrudeGeometry, Mesh, Path, Shape } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { ModelViewer } from './ModelViewer'

// Original illustrative mounting plate, never submitted as a project or analysis.
export default function LandingObject() {
  const data = useMemo(() => {
    const outline = new Shape()
    outline.moveTo(-44, -24)
    outline.quadraticCurveTo(-58, -24, -52, -10)
    outline.lineTo(-14, 48)
    outline.quadraticCurveTo(0, 66, 14, 48)
    outline.lineTo(52, -10)
    outline.quadraticCurveTo(58, -24, 44, -24)
    outline.closePath()
    for (const [x, y, radius] of [[0, 34, 10], [-32, -9, 10], [32, -9, 10], [0, 4, 13]]) {
      const hole = new Path()
      hole.absarc(x, y, radius, 0, Math.PI * 2, false)
      outline.holes.push(hole)
    }
    const geometry = new ExtrudeGeometry(outline, { depth: 13, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 4, curveSegments: 48 })
    geometry.rotateX(-Math.PI / 2)
    geometry.rotateY(-Math.PI / 6)
    const mesh = new Mesh(geometry)
    const binary = new STLExporter().parse(mesh, { binary: true })
    geometry.dispose()
    return binary.buffer as ArrayBuffer
  }, [])
  return <ModelViewer data={data} label="ILLUSTRATIVE SPECIMEN / NOT ANALYSIS DATA" accent="#737b7b" initialZoom={1.6} />
}
