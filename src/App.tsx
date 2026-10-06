import { createContext, lazy, Suspense, useContext, useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  FileAxis3D,
  Gauge,
  GitCompareArrows,
  Hexagon,
  Info,
  Layers3,
  LoaderCircle,
  MessageSquareText,
  Microscope,
  Play,
  ScanLine,
  Settings2,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react'
import { api, ApiError } from './api'
import { Metric } from './components/Metric'
import { ReferenceArtworkLayer } from './components/ReferenceArtworkLayer'
import { UploadZone } from './components/UploadZone'
import { prioritizeResults } from './resultPriority'
import type {
  AnalysisResponse,
  GeometryComparison,
  GeometryMetadata,
  MaterialBundle,
  MeshUploadResponse,
  Project,
  Section,
  SimulationConfig,
  SimulationPayload,
} from './types'

const sections: Array<{ id: Section; label: string; icon: typeof Box }> = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'design', label: 'Design', icon: FileAxis3D },
  { id: 'as-built', label: 'As-Manufactured', icon: ScanLine },
  { id: 'comparison', label: 'Comparison', icon: GitCompareArrows },
  { id: 'simulation', label: 'Simulation', icon: Settings2 },
  { id: 'results', label: 'Results', icon: Gauge },
]

const projectSchema = z.object({ name: z.string().trim().min(1, 'Enter a component or analysis name.') })
type ProjectForm = z.infer<typeof projectSchema>

const materialSchema = z.object({
  design_name: z.string().trim().min(1, 'Required'),
  design_young: z.number().positive(),
  design_poisson: z.number().min(0).max(0.498),
  design_density: z.number().positive(),
  design_yield: z.number().positive(),
  built_name: z.string().trim().min(1, 'Required'),
  built_young: z.number().positive(),
  built_poisson: z.number().min(0).max(0.498),
  built_density: z.number().positive(),
  built_yield: z.number().positive(),
})
type MaterialForm = z.infer<typeof materialSchema>

const simulationSchema = z.object({
  load_magnitude_n: z.number().positive(),
  load_x: z.number(),
  load_y: z.number(),
  load_z: z.number(),
  load_axis: z.enum(['x', 'y', 'z']),
  load_side: z.enum(['min', 'max']),
  load_percent: z.number().positive().max(1),
  support_axis: z.enum(['x', 'y', 'z']),
  support_side: z.enum(['min', 'max']),
  support_percent: z.number().positive().max(1),
  length_unit: z.enum(['mm', 'cm', 'm']),
}).refine((value) => Math.hypot(value.load_x, value.load_y, value.load_z) > 0, {
  message: 'Load direction cannot be zero.',
  path: ['load_x'],
}).refine((value) => !(value.load_axis === value.support_axis && value.load_side === value.support_side && value.load_percent <= value.support_percent), { message: 'Load cannot be entirely inside the fixed support.', path: ['load_percent'] })
type SimulationForm = z.infer<typeof simulationSchema>

const DEFAULT_MATERIALS: MaterialForm = {
  design_name: 'PLA — nominal',
  design_young: 3.5,
  design_poisson: 0.36,
  design_density: 1240,
  design_yield: 50,
  built_name: 'PLA — as manufactured',
  built_young: 2.8,
  built_poisson: 0.36,
  built_density: 1120,
  built_yield: 42,
}

const DEFAULT_SIMULATION: SimulationForm = {
  load_magnitude_n: 100,
  load_x: 0,
  load_y: -1,
  load_z: 0,
  load_axis: 'x',
  load_side: 'max',
  load_percent: 0.1,
  support_axis: 'x',
  support_side: 'min',
  support_percent: 0.1,
  length_unit: 'mm',
}

const ANALYSIS_STAGES = [
  'Preparing geometry',
  'Generating finite-element mesh',
  'Applying boundary conditions',
  'Solving',
  'Comparing design and as-manufactured performance',
]

const ModelViewer = lazy(() => import('./components/ModelViewer').then((module) => ({ default: module.ModelViewer })))
const LandingObject = lazy(() => import('./components/LandingObject'))
type MeshState = { data?: ArrayBuffer; loading: boolean; error?: string }
const MeshContext = createContext<Record<'design' | 'as-built', MeshState>>({ design: { loading: false }, 'as-built': { loading: false } })

function EngineeringViewer({ model, ...props }: React.ComponentProps<typeof ModelViewer> & { model: 'design' | 'as-built' }) {
  const mesh = useContext(MeshContext)[model]
  return (
    <Suspense fallback={<div className="model-viewer"><div className="viewer-empty"><LoaderCircle className="spin" size={28} /><span>Loading 3D workspace</span></div></div>}>
      <ModelViewer {...props} data={mesh.data} loading={mesh.loading} error={mesh.error} />
    </Suspense>
  )
}

function formatNumber(value: number | undefined, digits = 2) {
  if (value === undefined || !Number.isFinite(value)) return '—'
  if (value !== 0 && (Math.abs(value) < 10 ** -digits || Math.abs(value) >= 1e6)) return value.toExponential(2)
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value)
}

function signed(value: number | undefined, digits = 1) {
  if (value === undefined || !Number.isFinite(value)) return '—'
  return `${value > 0 ? '+' : ''}${formatNumber(value, digits)}`
}

function errorMessage(error: unknown, context: string) {
  if (error instanceof ApiError) {
    if (/watertight|open edges/i.test(error.message)) {
      return 'Simulation requires closed, watertight STL solids. The selected model has open edges and cannot be tetrahedralized for FEA.'
    }
    if (/STL|mesh|point cloud/i.test(error.message) && error.status >= 400) {
      return `The geometry could not be processed. ${error.message}`
    }
    return error.message
  }
  return `${context} failed. Check the file and try again.`
}

function readSavedProject(): Project | null {
  try {
    const value = sessionStorage.getItem('am-simulations-project')
    return value ? JSON.parse(value) as Project : null
  } catch {
    return null
  }
}

function StatusDot({ complete, active }: { complete: boolean; active?: boolean }) {
  return <span className={`status-dot${complete ? ' complete' : ''}${active ? ' active' : ''}`}>{complete ? <Check size={11} /> : null}</span>
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <AlertTriangle size={19} />
      <div><strong>Analysis action could not be completed</strong><p>{message}</p></div>
      <button type="button" onClick={onClose} aria-label="Dismiss error"><X size={17} /></button>
    </div>
  )
}

function EmptyGate({ icon: Icon, title, detail, action, onAction }: {
  icon: typeof Box
  title: string
  detail: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="empty-gate">
      <Icon size={34} strokeWidth={1.4} />
      <h2>{title}</h2>
      <p>{detail}</p>
      <button className="button primary" type="button" onClick={onAction}>{action}<ArrowRight size={16} /></button>
    </div>
  )
}

