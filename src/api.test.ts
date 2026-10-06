import { afterEach, expect, test, vi } from 'vitest'
import { api, ApiError } from './api'

afterEach(() => vi.unstubAllGlobals())

test('project creation sends the existing JSON contract', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({project_id:'p',name:'Demo'})))
  vi.stubGlobal('fetch', fetcher)
  expect((await api.createProject('Demo')).project_id).toBe('p')
  expect(fetcher).toHaveBeenCalledWith('http://localhost:8000/projects', expect.objectContaining({method:'POST',body:'{"name":"Demo"}'}))
})

test('STL uploads use the required multipart file field', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', fetcher)
  await api.uploadAsBuilt('p', new File(['solid specimen'], 'specimen.stl'))
  const [url, options] = fetcher.mock.calls[0]
  expect(url).toBe('http://localhost:8000/projects/p/asbuilt/mesh')
  expect(options.body.get('file').name).toBe('specimen.stl')
})

test('validation failures preserve useful server messages', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({detail:'Watertight solid required'}),{status:422})))
  await expect(api.simulate('p')).rejects.toThrow('Watertight solid required')
})

test('connection failures become actionable errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  await expect(api.createProject('Demo')).rejects.toBeInstanceOf(ApiError)
})

test('both persistent mesh routes return binary data without JSON parsing', async () => {
  const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response(new Uint8Array([1, 2, 3]), {headers:{'Content-Type':'model/stl'}})))
  vi.stubGlobal('fetch', fetcher)
  for (const kind of ['design', 'as-built'] as const) expect(new Uint8Array(await api.downloadMesh('p', kind))).toEqual(new Uint8Array([1, 2, 3]))
  expect(fetcher.mock.calls.map(call => call[0])).toEqual(['http://localhost:8000/projects/p/design/mesh','http://localhost:8000/projects/p/asbuilt/mesh'])
})
