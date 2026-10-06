export type Section = 'overview' | 'design' | 'as-built' | 'comparison' | 'simulation' | 'results'

export interface Project {
  project_id: string
  name: string
  design_model: string | null
  as_built_model: string | null
  scan_sessions: string[]
  status?: string
  materials?: MaterialBundle | Record<string, never>
  simulation_config?: SimulationConfig | null
  last_simulation?: SimulationPayload | null
  analysis_history?: Array<{ question: string; answer: string }>
  design_model_name?: string | null
  as_built_model_name?: string | null
  geometry_metadata?: { design?: GeometryMetadata; as_built?: GeometryMetadata }
  geometry_comparison?: GeometryComparison | null
}

export interface GeometryMetadata {
  source_type: string
  bounding_box: [number, number, number]
  dimensions: { x_mm: number; y_mm: number; z_mm: number }
  centroid: [number, number, number]
  surface_area: number
  volume: number
  vertex_count: number
  face_count: number
  file_path?: string
  remarks: string[]
}

export interface MeshUploadResponse {
  project_id: string
  source_type: string
  filename: string
  geometry_metadata: GeometryMetadata
}

export interface GeometryComparison {
  volume_change_percent: number
  bounding_dimension_changes: Record<'x_mm' | 'y_mm' | 'z_mm', number>
  centroid_shift: Record<'x_mm' | 'y_mm' | 'z_mm', number>
  mean_surface_deviation_mm: number
  max_surface_deviation_mm: number
  rmse_mm: number
  deviation_above_threshold_percent: number
  warnings: string[]
  vertex_deviation: number[] | null
}

export interface MaterialInput {
  material_name: string
  young_modulus_pa: number
  poisson_ratio: number
  density_kg_m3: number
  yield_strength_pa: number
  source?: string
}

export interface MaterialBundle {
  design: MaterialInput
  as_built: MaterialInput
}

export interface SimulationConfig {
  load_magnitude_n: number
  load_direction: [number, number, number]
  load_region: Region
  support_region: Region
  length_unit: 'mm' | 'cm' | 'm'
  simulation_type?: string
}

export interface Region {
  axis: 'x' | 'y' | 'z'
  side: 'min' | 'max'
  percent: number
}

export interface SimulationResult {
  max_displacement_mm: number
  max_stress_mpa: number
  factor_of_safety: number
  max_stress_location?: [number, number, number]
  max_displacement_location?: [number, number, number]
  solver_status: string
  solver_type: string
  node_count?: number
  element_count?: number
  warnings: string[]
  surface_vertex_coordinates?: number[][]
  surface_displacements_mm?: number[][]
}

export interface SimulationPayload {
  design: SimulationResult
  as_built: SimulationResult
  comparison: {
    displacement_change_percent: number
    stress_change_percent: number
    factor_of_safety_change_percent: number
  }
}

export interface ScanRecord {
  scan_id: string
  status: string
  source: string
  images_received: number
  progress: number
  reconstruction_type?: string | null
  point_cloud_id?: string | null
  mesh_id?: string | null
  warnings: string[]
}

export interface AnalysisResponse {
  question: string
  status: string
  answer: string
  engineering_summary: {
    factor_of_safety_design: number
    factor_of_safety_as_built: number
    stress_increase_percent: number
    displacement_increase_percent: number
    warnings: string[]
  }
}