function GeometryStats({ metadata }: { metadata?: GeometryMetadata }) {
  if (!metadata) {
    return <div className="metadata-empty">Geometry metrics will appear after backend validation.</div>
  }
  return (
    <div className="geometry-stats">
      <dl className="geometry-record">
        {(['x_mm', 'y_mm', 'z_mm'] as const).map(axis => <div key={axis}><dt>{axis[0]}</dt><dd>{formatNumber(metadata.dimensions[axis])} <small>stl units</small></dd></div>)}
        <div><dt>volume</dt><dd>{formatNumber(metadata.volume)} <small>units³</small></dd></div>
        <div><dt>surface area</dt><dd>{formatNumber(metadata.surface_area)} <small>units²</small></dd></div>
        <div><dt>vertices / faces</dt><dd>{formatNumber(metadata.vertex_count, 0)} / {formatNumber(metadata.face_count, 0)}</dd></div>
      </dl>
      <p>Parsed STL coordinates. Set physical units in simulation.</p>
    </div>
  )
}

function Landing({ onCreated }: { onCreated: (project: Project) => void }) {
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: 'Lightweight Bracket — Rev A' },
  })
  const create = useMutation({ mutationFn: (name: string) => api.createProject(name) })

  const submit = handleSubmit(async ({ name }) => {
    setError('')
    try {
      onCreated(await create.mutateAsync(name))
    } catch (requestError) {
      setError(errorMessage(requestError, 'Project creation'))
    }
  })

  return (
    <main className="landing-shell">
      <ReferenceArtworkLayer stage="landing" />
      <header className="landing-header">
        <div className="brand"><Hexagon size={24} /><span>AM / SIM</span></div>
        <span className="system-status">LOCAL ENGINEERING WORKSPACE</span>
      </header>
      <section className="landing-grid">
        <div className="landing-object"><Suspense fallback={<span className="eyebrow">Loading specimen…</span>}><LandingObject /></Suspense></div>
        <div className="specimen-index"><span>DESIGN / PHYSICAL REALITY / 2026</span><span>STATIC STRUCTURAL<br />DIGITAL TWIN / 01—05</span></div>
        <div className="landing-copy">
          <div className="eyebrow">DIGITAL TWIN PERFORMANCE ANALYSIS</div>
          <h1><span>Understand what you</span><span>actually manufactured.</span></h1>
          <p>Compare design intent against physical reality<br />and predict the performance impact.</p>
          <form onSubmit={submit} className="new-analysis-form">
            <label htmlFor="project-name">Component / analysis name</label>
            <div className="field-action">
              <input id="project-name" {...register('name')} aria-invalid={Boolean(errors.name)} />
              <button className="button primary" type="submit" disabled={create.isPending}>
                {create.isPending ? <LoaderCircle className="spin" size={18} /> : null}
                Start new analysis <ArrowRight size={18} />
              </button>
            </div>
            {errors.name ? <small className="field-error">{errors.name.message}</small> : null}
          </form>
          {error ? <ErrorBanner message={error} onClose={() => setError('')} /> : null}
        </div>
        <ol className="process-sequence" aria-label="Analysis process">
          {['Design intent', 'Physical reality', 'Simulation', 'Decision'].map((step, index) => <li key={step}><span>0{index + 1}</span><strong>{step}</strong><span aria-hidden="true">{index < 3 ? '↓' : '↗'}</span></li>)}
        </ol>
      </section>
      <footer className="landing-footer">
        <span><Layers3 size={15} /> GEOMETRY</span>
        <span><Microscope size={15} /> MATERIALS</span>
        <span><Activity size={15} /> LINEAR-ELASTIC FEA</span>
        <span><ClipboardCheck size={15} /> DECISION SUPPORT</span>
      </footer>
    </main>
  )
}

interface WorkspaceProps {
  project: Project
  setProject: (project: Project | null) => void
}

