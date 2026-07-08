import dagre from '@dagrejs/dagre'
import { colorForModule } from './palette'

const NODE_WIDTH = 250
const HEADER_H = 50
const ROW_H = 22
const MAX_NODE_H = 470

const nodeHeight = (t) => Math.min(HEADER_H + t.columns.length * ROW_H + 8, MAX_NODE_H)

// Which tables are shown for the current module selection.
//   core    = tables that belong to the selected module
//   related = tables in OTHER modules that share a foreign key with a core table
export function computeVisible(schema, selectedModule, showRelated) {
  const byFull = new Map(schema.tables.map((t) => [t.fullName, t]))
  if (selectedModule === 'ALL') {
    return { core: new Set(schema.tables.map((t) => t.fullName)), related: new Set() }
  }
  const core = new Set(
    schema.tables.filter((t) => t.module === selectedModule).map((t) => t.fullName)
  )
  const related = new Set()
  if (showRelated) {
    for (const e of schema.edges) {
      if (core.has(e.fromFull) && byFull.has(e.toFull) && !core.has(e.toFull)) related.add(e.toFull)
      if (core.has(e.toFull) && byFull.has(e.fromFull) && !core.has(e.fromFull))
        related.add(e.fromFull)
    }
  }
  return { core, related }
}

// Build laid-out React Flow nodes + edges for the current selection.
export function buildGraph(schema, selectedModule, showRelated) {
  const byFull = new Map(schema.tables.map((t) => [t.fullName, t]))
  const { core, related } = computeVisible(schema, selectedModule, showRelated)
  const visible = new Set([...core, ...related])

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 45, ranksep: 110, marginx: 60, marginy: 60 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const full of visible) {
    const t = byFull.get(full)
    g.setNode(full, { width: NODE_WIDTH, height: nodeHeight(t) })
  }
  const edgeList = schema.edges.filter((e) => visible.has(e.fromFull) && visible.has(e.toFull))
  for (const e of edgeList) g.setEdge(e.fromFull, e.toFull)

  dagre.layout(g)

  const nodes = [...visible].map((full) => {
    const t = byFull.get(full)
    const pos = g.node(full)
    return {
      id: full,
      type: 'table',
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - nodeHeight(t) / 2 },
      data: {
        table: t,
        color: colorForModule(t.module),
        isCore: core.has(full),
        isRelated: related.has(full),
      },
    }
  })

  const edges = edgeList.map((e) => {
    const crossModule = e.fromModule !== e.toModule
    return {
      id: e.id,
      source: e.fromFull,
      target: e.toFull,
      label: e.columns.join(', '),
      data: e,
      type: 'smoothstep',
      style: {
        stroke: colorForModule(e.fromModule),
        strokeWidth: crossModule ? 2 : 1.4,
        strokeDasharray: crossModule ? '5 4' : undefined,
        opacity: 0.75,
      },
      labelStyle: { fontSize: 10, fill: '#9fb0c9' },
      labelBgStyle: { fill: '#0b1220', fillOpacity: 0.85 },
      labelBgPadding: [3, 2],
    }
  })

  return { nodes, edges, stats: { core: core.size, related: related.size, edges: edges.length } }
}
