import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { BoxGeometry, Mesh, PerspectiveCamera, Vector3 } from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { fitCamera, prepareStl, prepareStlPair } from './meshGeometry'

test.each([1e-6, 1, 1e6])('fits all bounding corners for scale %s and offset geometry', scale => {
  const source = new BoxGeometry(60 * scale, 12 * scale, 10 * scale)
  source.translate(100 * scale, -30 * scale, 200 * scale)
  const bytes = new TextEncoder().encode(new STLExporter().parse(new Mesh(source))).buffer
  const { geometry } = prepareStl(bytes)
  const bounds = geometry.boundingBox!
  expect(bounds.getCenter(new Vector3()).length()).toBeLessThan(1e-6)
  for (const aspect of [0.4, 1, 2.5]) {
    const camera = new PerspectiveCamera(40, aspect)
    fitCamera(camera, aspect)
    camera.updateMatrixWorld()
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const projected = new Vector3(x, y, z).project(camera)
      expect(Math.abs(projected.x)).toBeLessThan(1)
      expect(Math.abs(projected.y)).toBeLessThan(1)
      expect(Math.abs(projected.z)).toBeLessThan(1)
    }
  }
  source.dispose()
  geometry.dispose()
})

test('binary demo STLs retain their relative dimensions with common framing', () => {
  const load = (name: string) => { const b = readFileSync(new URL(`../../demo/${name}.stl`, import.meta.url)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }
  const frame = Math.hypot(60, 12, 10)
  const design = prepareStl(load('design'), 1, frame)
  const built = prepareStl(load('as-manufactured'), 1, frame)
  expect(design.displayScale).toBeCloseTo(built.displayScale, 12)
  expect(design.size.toArray()).toEqual([60, 12, 10])
  expect(built.size.toArray()).toEqual([60, 10, 8])
  design.geometry.dispose()
  built.geometry.dispose()
})

test('empty or malformed geometry is rejected', () => {
  expect(() => prepareStl(new TextEncoder().encode('solid empty\nendsolid empty').buffer)).toThrow()
})

test('overlay preserves actual relative offsets instead of independently centering parts', () => {
  const source = new BoxGeometry(2, 2, 2)
  const first = new TextEncoder().encode(new STLExporter().parse(new Mesh(source))).buffer
  source.translate(10, 0, 0)
  const second = new TextEncoder().encode(new STLExporter().parse(new Mesh(source))).buffer
  const { model, overlay } = prepareStlPair(first, second)
  const shift = overlay.geometry.boundingBox!.getCenter(new Vector3()).x - model.geometry.boundingBox!.getCenter(new Vector3()).x
  expect(shift / model.displayScale).toBeCloseTo(10)
  expect(overlay.displayScale).toBe(model.displayScale)
  source.dispose(); model.geometry.dispose(); overlay.geometry.dispose()
})
