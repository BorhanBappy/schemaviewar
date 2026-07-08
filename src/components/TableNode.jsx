import { Handle, Position } from '@xyflow/react'

const prettyType = (c) => c.clrType.replace('?', '')

// Handle sides follow the layout direction so edges enter/leave cleanly when rotated.
const HANDLES = {
  LR: { target: Position.Left, source: Position.Right },
  RL: { target: Position.Right, source: Position.Left },
  TB: { target: Position.Top, source: Position.Bottom },
  BT: { target: Position.Bottom, source: Position.Top },
}

export default function TableNode({ data, selected }) {
  const { table, color, isRelated, showAudit } = data
  const h = HANDLES[data.direction] || HANDLES.LR
  const cols = showAudit ? table.columns : table.columns.filter((c) => !c.isAudit)
  const hiddenAudit = table.columns.length - cols.length
  return (
    <div
      className={`tnode${isRelated ? ' tnode--related' : ''}${selected ? ' tnode--selected' : ''}`}
      style={{ '--mod': color }}
    >
      <Handle type="target" position={h.target} className="thandle" />
      <div className="tnode__head">
        <span className="tnode__name" title={table.name}>
          {table.name}
        </span>
        <span className="tnode__mod">{table.module}</span>
      </div>
      {table.table && <div className="tnode__phys">{table.table}</div>}
      <div className="tnode__cols">
        {cols.map((c) => (
          <div className={`tcol${c.isPK ? ' tcol--pk' : ''}`} key={c.name}>
            <span className="tcol__badge">{c.isPK ? '🔑' : c.isFK ? '🔗' : ''}</span>
            <span className="tcol__name">{c.name}</span>
            <span className="tcol__type" title={c.enumType || undefined}>
              {c.enumType ? (
                <span className="tcol__enum">({c.enumType})</span>
              ) : (
                <>
                  {prettyType(c)}
                  {c.nullable ? '?' : ''}
                </>
              )}
            </span>
          </div>
        ))}
        {cols.length === 0 && <div className="tcol tcol--empty">no columns</div>}
        {hiddenAudit > 0 && <div className="tcol tcol--audit">+{hiddenAudit} audit fields</div>}
      </div>
      <Handle type="source" position={h.source} className="thandle" />
    </div>
  )
}