function Workspace({ project, setProject }: WorkspaceProps) {
  const [section, setSection] = useState<Section>('design')
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [section])
  const [error, setError] = useState('')
  const [materialsSaved, setMaterialsSaved] = useState(false)
  const [simulation, setSimulation] = useState<SimulationPayload | null>(project.last_simulation || null)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [experimentalOpen, setExperimentalOpen] = useState(false)
  const [scanImages, setScanImages] = useState<File[]>([])
  const [scanWarnings, setScanWarnings] = useState<string[]>([])
  const [savedMaterialVersion, setSavedMaterialVersion] = useState(0)
  const [resultUnitScale, setResultUnitScale] = useState(1)

  const projectQuery = useQuery({
    queryKey: ['project', project.project_id],
    queryFn: () => api.getProject(project.project_id),
    initialData: project,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (projectQuery.data) {
      sessionStorage.setItem('am-simulations-project', JSON.stringify(projectQuery.data))
    }
  }, [projectQuery.data])

  useEffect(() => {
    if (projectQuery.error instanceof ApiError && projectQuery.error.status === 404) {
      sessionStorage.removeItem('am-simulations-project')
      setProject(null)
    }
  }, [projectQuery.error, setProject])

  const serverProject = projectQuery.data || project
  useEffect(() => {
    setSimulation(serverProject.last_simulation || null)
    setResultUnitScale({ mm: 1, cm: 10, m: 1000 }[serverProject.simulation_config?.length_unit || 'mm'])
  }, [serverProject.last_simulation, serverProject.simulation_config?.length_unit])
  const designMesh = useQuery({ queryKey: ['mesh', project.project_id, 'design', serverProject.design_model], queryFn: ({ signal }) => api.downloadMesh(project.project_id, 'design', signal), enabled: Boolean(serverProject.design_model), staleTime: Infinity, retry: 1 })
  const builtMesh = useQuery({ queryKey: ['mesh', project.project_id, 'as-built', serverProject.as_built_model], queryFn: ({ signal }) => api.downloadMesh(project.project_id, 'as-built', signal), enabled: Boolean(serverProject.as_built_model), staleTime: Infinity, retry: 1 })
  const designData = designMesh.data || null
  const asBuiltData = builtMesh.data || null
  const designUpload = serverProject.geometry_metadata?.design ? { project_id: project.project_id, source_type: 'uploaded_stl', filename: serverProject.design_model_name || 'Design STL', geometry_metadata: serverProject.geometry_metadata.design } : null
  const builtUpload = serverProject.geometry_metadata?.as_built?.dimensions ? { project_id: project.project_id, source_type: 'uploaded_mesh', filename: serverProject.as_built_model_name || 'As-manufactured STL', geometry_metadata: serverProject.geometry_metadata.as_built } : null
  const comparison = serverProject.geometry_comparison || null
  const hasDesign = Boolean(designUpload || serverProject.design_model)
  const hasAsBuilt = Boolean(builtUpload || serverProject.as_built_model || asBuiltData)
  const hasComparison = Boolean(comparison)
  const hasResults = Boolean(simulation)

  const designMutation = useMutation({ mutationFn: (file: File) => api.uploadDesign(project.project_id, file) })
  const builtMutation = useMutation({ mutationFn: (file: File) => api.uploadAsBuilt(project.project_id, file) })
  const compareMutation = useMutation({ mutationFn: () => api.compareGeometry(project.project_id) })
  const materialsMutation = useMutation({ mutationFn: (bundle: MaterialBundle) => api.saveMaterials(project.project_id, bundle) })
  const simulationMutation = useMutation({
    mutationFn: async (config: SimulationConfig) => {
      await api.saveSimulationConfig(project.project_id, config)
      return api.simulate(project.project_id)
    },
  })
  const scanMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const scan = await api.createScan(project.project_id)
      await api.uploadScanImages(project.project_id, scan.scan_id, files)
      const completed = await api.completeScan(project.project_id, scan.scan_id)
      const mesh = await api.downloadScanMesh(project.project_id, scan.scan_id)
      return { completed, mesh }
    },
  })


  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [section])

  const allowed: Record<Section, boolean> = {
    overview: true,
    design: true,
    'as-built': hasDesign,
    comparison: hasDesign && hasAsBuilt,
    simulation: hasComparison,
    results: hasResults,
  }

  const uploadDesign = async ([file]: File[]) => {
    if (!file) return
    setError('')
    try {
      await designMutation.mutateAsync(file)
      await projectQuery.refetch()
      setSimulation(null)
      setAnalysis(null)
    } catch (requestError) {
      setError(errorMessage(requestError, 'Design upload'))
    }
  }

  const uploadBuilt = async ([file]: File[]) => {
    if (!file) return
    setError('')
    try {
      await builtMutation.mutateAsync(file)
      await projectQuery.refetch()
      setScanWarnings([])
      setSimulation(null)
      setAnalysis(null)
    } catch (requestError) {
      setError(errorMessage(requestError, 'As-manufactured upload'))
    }
  }

  const runComparison = async () => {
    if (compareMutation.isPending) return
    setError('')
    try {
      await compareMutation.mutateAsync()
      await projectQuery.refetch()
      setSection('comparison')
    } catch (requestError) {
      setError(errorMessage(requestError, 'Geometry comparison'))
    }
  }

  const runScan = async () => {
    if (!scanImages.length || scanMutation.isPending) return
    setError('')
    try {
      const { completed } = await scanMutation.mutateAsync(scanImages)
      await projectQuery.refetch()
      setSimulation(null)
      setAnalysis(null)
      setScanWarnings(completed.warnings || [])
      setExperimentalOpen(false)
    } catch (requestError) {
      setError(errorMessage(requestError, 'Experimental reconstruction'))
    }
  }

  const saveMaterials = async (values: MaterialForm) => {
    const bundle: MaterialBundle = {
      design: {
        material_name: values.design_name,
        young_modulus_pa: values.design_young * 1e9,
        poisson_ratio: values.design_poisson,
        density_kg_m3: values.design_density,
        yield_strength_pa: values.design_yield * 1e6,
        source: 'user_input',
      },
      as_built: {
        material_name: values.built_name,
        young_modulus_pa: values.built_young * 1e9,
        poisson_ratio: values.built_poisson,
        density_kg_m3: values.built_density,
        yield_strength_pa: values.built_yield * 1e6,
        source: 'user_input',
      },
    }
    setError('')
    try {
      await materialsMutation.mutateAsync(bundle)
      await projectQuery.refetch()
      setMaterialsSaved(true)
      setSavedMaterialVersion((version) => version + 1)
      setSimulation(null)
      setAnalysis(null)
    } catch (requestError) {
      setError(errorMessage(requestError, 'Material save'))
    }
  }

  const runSimulation = async (values: SimulationForm) => {
    if (simulationMutation.isPending) return
    const config: SimulationConfig = {
      load_magnitude_n: values.load_magnitude_n,
      load_direction: [values.load_x, values.load_y, values.load_z],
      load_region: { axis: values.load_axis, side: values.load_side, percent: values.load_percent },
      support_region: { axis: values.support_axis, side: values.support_side, percent: values.support_percent },
      length_unit: values.length_unit,
      simulation_type: 'static_structural',
    }
    setError('')
    setSimulation(null)
    setAnalysis(null)
    try {
      const result = await simulationMutation.mutateAsync(config)
      setResultUnitScale({mm:1,cm:10,m:1000}[config.length_unit])
      setSimulation(result)
      await projectQuery.refetch()
      setSection('results')
    } catch (requestError) {
      setError(errorMessage(requestError, 'Simulation'))
    }
  }

  return (
    <MeshContext.Provider value={{ design: { data: designMesh.data, loading: designMesh.isFetching, error: designMesh.error?.message }, 'as-built': { data: builtMesh.data, loading: builtMesh.isFetching, error: builtMesh.error?.message } }}>
    <div className="app-shell">
      <ReferenceArtworkLayer stage={section === 'as-built' ? 'reality' : section === 'comparison' ? 'compare' : section === 'results' ? 'result' : section === 'simulation' ? 'simulation' : 'design'} />
      <div className="workspace">
        <header className="workspace-header">
          <div className="workspace-masthead">
            <button className="brand text-action" onClick={() => setSection('overview')} aria-label="Analysis overview">■ am / sim</button>
            <div className="project-identity"><strong>{serverProject.name}</strong><small>analysis / {serverProject.project_id.slice(0, 8)}</small></div>
            <button className="text-action" onClick={() => { sessionStorage.removeItem('am-simulations-project'); setProject(null) }}>New analysis ↗</button>
          </div>
          <nav className="workflow-index" aria-label="Analysis sections">
            {sections.filter(({id}) => id !== 'overview').map(({id, label}, index) => {
              const complete = [hasDesign, hasAsBuilt, hasComparison, hasResults, hasResults][index]
              return <button key={id} disabled={!allowed[id]} aria-label={label} aria-current={section === id ? 'step' : undefined} className={section === id ? 'active' : ''} onClick={() => setSection(id)} title={allowed[id] ? label : 'Complete the previous analysis step first'}><span className="nav-number">0{index + 1}</span><span>{['design', 'reality', 'compare', 'simulation', 'result'][index]}</span><span className="nav-state">{complete ? '✓' : '—'}</span></button>
            })}
          </nav>
        </header>
        {error ? <ErrorBanner message={error} onClose={() => setError('')} /> : null}
        <main className="content">
          {section === 'overview' ? (
            <Overview
              name={serverProject.name}
              hasDesign={hasDesign}
              hasAsBuilt={hasAsBuilt}
              hasComparison={hasComparison}
              hasResults={hasResults}
              onContinue={() => setSection(!hasDesign ? 'design' : !hasAsBuilt ? 'as-built' : !hasComparison ? 'comparison' : !hasResults ? 'simulation' : 'results')}
            />
          ) : null}
          {section === 'design' ? (
            <GeometryScreen
              kind="design"
              title="Original design"
              description="Upload the nominal STL used to manufacture this component. The backend extracts geometry and validates the mesh structure."
              data={designData}
              metadata={designUpload?.geometry_metadata}
              filename={designUpload?.filename}
              busy={designMutation.isPending}
              onUpload={uploadDesign}
              onContinue={() => setSection('as-built')}
              canContinue={hasDesign}
            />
          ) : null}
          {section === 'as-built' ? (
            <AsBuiltScreen
              data={asBuiltData}
              upload={builtUpload}
              busy={builtMutation.isPending}
              scanBusy={scanMutation.isPending}
              scanWarnings={scanWarnings}
              experimentalOpen={experimentalOpen}
              scanImages={scanImages}
              onUpload={uploadBuilt}
              onToggleExperimental={() => setExperimentalOpen((open) => !open)}
              onSelectImages={setScanImages}
              onRunScan={runScan}
              onCompare={runComparison}
              canCompare={hasAsBuilt && !builtMutation.isPending && !scanMutation.isPending}
              compareBusy={compareMutation.isPending}
            />
          ) : null}
          {section === 'comparison' ? (
            hasComparison && comparison ? (
              <ComparisonScreen
                designData={designData}
                asBuiltData={asBuiltData}
                comparison={comparison}
                designMetadata={designUpload?.geometry_metadata}
                builtMetadata={builtUpload?.geometry_metadata}
                onContinue={() => setSection('simulation')}
              />
            ) : (
              <EmptyGate icon={GitCompareArrows} title="Geometry comparison is ready to run" detail="Both design and as-manufactured models are available. Run the backend comparison to quantify the differences." action="Run geometry comparison" onAction={runComparison} />
            )
          ) : null}
          <div hidden={section !== 'simulation'}>
            <SimulationScreen
              savedMaterialVersion={savedMaterialVersion}
              materialsSaved={materialsSaved}
              materialsBusy={materialsMutation.isPending}
              simulationBusy={simulationMutation.isPending}
              visible={section === 'simulation'}
              onSaveMaterials={saveMaterials}
              onRunSimulation={runSimulation}
            />
          </div>
          {section === 'results' && simulation ? (
            <ResultsScreen
              unitScale={resultUnitScale}
              result={simulation}
              designData={designData}
              asBuiltData={asBuiltData}
              analysis={analysis}
              projectId={project.project_id}
              onAnalysis={setAnalysis}
              onReviewSetup={() => setSection('simulation')}
              onError={(value) => setError(errorMessage(value, 'Engineering summary'))}
            />
          ) : null}
        </main>
      </div>
    </div>
    </MeshContext.Provider>
  )
}

