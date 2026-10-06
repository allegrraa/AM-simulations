import type {
  AnalysisResponse,
  GeometryComparison,
  MaterialBundle,
  MeshUploadResponse,
  Project,
  ScanRecord,
  SimulationConfig,
  SimulationPayload,
} from './types'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8000'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function responseFor(path: string, init?: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init)
  } catch {
    throw new ApiError(`Cannot reach the analysis service at ${API_BASE_URL}. Start the FastAPI backend and try again.`, 0)
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body = (await response.json()) as { detail?: string | Array<{ msg?: string }> }
      if (typeof body.detail === 'string') message = body.detail
      if (Array.isArray(body.detail)) message = body.detail.map((item) => item.msg).filter(Boolean).join('. ') || message
    } catch {
      // Keep the safe status message when the server does not return JSON.
    }
    throw new ApiError(message, response.status)
  }

  return response
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return (await responseFor(path, init)).json() as Promise<T>
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const upload = (file: File, field = 'file'): FormData => {
  const data = new FormData()
  data.append(field, file)
  return data
}

export const api = {
  createProject: (name: string) => request<Project>('/projects', json({ name })),
  getProject: (projectId: string) => request<Project>(`/projects/${projectId}`),
  downloadMesh: async (projectId: string, kind: 'design' | 'as-built', signal?: AbortSignal) => {
    const response = await responseFor(`/projects/${projectId}/${kind === 'design' ? 'design' : 'asbuilt'}/mesh`, { signal, cache: 'no-store' })
    const data = await response.arrayBuffer()
    return data
  },
  uploadDesign: (projectId: string, file: File) =>
    request<MeshUploadResponse>(`/projects/${projectId}/design`, { method: 'POST', body: upload(file) }),
  uploadAsBuilt: (projectId: string, file: File) =>
    request<MeshUploadResponse>(`/projects/${projectId}/asbuilt/mesh`, { method: 'POST', body: upload(file) }),
  compareGeometry: (projectId: string) => request<GeometryComparison>(`/projects/${projectId}/compare`, { method: 'POST' }),
  saveMaterials: (projectId: string, materials: MaterialBundle) =>
    request<MaterialBundle>(`/projects/${projectId}/materials`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(materials),
    }),
  saveSimulationConfig: (projectId: string, config: SimulationConfig) =>
    request<SimulationConfig>(`/projects/${projectId}/simulation-config`, json(config)),
  simulate: (projectId: string) => request<SimulationPayload>(`/projects/${projectId}/simulate`, { method: 'POST' }),
  ask: (projectId: string, question: string) => request<AnalysisResponse>(`/projects/${projectId}/ask`, json({ question })),
  createScan: (projectId: string) => request<ScanRecord>(`/projects/${projectId}/scan`, { method: 'POST' }),
  uploadScanImages: async (projectId: string, scanId: string, files: File[]) => {
    const data = new FormData()
    files.forEach((file) => data.append('files', file))
    return request<{ scan_id: string; images_received: number; progress: number }>(
      `/projects/${projectId}/scan/${scanId}/images`,
      { method: 'POST', body: data },
    )
  },
  completeScan: (projectId: string, scanId: string) =>
    request<ScanRecord>(`/projects/${projectId}/scan/${scanId}/complete`, { method: 'POST' }),
  downloadScanMesh: async (projectId: string, scanId: string) => {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/scan/${scanId}/mesh`)
    if (!response.ok) throw new ApiError('The reconstructed mesh could not be downloaded.', response.status)
    return response.arrayBuffer()
  },
}
