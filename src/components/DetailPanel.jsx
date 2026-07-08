import { colorForModule } from '../lib/palette'

export default function DetailPanel({ table, schema, onClose, onJump, showAudit }) {
  if (!table) return null

  const cols = showAudit ? table.columns : table.columns.filter((c) => !c.isAudit)
  const hiddenAudit = table.columns.length - cols.length

  // Outgoing FKs = this table -> other. Incoming = other -> this table.
  const outgoing = table.relations || []
  const incoming = schema.edges.filter((e) => e.toFull === table.fullName)

  return (
    <div className="detail">
      <div className="detail__head" style={{ '--mod': colorForModule(table.module) }}>
        <div>
          <div className="detail__name">{table.name}</div>
          <div className="detail__phys">{table.table || '—'}</div>
        </div>
        <div className="detail__right">
          <span className="detail__modbadge">{table.module}</span>
          <button className="detail__close" onClick={onClose} title="Close">
            ×
          </button>
        </div>
      </div>

      <div className="detail__body">
        <div className="detail__section">
          Columns ({cols.length}
          {hiddenAudit > 0 ? ` · ${hiddenAudit} audit hidden` : ''})
        </div>
        <table className="coltable">
          <tbody>
            {cols.map((c) => (
              <tr key={c.name} className={c.isPK ? 'is-pk' : ''}>
                <td className="coltable__k">{c.isPK ? '🔑' : c.isFK ? '🔗' : ''}</td>
                <td className="coltable__name">{c.name}</td>
                <td className="coltable__type">
                  {c.enumType ? (
                    <span className="coltable__enum">({c.enumType})</span>
                  ) : (
                    <>
                      {c.clrType.replace('?', '')}
                      {c.nullable ? '?' : ''}
                      {c.maxLength ? ` (${c.maxLength})` : ''}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {outgoing.length > 0 && (
          <>
            <div className="detail__section">References → ({outgoing.length})</div>
            <div className="rellist">
              {outgoing.map((r, i) => (
                <button className="rellist__item" key={i} onClick={() => onJump(r.toFull)}>
                  <span className="dot" style={{ background: colorForModule(r.toModule) }} />
                  <span className="rellist__name">{r.toName}</span>
                  <span className="rellist__col">{r.columns.join(', ')}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {incoming.length > 0 && (
          <>
            <div className="detail__section">← Referenced by ({incoming.length})</div>
            <div className="rellist">
              {incoming.map((e, i) => (
                <button className="rellist__item" key={i} onClick={() => onJump(e.fromFull)}>
                  <span className="dot" style={{ background: colorForModule(e.fromModule) }} />
                  <span className="rellist__name">{e.from}</span>
                  <span className="rellist__col">{e.columns.join(', ')}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