function Overview({ name, hasDesign, hasAsBuilt, hasComparison, hasResults, onContinue }: {
  name: string
  hasDesign: boolean
  hasAsBuilt: boolean
  hasComparison: boolean
  hasResults: boolean
  onContinue: () => void
}) {
  const steps = [
    { title: 'Design baseline', detail: 'Nominal STL and geometry', complete: hasDesign, icon: FileAxis3D },
    { title: 'Physical reality', detail: 'As-manufactured STL', complete: hasAsBuilt, icon: ScanLine },
    { title: 'Geometry delta', detail: 'Dimensional comparison', complete: hasComparison, icon: GitCompareArrows },
    { title: 'Performance', detail: 'Dual FEA comparison', complete: hasResults, icon: Activity },
  ]
  return (
    <section>
      <PageHeading eyebrow="ANALYSIS OVERVIEW" title={name} detail="A direct engineering comparison between nominal intent and manufactured reality." />
      <div className="overview-grid">
        {steps.map(({ title, detail, complete, icon: Icon }, index) => (
          <div className={`overview-step${complete ? ' complete' : ''}`} key={title}>
            <span className="step-index">0{index + 1}</span><Icon size={25} />
            <div><h3>{title}</h3><p>{detail}</p></div>
            <StatusDot complete={complete} />
          </div>
        ))}
      </div>
      <div className="overview-callout">
        <div><span className="eyebrow">NEXT REQUIRED ACTION</span><h2>{!hasDesign ? 'Establish the design baseline' : !hasAsBuilt ? 'Capture the as-manufactured component' : !hasComparison ? 'Quantify geometry differences' : !hasResults ? 'Configure and run simulation' : 'Review the engineering decision'}</h2></div>
        <button className="button primary" type="button" onClick={onContinue}>Continue analysis<ArrowRight size={17} /></button>
      </div>
    </section>
  )
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: React.ReactNode }) {
  const meshes = useContext(MeshContext)
  const [introOpen, setIntroOpen] = useState(true)
  const index = eyebrow.slice(0, 2)
  const projectMeta: Record<string, [string, string]> = {
    '01': ['nominal geometry', meshes.design.data ? 'stl / loaded' : 'awaiting design stl'],
    '02': ['as-manufactured', meshes['as-built'].data ? 'measured geometry / loaded' : 'awaiting measured stl'],
    '03': ['geometry comparison', 'dimensions / volume / centroid'],
    '04': ['static structural', 'material / load / support'],
    '05': ['performance comparison', 'dual solve / complete'],
  }
  const [category, status] = projectMeta[index] || ['analysis overview', 'static structural']
  return (
    <div className="page-heading">
      <div className="publication-title"><h1><button type="button" className="project-intro-toggle" aria-expanded={introOpen} onClick={() => setIntroOpen(!introOpen)}><span className="project-number">{projectMeta[index] ? index : '—'}</span>{title}<span aria-hidden="true">{introOpen ? ' −' : ' +'}</span></button></h1><span className="project-category">{category}</span><span className="project-status">{status}</span></div>
      {introOpen && <p>{detail}</p>}
      {action}
    </div>
  )
}

