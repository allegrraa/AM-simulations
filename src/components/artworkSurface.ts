// Original abstract folded surface. Decorative only; never reads engineering data.
export type ArtworkStage = 'landing' | 'design' | 'reality' | 'compare' | 'simulation' | 'result'
export const stageFold: Record<ArtworkStage, number> = { landing: 0, design: .12, reality: .32, compare: .48, simulation: .66, result: .82 }

export function surfacePoint(u: number, v: number, fold: number): [number, number, number] {
  const envelope = Math.pow(Math.max(0, Math.sin(Math.PI * u)), .65)
  const width = .025 + envelope * (.24 + .56 * Math.pow(Math.cos(2 * Math.PI * u), 2)) * (.86 + .18 * Math.sin(Math.PI * u + .6))
  const twist = u * Math.PI * (2.2 + fold * .22) + .45
  return [
    .24 * Math.sin(2 * Math.PI * u) + v * width * Math.cos(twist),
    (u - .5) * 2.8 + .13 * Math.sin(v * Math.PI) * envelope,
    .18 * Math.cos(2 * Math.PI * u) + v * width * Math.sin(twist) + .22 * Math.sin(v * Math.PI) * envelope,
  ]
}

export function artworkGrid(width: number, height: number) {
  return { cols: Math.max(1, Math.min(350, Math.ceil(width / 5))), rows: Math.max(1, Math.min(150, Math.ceil(height / 10))) }
}

export function renderSurface(cols: number, rows: number, angle: number, fold: number): string[] {
  const depths = new Float32Array(cols * rows).fill(-Infinity)
  const values = new Uint8Array(cols * rows)
  const ramp = ' .,:;-=+*o#'
  const cy = Math.cos(angle), sy = Math.sin(angle)
  const tilt = .16 + .38 * Math.sin(angle * .7)
  const ct = Math.cos(tilt), st = Math.sin(tilt)
  const scale = rows * .37
  for (let i = 0; i <= 230; i++) {
    const u = i / 230
    for (let j = 0; j <= 90; j++) {
      const v = j / 45 - 1
      // A long aperture makes one open folded form, rather than a solid text slab.
      if (Math.abs(v) < .58 && Math.sin(Math.PI * u) > .22) continue
      if (Math.abs(v) > .78 && (i + j) % 4 === 0) continue
      const p = surfacePoint(u, v, fold)
      const pu = surfacePoint(Math.min(1, u + .003), v, fold)
      const pv = surfacePoint(u, v + .003, fold)
      const ax = pu[0] - p[0], ay = pu[1] - p[1], az = pu[2] - p[2]
      const bx = pv[0] - p[0], by = pv[1] - p[1], bz = pv[2] - p[2]
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx
      const magnitude = Math.hypot(nx, ny, nz) || 1
      const light = Math.pow(Math.abs((nx * cy + nz * sy) * .35 + ny * .25 + (nz * cy - nx * sy) * .8) / magnitude, 1.25)
      const x = p[0] * cy + p[2] * sy
      const z = p[2] * cy - p[0] * sy
      const col = Math.round(cols / 2 + (x * ct - p[1] * st) * scale * 2)
      const row = Math.round(rows / 2 + (p[1] * ct + x * st) * scale)
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue
      const index = row * cols + col
      if (z <= depths[index]) continue
      depths[index] = z
      const grain = ((col * 13 + row * 7) % 5 - 2) * .32
      values[index] = Math.max(1, Math.min(ramp.length - 1, Math.round(light * (ramp.length - 2) + grain) + 1))
    }
  }
  return Array.from({ length: rows }, (_, row) => {
    let line = ''
    for (let col = 0; col < cols; col++) line += ramp[values[row * cols + col]]
    return line
  })
}
