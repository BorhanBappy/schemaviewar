import { Handle, Position } from '@xyflow/react'

const prettyType = (c) => c.clrType.replace('?', '')

export default function TableNode({ data, selected }) {
  const { table, color, isRelated } = data
  return (
    <div
      className={`tnode${isRelated ? ' tnode--related' : ''}${selected ? ' tnode--selected' : ''}`}
      style={{ '--mod': color }}
    >
      <Handle type="target" position={Position.Left} className="thandle" />
      <div className="tnode__head">
        <span className="tnode__name" title={table.name}>
          {table.name}
        </span>
        <span className="tnode__mod">{table.module}</span>
      </div>
      {table.table && <div className="tnode__phys">{table.table}</div>}
      <div className="tnode__cols">
        {table.columns.map((c) => (
          <div className={`tcol${c.isPK ? ' tcol--pk' : ''}`} key={c.name}>
            <span className="tcol__badge">{c.isPK ? '🔑' : c.isFK ? '🔗' : ''}</span>
            <span className="tcol__name">{c.name}</span>
            <span className="tcol__type">
              {prettyType(c)}
              {c.nullable ? '?' : ''}
            </span>
          </div>
        ))}
        {table.columns.length === 0 && <div className="tcol tcol--empty">no columns parsed</div>}
      </div>
      <Handle type="source" position={Position.Right} className="thandle" />
    </div>
  )
}