function GeometryScreen({ kind, title, description, data, metadata, filename, busy, onUpload, canContinue, onContinue }: {
  kind: 'design' | 'as-built'
  title: string
  description: string
  data: ArrayBuffer | null
  metadata?: GeometryMetadata
  filename?: string
  busy: boolean
  onUpload: (files: File[]) => void
  canContinue: boolean
  onContinue: () => void
}) {
  return (
    <section className="geometry-poster design-poster">
      <PageHeading eyebrow={kind === 'design' ? '01 / DESIGN' : '02 / PHYSICAL REALITY'} title={kind === 'design' ? 'Original design' : title} detail={kind === 'design' ? 'Nominal geometry used for manufacturing.' : description} />
      <div className="geometry-layout">
        <EngineeringViewer model="design" data={data} label={filename ? `design / ${filename}` : 'original design'} />
        <aside className="geometry-panel">
          <div><span className="eyebrow">SOURCE GEOMETRY</span><h2>STL model</h2></div>
          <UploadZone title="Drop the design STL here" detail="ASCII or binary STL · Closed solid recommended" accept=".stl,model/stl" busy={busy} complete={canContinue} filename={filename} onSelect={onUpload} />
          <GeometryStats metadata={metadata} />
          <div className="next-step"><p id="design-next">{canContinue ? 'Design validated. Next: add the measured component.' : 'Upload a design STL to continue.'}</p><button className="button primary full" type="button" aria-describedby="design-next" disabled={!canContinue} onClick={onContinue}>Continue to physical reality<ArrowRight size={16} /></button></div>
        </aside>
      </div>
    </section>
  )
}

function AsBuiltScreen({ data, upload, busy, scanBusy, scanWarnings, experimentalOpen, scanImages, onUpload, onToggleExperimental, onSelectImages, onRunScan, onCompare, canCompare, compareBusy }: {
  data: ArrayBuffer | null
  upload: MeshUploadResponse | null
  busy: boolean
  scanBusy: boolean
  scanWarnings: string[]
  experimentalOpen: boolean
  scanImages: File[]
  onUpload: (files: File[]) => void
  onToggleExperimental: () => void
  onSelectImages: (files: File[]) => void
  onRunScan: () => void
  onCompare: () => void
  canCompare: boolean
  compareBusy: boolean
}) {
  return (
    <section className="geometry-poster reality-poster">
      <PageHeading eyebrow="02 / REALITY" title="Physical reality" detail="Measured geometry of the manufactured component." />
      <div className="geometry-layout">
        <EngineeringViewer model="as-built" data={data} label={upload?.filename ? `reality / ${upload.filename}` : 'as-manufactured'} accent="var(--accent)" />
        <aside className="geometry-panel">
          <div><span className="eyebrow">PREFERRED INPUT</span><h2>Measured STL</h2></div>
          <UploadZone title="Drop the as-manufactured STL here" detail="Use a closed, watertight mesh for downstream FEA" accept=".stl,model/stl" busy={busy} complete={canCompare} filename={upload?.filename} onSelect={onUpload} />
          <GeometryStats metadata={upload?.geometry_metadata} />
          {scanWarnings.map((warning) => <div className="warning-note" key={warning}><AlertTriangle size={16} />{warning}</div>)}
          <div className="experimental-card">
            <button type="button" className="experimental-toggle" onClick={onToggleExperimental} aria-expanded={experimentalOpen}>
              <span><Sparkles size={16} /><strong>Experimental reconstruction</strong><small>Generate an approximate surface from photos</small></span>
              <ChevronRight className={experimentalOpen ? 'rotated' : ''} size={17} />
            </button>
            {experimentalOpen ? (
              <div className="experimental-body">
                <div className="warning-note"><AlertTriangle size={16} /> Demo-only pseudo-3D reconstruction. Output is unscaled, open, and unsuitable for FEA.</div>
                <UploadZone title="Select component photos" detail="PNG or JPEG · Multiple viewpoints" accept="image/png,image/jpeg" multiple busy={scanBusy} complete={scanImages.length > 0} filename={scanImages.length ? `${scanImages.length} images selected` : undefined} onSelect={onSelectImages} />
                <button className="button secondary full" type="button" disabled={!scanImages.length || scanBusy} onClick={onRunScan}>
                  {scanBusy ? <LoaderCircle className="spin" size={16} /> : <ScanLine size={16} />}{scanBusy ? 'Reconstructing surface…' : 'Run experimental reconstruction'}
                </button>
              </div>
            ) : null}
          </div>
          <div className="next-step"><p id="reality-next">{canCompare ? 'Both geometries are ready to compare.' : 'Upload an as-manufactured STL to continue.'}</p><button className="button primary full" type="button" aria-describedby="reality-next" disabled={!canCompare || compareBusy} onClick={onCompare}>
            {compareBusy ? <LoaderCircle className="spin" size={16} /> : <GitCompareArrows size={16} />} Compare geometry
            <ArrowRight size={16} />
          </button></div>
        </aside>
      </div>
    </section>
  )
}

