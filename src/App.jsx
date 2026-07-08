import { useEffect, useMemo, useState, useCallback } from 'react'
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

// Pick a sensible starting module (PAMS if present, else first).
const DEFAULT_MODULE =
  schema.modules.find((m) => m.name === 'PAMS')?.name || schema.modules[0]?.name || 'ALL'

function FlowCanvas({ graph, selectedTableFull, onSelectTable }) {
  const rf = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Reset graph whenever the module / related toggle changes.
  useEffect(() => {
    setNodes(graph.nodes)
    setEdges(graph.edges)
    const raf = requestAnimationFrame(() => rf.fitView({ duration: 400, padding: 0.18 }))
    return () => cancelAnimationFrame(raf)
  }, [graph, setNodes, setEdges, rf])

  // Reflect the selected table (from click or search) onto node highlight + camera.
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
  const [selectedModule, setSelectedModule] = useState(DEFAULT_MODULE)
  const [showRelated, setShowRelated] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTableFull, setSelectedTableFull] = useState(null)

  const graph = useMemo(
    () => buildGraph(schema, selectedModule, showRelated),
    [selectedModule, showRelated]
  )

  const byFull = useMemo(() => new Map(schema.tables.map((t) => [t.fullName, t])), [])
  const selectedTable = selectedTableFull ? byFull.get(selectedTableFull) : null

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return schema.tables
      .filter((t) => t.name.toLowerCase().includes(q) || (t.table || '').toLowerCase().includes(q))
      .slice(0, 40)
  }, [search])

  const pickTable = useCallback((t) => {
    // Jump to the module that owns the table so it becomes visible, then select it.
    setSelectedModule(t.module)
    setSelectedTableFull(t.fullName)
    setSearch('')
  }, [])

  // Jump from a relation link inside the detail panel.
  const jumpTo = useCallback(
    (fullName) => {
      const t = byFull.get(fullName)
      if (t) pickTable(t)
    },
    [byFull, pickTable]
  )

  return (
    <div className="app">
      <Sidebar
        schema={schema}
        selectedModule={selectedModule}
        onSelectModule={(m) => {
          setSelectedModule(m)
          setSelectedTableFull(null)
        }}
        showRelated={showRelated}
        onToggleRelated={() => setShowRelated((v) => !v)}
        search={search}
        onSearch={setSearch}
        searchResults={searchResults}
        onPickTable={pickTable}
        stats={graph.stats}
      />

      <main className="canvas">
        <div className="canvas__topbar">
          <span className="canvas__crumb" style={{ '--mod': colorForModule(selectedModule) }}>
            {selectedModule === 'ALL' ? 'All modules' : `${selectedModule} module`}
          </span>
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
            onSelectTable={setSelectedTableFull}
          />
        </ReactFlowProvider>
      </main>

      {selectedTable && (
        <DetailPanel
          table={selectedTable}
          schema={schema}
          onClose={() => setSelectedTableFull(null)}
          onJump={jumpTo}
        />
      )}
    </div>
  )
}
