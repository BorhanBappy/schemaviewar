import { colorForModule } from '../lib/palette'

export default function Sidebar({
  schema,
  selectedModule,
  onSelectModule,
  showRelated,
  onToggleRelated,
  search,
  onSearch,
  searchResults,
  onPickTable,
  stats,
  onCollapse,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brandrow">
          <div className="sidebar__title">HMS Schema Explorer</div>
          <button className="sidebar__collapse" onClick={onCollapse} title="Hide sidebar (full screen)">
            «
          </button>
        </div>
        <div className="sidebar__sub">
          {schema.totals.tables} tables · {schema.totals.modules} modules ·{' '}
          {schema.totals.relations} relations
        </div>
      </div>

      <div className="sidebar__searchwrap">
        <input
          className="sidebar__search"
          placeholder="Search any table…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        {search && (
          <div className="searchlist">
            {searchResults.length === 0 && <div className="searchlist__empty">No match</div>}
            {searchResults.map((t) => (
              <button
                key={t.fullName}
                className="searchlist__item"
                onClick={() => onPickTable(t)}
              >
                <span className="dot" style={{ background: colorForModule(t.module) }} />
                <span className="searchlist__name">{t.name}</span>
                <span className="searchlist__mod">{t.module}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="sidebar__toggle">
        <input type="checkbox" checked={showRelated} onChange={onToggleRelated} />
        Show related tables (other modules)
      </label>

      <div className="sidebar__section">Modules</div>
      <nav className="modlist">
        <button
          className={`modlist__item${selectedModule === 'ALL' ? ' is-active' : ''}`}
          onClick={() => onSelectModule('ALL')}
        >
          <span className="dot dot--all" />
          <span className="modlist__name">All modules</span>
          <span className="modlist__count">{schema.totals.tables}</span>
        </button>
        {schema.modules.map((m) => (
          <button
            key={m.name}
            className={`modlist__item${selectedModule === m.name ? ' is-active' : ''}`}
            onClick={() => onSelectModule(m.name)}
          >
            <span className="dot" style={{ background: colorForModule(m.name) }} />
            <span className="modlist__name">{m.name}</span>
            <span className="modlist__count">{m.tableCount}</span>
          </button>
        ))}
      </nav>

      {selectedModule !== 'ALL' && stats && (
        <div className="sidebar__stats">
          Showing <b>{stats.core}</b> {selectedModule} tables
          {showRelated && stats.related > 0 && (
            <>
              {' '}
              + <b>{stats.related}</b> related
            </>
          )}
          , <b>{stats.edges}</b> links
        </div>
      )}
    </aside>
  )
}