function ComparisonScreen({ designData, asBuiltData, comparison, designMetadata, builtMetadata, onContinue }: {
  designData: ArrayBuffer | null
  asBuiltData: ArrayBuffer | null
  comparison: GeometryComparison
  designMetadata?: GeometryMetadata
  builtMetadata?: GeometryMetadata
  onContinue: () => void
}) {
  const [overlay, setOverlay] = useState(false)
  const deviations = comparison.vertex_deviation || []
  const maxDeviation = Math.max(...deviations, 1e-6)
  const frameSize = Math.max(Math.hypot(...(designMetadata?.bounding_box || [])), Math.hypot(...(builtMetadata?.bounding_box || []))) || undefined
  return (
    <section className="comparison-poster">
      <PageHeading eyebrow="03 / COMPARE" title="Design / reality" detail="How manufactured geometry differs from design intent." />
      <div className="view-switch"><div className="view-options" role="group" aria-label="Comparison view"><button type="button" aria-pressed={!overlay} onClick={() => setOverlay(false)}>Split</button><button type="button" aria-pressed={overlay} disabled={!designData || !asBuiltData} onClick={() => setOverlay(true)}>Overlay</button></div><span className="eyebrow">Neutral / design · Orange / reality</span></div>
      {overlay ? <><EngineeringViewer model="design" overlayData={asBuiltData} label="DESIGN + AS-MANUFACTURED" /><p className="technical-note">Neutral wireframe: design · Orange translucent: reality. Original file coordinates preserved; no automatic registration or measured surface-deviation map.</p></> : <div className="dual-viewers">
        <EngineeringViewer model="design" data={designData} frameSize={frameSize} label="DESIGN" />
        <div className="versus-marker">VS</div>
        <EngineeringViewer model="as-built" data={asBuiltData} frameSize={frameSize} label="REALITY" accent="var(--accent)" />
      </div>}
      <div className="panel">
        <div className="table-scroll"><table className="engineering-table"><caption>Measured geometry / STL coordinates (no embedded physical unit)</caption><thead><tr><th scope="col">Property</th><th scope="col">Design</th><th scope="col">Reality</th><th scope="col">Δ</th></tr></thead><tbody>
          {(['x_mm', 'y_mm', 'z_mm'] as const).map(axis => <tr key={axis}><th scope="row">{axis[0].toUpperCase()} dimension <small>STL units</small></th><td>{formatNumber(designMetadata?.dimensions[axis], 6)}</td><td>{formatNumber(builtMetadata?.dimensions[axis], 6)}</td><td data-changed={Boolean(designMetadata && builtMetadata && builtMetadata.dimensions[axis] !== designMetadata.dimensions[axis])}>{signed(designMetadata && builtMetadata ? builtMetadata.dimensions[axis] - designMetadata.dimensions[axis] : undefined, 6)}</td></tr>)}
          {([['Volume', 'volume', 'units³'], ['Surface area', 'surface_area', 'units²']] as const).map(([label, key, unit]) => <tr key={key}><th scope="row">{label} <small>{unit}</small></th><td>{formatNumber(designMetadata?.[key], 4)}</td><td>{formatNumber(builtMetadata?.[key], 4)}</td><td data-changed={Boolean(designMetadata && builtMetadata && builtMetadata[key] !== designMetadata[key])}>{signed(designMetadata && builtMetadata ? builtMetadata[key] - designMetadata[key] : undefined, 4)}</td></tr>)}
        </tbody></table></div>
        <p>{overlay ? 'Overlay preserves the original relative file coordinates.' : 'Same isometric orientation and common scale. Each mesh is centered independently; centroid shift is reported below.'} No surface registration or deviation field is implied.</p>
      </div>
      <details className="experimental-metrics"><summary>Experimental metrics / demo proxies</summary><p>These are not measured surface distances. Do not use them as manufacturing tolerances.</p>
      {comparison.warnings.length ? <div className="warning-stack">{comparison.warnings.map((warning) => <div className="warning-note" key={warning}><AlertTriangle size={17} />{warning}</div>)}</div> : null}
      <div className="comparison-metrics">
        <Metric label="Volume change" value={signed(comparison.volume_change_percent)} unit="%" large tone={Math.abs(comparison.volume_change_percent) > 10 ? 'warning' : 'default'} />
        <Metric label="Mean deviation proxy" value={formatNumber(comparison.mean_surface_deviation_mm)} unit="volume-derived score" large />
        <Metric label="Max deviation proxy" value={formatNumber(comparison.max_surface_deviation_mm)} unit="capped demo score" large />
        <Metric label="RMSE proxy" value={formatNumber(comparison.rmse_mm)} unit="demo score, not distance" large />
        <Metric label="Above threshold" value={formatNumber(comparison.deviation_above_threshold_percent)} unit="%" large />
      </div>
      <div className="panel deviation-profile">
        <div className="panel-title">Synthetic deviation samples</div>
        {deviations.length ? <div className="deviation-bars">{deviations.map((value, index) => <i key={`${value}-${index}`} style={{ height: `${Math.max(4, value / maxDeviation * 100)}%` }} title={`${formatNumber(value, 3)} demo score`} />)}</div> : <p>No sample values returned.</p>}
      </div></details>
      <div className="comparison-detail-grid">
        <div className="panel">
          <div className="panel-title"><span><GitCompareArrows size={17} /> Dimensional change</span><small>Relative change</small></div>
          <div className="axis-comparison">
            {(['x_mm', 'y_mm', 'z_mm'] as const).map((axis) => <Metric key={axis} label={`${axis[0].toUpperCase()} AXIS`} value={signed(comparison.bounding_dimension_changes[axis])} unit="%" />)}
          </div>
        </div>
        <div className="panel">
          <div className="panel-title"><span><CircleDot size={17} /> Centroid shift</span><small>Model coordinates</small></div>
          <div className="axis-comparison">
            {(['x_mm', 'y_mm', 'z_mm'] as const).map((axis) => <Metric key={axis} label={`${axis[0].toUpperCase()} AXIS`} value={signed(comparison.centroid_shift[axis])} unit="STL units" />)}
          </div>
        </div>
      </div>
      <div className="form-actions"><button className="button primary" type="button" onClick={onContinue}>Continue to simulation<ArrowRight size={16} /></button></div>
    </section>
  )
}

function Field({ label, unit, error, children }: { label: string; unit?: string; error?: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}{unit ? <small>{unit}</small> : null}</span>{children}{error ? <em>{error}</em> : null}</label>
}

function MaterialFields({ prefix, register, errors }: {
  prefix: 'design' | 'built'
  register: ReturnType<typeof useForm<MaterialForm>>['register']
  errors: ReturnType<typeof useForm<MaterialForm>>['formState']['errors']
}) {
  return (
    <div className="form-grid">
      <Field label="Material name" error={errors[`${prefix}_name`]?.message}><input {...register(`${prefix}_name`)} /></Field>
      <Field label="Young’s modulus" unit="GPa"><input type="number" step="0.01" {...register(`${prefix}_young`, { valueAsNumber: true })} /></Field>
      <Field label="Poisson ratio" unit="0–0.498"><input type="number" step="0.001" {...register(`${prefix}_poisson`, { valueAsNumber: true })} /></Field>
      <Field label="Density" unit="kg/m³"><input type="number" step="1" {...register(`${prefix}_density`, { valueAsNumber: true })} /></Field>
      <Field label="Yield strength" unit="MPa"><input type="number" step="0.1" {...register(`${prefix}_yield`, { valueAsNumber: true })} /></Field>
    </div>
  )
}

