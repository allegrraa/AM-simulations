import { PerspectiveCamera, Vector3 } from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

export function prepareStl(data: ArrayBuffer, unitScale = 1, frameSize?: number) {
  const geometry = new STLLoader().parse(data)
  const positions = geometry.getAttribute('position')
  if (!positions || positions.count < 3 || !Array.from(positions.array).every(Number.isFinite)) {
    geometry.dispose()
    throw new Error('STL contains no valid finite triangles.')
  }
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const center = box.getCenter(new Vector3()).multiplyScalar(unitScale)
  const size = box.getSize(new Vector3()).multiplyScalar(unitScale)
  const diagonal = size.length()
  if (!(diagonal > 0) || !Number.isFinite(diagonal)) {
    geometry.dispose()
    throw new Error('STL has an empty or invalid bounding box.')
  }
  // Normalize display coordinates only. Solver and source geometry are unchanged.
  const displayScale = 1 / Math.max(diagonal, (frameSize || 0) * unitScale)
  geometry.scale(unitScale, unitScale, unitScale)
  geometry.translate(-center.x, -center.y, -center.z)
  geometry.scale(displayScale, displayScale, displayScale)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return { geometry, center, size, displayScale }
}

export function fitCamera(camera: PerspectiveCamera, aspect: number, radius = 0.5) {
  const vertical = camera.fov * Math.PI / 360
  const horizontal = Math.atan(Math.tan(vertical) * Math.max(aspect, 0.01))
  const distance = radius / Math.sin(Math.min(vertical, horizontal)) * 1.25
  camera.position.copy(new Vector3(4, 3, 5).normalize().multiplyScalar(distance))
  camera.near = distance / 1000
  camera.far = distance * 1000
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
  return distance
}

export function prepareStlPair(design: ArrayBuffer, built: ArrayBuffer, unitScale = 1) {
  const first = prepareStl(design, unitScale)
  let second: ReturnType<typeof prepareStl>
  try { second = prepareStl(built, unitScale) } catch (error) { first.geometry.dispose(); throw error }
  const low = first.center.clone().sub(first.size.clone().multiplyScalar(0.5)).min(second.center.clone().sub(second.size.clone().multiplyScalar(0.5)))
  const high = first.center.clone().add(first.size.clone().multiplyScalar(0.5)).max(second.center.clone().add(second.size.clone().multiplyScalar(0.5)))
  const commonCenter = low.clone().add(high).multiplyScalar(0.5)
  const commonScale = 1 / high.clone().sub(low).length()
  for (const model of [first, second]) {
    model.geometry.scale(1 / model.displayScale, 1 / model.displayScale, 1 / model.displayScale)
    const offset = model.center.clone().sub(commonCenter)
    model.geometry.translate(offset.x, offset.y, offset.z)
    model.geometry.scale(commonScale, commonScale, commonScale)
    model.geometry.computeBoundingBox()
    model.geometry.computeBoundingSphere()
    model.center = commonCenter
    model.displayScale = commonScale
  }
  return { model: first, overlay: second }
}
