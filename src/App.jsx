import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import schema from './schema.json'
import { buildGraph } from './lib/graph'
import { colorForModule } from './lib/palette'
import TableNode from './components/TableNode'
import Sidebar from './components/Sidebar'
import DetailPanel from './components/DetailPanel'

const nodeTypes = { table: TableNode }

const DEFAULT_MODULE =
  schema.modules.find((m) => m.name === 'PAMS')?.name || schema.modules[0]?.name || 'ALL'

// Each rotate click turns the layout 90°.
const ROTATE_ORDER = ['LR', 'TB', 'RL', 'BT']
const DIR_LABEL = { LR: 'Left → Right', TB: 'Top → Bottom', RL: 'Right → Left', BT: 'Bottom → Top' }

function FlowCanvas({ graph, selectedTableFull, onSelectTable, fitSignal }) {
  const rf = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // When the sidebar shows/hides the canvas resizes — React Flow does not auto-fit
  // on resize, so nodes would end up off-screen. Re-fit once the layout settles.
  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ duration: 300, padding: 0.18 }), 90)
    return () => clearTimeout(t)
  }, [fitSignal, rf])

  // Reset graph when the module / related toggle changes. Fit the whole view
  // unless a specific table is targeted (the selection effect handles that).
  useEffect(() => {
    setNodes(graph.nodes)
    setEdges(graph.edges)
    if (!selectedTableFull) {
      const raf = requestAnimationFrame(() => rf.fitView({ duration: 400, padding: 0.18 }))
      return () => cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph])

  // Highlight + centre the selected table (from a click, search or shared URL).
  useEffect(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === selectedTableFull })))
    if (selectedTableFull && graph.nodes.some((n) => n.id === selectedTableFull)) {
      rf.fitView({ nodes: [{ id: selectedTableFull }], duration: 500, maxZoom: 1.25, padding: 0.5 })
    }
  }, [selectedTableFull, graph, setNodes, rf])

  const onNodeClick = useCallback((_, node) => onSelectTable(node.id), [onSelectTable])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      minZoom={0.08}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      fitView
    >
      <Background color="#1e293b" gap={22} />
      <Controls />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => n.data?.color || '#64748b'}
        maskColor="rgba(2,6,23,0.7)"
        style={{ background: '#0b1220' }}
      />
    </ReactFlow>
  )
}

export default function App() {
  const { module: routeModule } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const selectedModule = routeModule || DEFAULT_MODULE
  const showRelated = searchParams.get('related') !== '0'
  const tParam = searchParams.get('t')

  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showAudit, setShowAudit] = useState(false)
  const [direction, setDirection] = useState('LR')
  const rotate = useCallback(
    () => setDirection((d) => ROTATE_ORDER[(ROTATE_ORDER.indexOf(d) + 1) % ROTATE_ORDER.length]),
    []
  )

  const byFull = useMemo(() => new Map(schema.tables.map((t) => [t.fullName, t])), [])

  // Resolve ?t=<shortName> to a full entity name — prefer the current module,
  // then fall back to a global match (for related tables from other modules).
  const selectedTableFull = useMemo(() => {
    if (!tParam) return null
    const inModule = schema.tables.find((t) => t.name === tParam && t.module === selectedModule)
    if (inModule) return inModule.fullName
    const anywhere = schema.tables.find((t) => t.name === tParam)
    return anywhere ? anywhere.fullName : null
  }, [tParam, selectedModule])
  const selectedTable = selectedTableFull ? byFull.get(selectedTableFull) : null

  const graph = useMemo(
    () => buildGraph(schema, selectedModule, showRelated, direction, showAudit),
    [selectedModule, showRelated, direction, showAudit]
  )

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return schema.tables
      .filter((t) => t.name.toLowerCase().includes(q) || (t.table || '').toLowerCase().includes(q))
      .slice(0, 40)
  }, [search])

  // ---- URL navigation helpers ----
  const urlFor = useCallback(
    (module, tName, related) => {
      const qs = new URLSearchParams()
      if (tName) qs.set('t', tName)
      if (!related) qs.set('related', '0')
      const s = qs.toString()
      return `/m/${module}${s ? `?${s}` : ''}`
    },
    []
  )

  const selectModule = useCallback(
    (m) => navigate(urlFor(m, null, showRelated)),
    [navigate, urlFor, showRelated]
  )
  const toggleRelated = useCallback(
    () => navigate(urlFor(selectedModule, tParam, !showRelated)),
    [navigate, urlFor, selectedModule, tParam, showRelated]
  )
  // Click a node in the current view: open its detail, keep the module scope.
  const selectTableInView = useCallback(
    (fullName) => {
      const t = byFull.get(fullName)
      if (t) navigate(urlFor(selectedModule, t.name, showRelated))
    },
    [byFull, navigate, urlFor, selectedModule, showRelated]
  )
  // Pick from search / jump from a relation link: switch to the table's own module.
  const jumpToTable = useCallback(
    (t) => {
      navigate(urlFor(t.module, t.name, showRelated))
      setSearch('')
    },
    [navigate, urlFor, showRelated]
  )
  const jumpToFull = useCallback(
    (fullName) => {
      const t = byFull.get(fullName)
      if (t) jumpToTable(t)
    },
    [byFull, jumpToTable]
  )
  const closeDetail = useCallback(
    () => navigate(urlFor(selectedModule, null, showRelated)),
    [navigate, urlFor, selectedModule, showRelated]
  )

  return (
    <div className={`app${sidebarOpen ? '' : ' app--nosidebar'}`}>
      {sidebarOpen ? (
        <Sidebar
          schema={schema}
          selectedModule={selectedModule}
          onSelectModule={selectModule}
          showRelated={showRelated}
          onToggleRelated={toggleRelated}
          search={search}
          onSearch={setSearch}
          searchResults={searchResults}
          onPickTable={jumpToTable}
          stats={graph.stats}
          onCollapse={() => setSidebarOpen(false)}
          showAudit={showAudit}
          onToggleAudit={() => setShowAudit((v) => !v)}
        />
      ) : (
        <button
          className="sidebar-reopen"
          onClick={() => setSidebarOpen(true)}
          title="Show sidebar"
        >
          ☰
        </button>
      )}

      <main className="canvas">
        <div className="canvas__topbar">
          <span className="canvas__crumb" style={{ '--mod': colorForModule(selectedModule) }}>
            {selectedModule === 'ALL' ? 'All modules' : `${selectedModule} module`}
          </span>
          <button className="canvas__rotate" onClick={rotate} title={`Rotate — now ${DIR_LABEL[direction]}`}>
            ⟳ Rotate
          </button>
          <span className="canvas__legend">
            <span className="legend__item">
              <span className="legend__swatch legend__swatch--solid" /> same-module link
            </span>
            <span className="legend__item">
              <span className="legend__swatch legend__swatch--dashed" /> cross-module link
            </span>
            <span className="legend__item">🔑 primary key</span>
            <span className="legend__item">🔗 foreign key</span>
          </span>
        </div>
        <ReactFlowProvider>
          <FlowCanvas
            graph={graph}
            selectedTableFull={selectedTableFull}
            onSelectTable={selectTableInView}
            fitSignal={sidebarOpen}
          />
        </ReactFlowProvider>
      </main>

      {selectedTable && (
        <DetailPanel
          table={selectedTable}
          schema={schema}
          onClose={closeDetail}
          onJump={jumpToFull}
          showAudit={showAudit}
        />
      )}
    </div>
  )
}