function SimulationScreen({ savedMaterialVersion, materialsSaved, materialsBusy, simulationBusy, visible, onSaveMaterials, onRunSimulation }: {
  savedMaterialVersion: number
  materialsSaved: boolean
  materialsBusy: boolean
  simulationBusy: boolean
  visible: boolean
  onSaveMaterials: (values: MaterialForm) => Promise<void>
  onRunSimulation: (values: SimulationForm) => Promise<void>
}) {
  const materialForm = useForm<MaterialForm>({ resolver: zodResolver(materialSchema), defaultValues: DEFAULT_MATERIALS })
  const simulationForm = useForm<SimulationForm>({ resolver: zodResolver(simulationSchema), defaultValues: DEFAULT_SIMULATION })
  useEffect(() => {
    if (savedMaterialVersion) materialForm.reset(materialForm.getValues())
  }, [savedMaterialVersion, materialForm])
  const ready = materialsSaved && !materialForm.formState.isDirty
  const load = simulationForm.watch()

  if (simulationBusy) {
    return (
      <section className="solver-state">
        <span className="eyebrow">FINITE-ELEMENT ANALYSIS RUNNING</span>
        <h1>Solving both component models</h1>
        <p>The solver is processing both watertight solids. This request runs synchronously and may take a moment.</p>
        <div className="stage-list">
          <p>Solver operations (live progress unavailable):</p>
          {ANALYSIS_STAGES.map((stage, index) => <div key={stage}><span>0{index + 1}</span>{stage}</div>)}
        </div>
      </section>
    )
  }

  return (
    <section className="simulation-poster">
      <PageHeading eyebrow="04 / SIMULATION" title="Simulation setup" detail="Define materials, load and fixed support for both models." />
      <div className="load-poster">
        <div className="load-readout"><span className="eyebrow">Applied load</span><strong>{formatNumber(load.load_magnitude_n, 1)} <small>N</small></strong></div>
        {visible ? <EngineeringViewer model="design" label="EXPERIMENT / NOMINAL GEOMETRY" /> : null}
        <div className="load-captions"><span>DIRECTION [X,Y,Z]<br />[{load.load_x}, {load.load_y}, {load.load_z}]<br />LOAD / {load.load_axis.toUpperCase()} {load.load_side} / {formatNumber(load.load_percent * 100)}%</span><span>FIXED SUPPORT<br />{load.support_axis.toUpperCase()} {load.support_side} / {formatNumber(load.support_percent * 100)}% DEPTH<br />STL UNIT / {load.length_unit}</span><a href="#boundary-spec">Edit boundary conditions ↗</a></div>
        <p className="technical-note">Regions use original model axes. Geometry preview only; no load or support highlights.</p>
      </div>
      <form className="simulation-stack" onSubmit={materialForm.handleSubmit(onSaveMaterials)}>
        <p className="info-note">Prefilled PLA values are examples, not sensor measurements. Edit both materials independently and save before solving.</p>
        <div className="section-bar"><div><span>01</span><h2>Material characterization</h2></div>{materialsSaved ? <span className="saved-state"><Check size={14} /> SAVED</span> : null}</div>
        <div className="material-columns">
          <div className="material-panel"><div className="material-heading"><FileAxis3D size={19} /><div><span>DESIGN MATERIAL</span><strong>Nominal specification</strong></div></div><MaterialFields prefix="design" register={materialForm.register} errors={materialForm.formState.errors} /></div>
          <div className="material-divider"><span>VS</span></div>
          <div className="material-panel built"><div className="material-heading"><Microscope size={19} /><div><span>MEASURED / AS-MANUFACTURED</span><strong>Observed or inferred properties</strong></div></div><MaterialFields prefix="built" register={materialForm.register} errors={materialForm.formState.errors} /></div>
        </div>
        <div className="info-note"><Info size={16} /> As-manufactured properties are entered manually for this MVP. Future sensor integration may populate these measurements directly.</div>
        <div className="form-actions"><button className={`button ${ready ? 'secondary' : 'primary'}`} type="submit" disabled={materialsBusy}>{materialsBusy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{materialsSaved ? 'Update materials' : 'Save material model'}{!ready ? <ArrowRight size={16} /> : null}</button></div>
      </form>

      <form id="boundary-spec" className={`simulation-stack${materialsSaved ? '' : ' is-locked'}`} onSubmit={simulationForm.handleSubmit(onRunSimulation)}>
        <div className="section-bar"><div><span>02</span><h2>Boundary conditions</h2></div>{!materialsSaved ? <small>Save materials to unlock</small> : null}</div>
        {!ready ? <p className="info-note">Save the current material values to enable simulation.</p> : null}
        {Object.keys(materialForm.formState.errors).length ? <p role="alert">Check material inputs: positive finite properties and Poisson ratio from 0 to 0.498 are required.</p> : null}
        <fieldset disabled={!ready}>
          <div className="experiment-layout">
          <div className="boundary-grid">
            <div className="boundary-panel load-panel">
              <div className="boundary-heading"><div className="boundary-icon"><ArrowRight size={20} /></div><div><span>APPLIED LOAD</span><strong>Distributed nodal force</strong></div></div>
              <div className="form-grid three">
                <Field label="Magnitude" unit="N"><input type="number" step="1" {...simulationForm.register('load_magnitude_n', { valueAsNumber: true })} /></Field>
                <Field label="Direction X"><input type="number" step="0.1" {...simulationForm.register('load_x', { valueAsNumber: true })} /></Field>
                <Field label="Direction Y"><input type="number" step="0.1" {...simulationForm.register('load_y', { valueAsNumber: true })} /></Field>
                <Field label="Direction Z"><input type="number" step="0.1" {...simulationForm.register('load_z', { valueAsNumber: true })} /></Field>
                <Field label="Face axis"><select {...simulationForm.register('load_axis')}><option value="x">X axis</option><option value="y">Y axis</option><option value="z">Z axis</option></select></Field>
                <Field label="Face side"><select {...simulationForm.register('load_side')}><option value="max">Maximum face</option><option value="min">Minimum face</option></select></Field>
                <Field label="Region depth" unit="0–1"><input type="number" step="0.01" {...simulationForm.register('load_percent', { valueAsNumber: true })} /></Field>
              </div>
            </div>
            <div className="boundary-panel support-panel">
              <div className="boundary-heading"><div className="boundary-icon"><ShieldAlert size={20} /></div><div><span>FIXED SUPPORT</span><strong>Constrained region</strong></div></div>
              <div className="form-grid three">
                <Field label="Face axis"><select {...simulationForm.register('support_axis')}><option value="x">X axis</option><option value="y">Y axis</option><option value="z">Z axis</option></select></Field>
                <Field label="Face side"><select {...simulationForm.register('support_side')}><option value="min">Minimum face</option><option value="max">Maximum face</option></select></Field>
                <Field label="Region depth" unit="0–1"><input type="number" step="0.01" {...simulationForm.register('support_percent', { valueAsNumber: true })} /></Field>
                <Field label="STL length unit"><select {...simulationForm.register('length_unit')}><option value="mm">Millimetres</option><option value="cm">Centimetres</option><option value="m">Metres</option></select></Field>
              </div>
            </div>
          </div>
          </div>
          {Object.keys(simulationForm.formState.errors).length ? <div className="warning-note"><AlertTriangle size={16} /> Review the boundary values. Magnitude and region depths must be positive, and load direction cannot be zero.</div> : null}
          <div className="run-bar">
            <div><strong>Static structural · dual solve</strong><span>Design and as-manufactured solids will use their respective material models.</span></div>
            <button className="button primary run-button" type="submit"><Play size={17} fill="currentColor" /> Run simulation<ArrowRight size={17} /></button>
          </div>
        </fieldset>
      </form>
    </section>
  )
}

function decisionFrom(result: SimulationPayload) {
  const fos = result.as_built.factor_of_safety
  const stressDelta = result.comparison.stress_change_percent
  if (fos < 1) return { level: 'danger', label: 'HIGH RISK', title: 'Predicted yield under the configured load', detail: 'The as-manufactured factor of safety is below 1.0. Review geometry, material assumptions, and loading before proceeding.' }
  if (fos < 1.5 || stressDelta > 15 || result.as_built.warnings.length > 2) return { level: 'warning', label: 'REVIEW RECOMMENDED', title: 'Manufacturing differences affect the predicted margin', detail: 'The as-manufactured response warrants engineering review before this component is used in the intended condition.' }
  return { level: 'positive', label: 'PASS INDICATION', title: 'Positive margin under the configured load', detail: 'The as-manufactured model remains above the review threshold in this linear-elastic analysis.' }
}

function ResultsScreen({ unitScale, result, designData, asBuiltData, analysis, projectId, onAnalysis, onError, onReviewSetup }: {
  unitScale: number
  result: SimulationPayload
  designData: ArrayBuffer | null
  asBuiltData: ArrayBuffer | null
  analysis: AnalysisResponse | null
  projectId: string
  onAnalysis: (analysis: AnalysisResponse) => void
  onError: (error: unknown) => void
  onReviewSetup: () => void
}) {
  const [showDisplacement, setShowDisplacement] = useState(false)
  const [question, setQuestion] = useState('How does the manufactured component differ from the original design?')
  const ask = useMutation({ mutationFn: (value: string) => api.ask(projectId, value) })
  const decision = decisionFrom(result)
  const priority = prioritizeResults(result.comparison, result.as_built.factor_of_safety)
  const resultValues = {
    safety: [result.design.factor_of_safety, result.as_built.factor_of_safety, ''] as const,
    displacement: [result.design.max_displacement_mm, result.as_built.max_displacement_mm, 'mm'] as const,
    stress: [result.design.max_stress_mpa, result.as_built.max_stress_mpa, 'MPa'] as const,
  }
  const displacement = result.as_built.surface_vertex_coordinates && result.as_built.surface_displacements_mm ? {
    coordinates: result.as_built.surface_vertex_coordinates,
    vectors: result.as_built.surface_displacements_mm,
    scale: 20,
  } : undefined

  const submitQuestion = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!question.trim()) return
    try { onAnalysis(await ask.mutateAsync(question.trim())) } catch (error) { onError(error) }
  }

  return (
    <section className="results-page">
      <PageHeading eyebrow="05 / RESULTS" title={priority.title} detail="Design → reality under identical boundary conditions." />
      <div className={`decision-statement ${decision.level}`}><div><span className="eyebrow">Engineering assessment</span><h2>{decision.label}</h2></div><div><p>{decision.detail}</p><small>Decision support only / not engineering certification</small></div></div>
      <div className="result-priorities">{priority.metrics.map((metric, index) => {
        const [design, actual, unit] = resultValues[metric.key]
        return <div className={`result-change ${index === 0 ? 'leading' : ''}`} key={metric.key}><span className="eyebrow">{metric.label}</span><strong>{formatNumber(design, metric.key === 'displacement' ? 4 : 2)} <span className="value-arrow">→</span> {formatNumber(actual, metric.key === 'displacement' ? 4 : 2)} <small>{unit}</small></strong><span className={metric.adverse ? 'adverse-change' : 'neutral-change'}>{signed(metric.delta)}%</span></div>
      })}</div>
      {displacement ? <div className="view-switch"><span className="eyebrow">Performance study / original geometry</span><button className="text-action" type="button" aria-pressed={showDisplacement} onClick={() => setShowDisplacement(value => !value)}>{showDisplacement ? 'Hide amplified displacement samples ↗' : 'Show amplified displacement samples ↗'}</button></div> : null}
      <div className="results-visuals">
        <div className="result-model"><EngineeringViewer model="design" data={designData} unitScale={unitScale} label="IDEAL DESIGN" /><ResultSummary result={result.design} /></div>
        <div className="result-model"><EngineeringViewer model="as-built" data={asBuiltData} unitScale={unitScale} label="AS-MANUFACTURED COMPONENT" accent="var(--accent)" displacement={showDisplacement ? displacement : undefined} /><ResultSummary result={result.as_built} /></div>
      </div>
      {displacement && showDisplacement ? <div className="legend-note"><div><strong>Displacement sample overlay · 20× visual amplification</strong><small>The actual-model camera fits the amplified samples, so the two views may have different display scales. Point colors represent relative displacement magnitude, not stress.</small></div></div> : null}
      <div className="results-lower-grid">
        <div className="panel solver-details">
          <div className="panel-title"><span><Activity size={17} /> Solver details</span><small>Linear-elastic FEA</small></div>
          <div className="solver-columns">
            {([['Design', result.design], ['As-manufactured', result.as_built]] as const).map(([name, data]) => (
              <div key={name}><strong>{name}</strong><span>{formatNumber(data.node_count, 0)} nodes</span><span>{formatNumber(data.element_count, 0)} elements</span><span>Max stress at {data.max_stress_location?.map((v) => formatNumber(v, 1)).join(', ') || '—'} mm</span><span>Max displacement at {data.max_displacement_location?.map((v) => formatNumber(v, 1)).join(', ') || '—'} mm</span></div>
            ))}
          </div>
          {[...new Set([...result.design.warnings, ...result.as_built.warnings])].map((warning) => <div className="info-note" key={warning}><Info size={15} />{warning}</div>)}
        </div>
        <div className="panel summary-panel">
          <div className="panel-title"><span><MessageSquareText size={17} /> Engineering Summary</span><small>Backend-generated assessment</small></div>
          <form onSubmit={submitQuestion}>
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Engineering question" rows={3} />
            <button className="button secondary" type="submit" disabled={ask.isPending || !question.trim()}>{ask.isPending ? <LoaderCircle className="spin" size={16} /> : <MessageSquareText size={16} />} Generate summary</button>
          </form>
          {analysis ? <div className="analysis-answer"><p>{analysis.answer}</p>{analysis.engineering_summary.warnings.map((warning) => <small key={warning}><AlertTriangle size={13} />{warning}</small>)}</div> : <p className="panel-placeholder">Ask for a concise interpretation of the latest deterministic simulation results.</p>}
        </div>
      </div>
      <div className="next-step"><p>Analysis complete. Review assumptions before using these results.</p><button className="button primary" type="button" onClick={onReviewSetup}>Review simulation setup<ArrowRight size={16} /></button></div>
    </section>
  )
}

function ResultSummary({ result }: { result: SimulationPayload['design'] }) {
  return (
    <div className="result-summary">
      <Metric label="Maximum stress" value={formatNumber(result.max_stress_mpa)} unit="MPa" large />
      <Metric label="Maximum displacement" value={formatNumber(result.max_displacement_mm, 4)} unit="mm" large />
      <Metric label="Factor of safety" value={formatNumber(result.factor_of_safety)} unit="yield based" large tone={result.factor_of_safety < 1 ? 'danger' : result.factor_of_safety < 1.5 ? 'warning' : 'positive'} />
    </div>
  )
}

export default function App() {
  const [project, setProject] = useState<Project | null>(() => readSavedProject())

  const handleCreated = (created: Project) => {
    sessionStorage.setItem('am-simulations-project', JSON.stringify(created))
    setProject(created)
  }

  return project ? <Workspace project={project} setProject={setProject} /> : <Landing onCreated={handleCreated} />
}
