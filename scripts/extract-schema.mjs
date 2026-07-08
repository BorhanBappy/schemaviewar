// Parses an EF Core ModelSnapshot (ApplicationDbContextModelSnapshot.cs) into a
// compact schema.json that the React viewer consumes. No DB connection needed —
// the snapshot is the authoritative source of every table, column and relationship.
//
// Usage:
//   node scripts/extract-schema.mjs                       (uses DEFAULT_SNAPSHOT below)
//   node scripts/extract-schema.mjs "C:\path\to\snapshot.cs"
//
// Re-run whenever the schema changes (after a new migration) to regenerate the JSON.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Snapshot location, in priority order:
//   1. CLI arg:   node scripts/extract-schema.mjs "C:\path\to\snapshot.cs"
//   2. Env var:   HMS_SNAPSHOT=... npm run extract
//   3. Default below (the author's local HMS checkout)
const DEFAULT_SNAPSHOT =
  'd:/Encoders/HMS/HMS.Repository/Migrations/ApplicationDbContextModelSnapshot.cs'

const snapshotPath = process.argv[2] || process.env.HMS_SNAPSHOT || DEFAULT_SNAPSHOT
const outPath = resolve(__dirname, '../src/schema.json')

// Not fatal if the snapshot is absent (e.g. on a CI/Vercel build machine that only
// has this repo) — keep the committed schema.json instead of crashing the build.
if (!existsSync(snapshotPath)) {
  console.warn(`⚠ Snapshot not found at: ${snapshotPath}`)
  console.warn('  Keeping the existing src/schema.json. Pass a path or set HMS_SNAPSHOT to regenerate.')
  process.exit(0)
}

const src = readFileSync(snapshotPath, 'utf8')

// ---- Split the file into entity blocks ---------------------------------------
// Every entity is declared TWICE in a snapshot: first with its Property/Key/Table
// (the definition), later with its HasOne relationships. We merge both by name.
const entityHeader = /modelBuilder\.Entity\("([^"]+)",\s*b\s*=>/g
const headers = []
let m
while ((m = entityHeader.exec(src)) !== null) {
  headers.push({ name: m[1], start: m.index })
}

const blockText = (i) =>
  src.slice(headers[i].start, i + 1 < headers.length ? headers[i + 1].start : src.length)

// ---- Helpers -----------------------------------------------------------------
const moduleOf = (fullName) => {
  const area = fullName.match(/HMS\.Entities\.Areas\.([A-Za-z0-9]+)\./)
  return area ? area[1] : 'SYSTEM'
}
const shortName = (fullName) => fullName.split('.').pop()

// ---- Accumulate --------------------------------------------------------------
const entities = new Map() // fullName -> entity

const getEntity = (fullName) => {
  if (!entities.has(fullName)) {
    entities.set(fullName, {
      fullName,
      name: shortName(fullName),
      module: moduleOf(fullName),
      table: null,
      columns: [],
      columnIndex: new Map(),
      pk: [],
      relations: [],
    })
  }
  return entities.get(fullName)
}

const propRe = /b\.Property<([^>]+)>\("([^"]+)"\)([\s\S]*?);/g
const keyRe = /b\.HasKey\(([^)]*)\)/
const tableRe = /b\.ToTable\("([^"]+)"/
const hasOneRe = /b\.HasOne\("([^"]+)",\s*(?:"([^"]+)")?\)([\s\S]*?);/g

for (let i = 0; i < headers.length; i++) {
  const fullName = headers[i].name
  const text = blockText(i)
  const ent = getEntity(fullName)

  const tbl = text.match(tableRe)
  if (tbl && !ent.table) ent.table = tbl[1]

  const keyM = text.match(keyRe)
  if (keyM && ent.pk.length === 0) {
    ent.pk = [...keyM[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])
  }

  // Properties (columns)
  let pm
  propRe.lastIndex = 0
  while ((pm = propRe.exec(text)) !== null) {
    const clrType = pm[1]
    const colName = pm[2]
    const modifiers = pm[3]
    if (ent.columnIndex.has(colName)) continue
    const sqlType = (modifiers.match(/\.HasColumnType\("([^"]+)"\)/) || [])[1] || ''
    const maxLen = (modifiers.match(/\.HasMaxLength\((\d+)\)/) || [])[1]
    const isRequired = /\.IsRequired\(\)/.test(modifiers)
    const isRefType = clrType === 'string' || clrType === 'byte[]'
    const nullable = clrType.endsWith('?') || (isRefType && !isRequired)
    const col = {
      name: colName,
      clrType,
      sqlType,
      nullable,
      isPK: false,
      isFK: false,
      maxLength: maxLen ? Number(maxLen) : null,
    }
    ent.columns.push(col)
    ent.columnIndex.set(colName, col)
  }

  // Relationships (foreign keys)
  let rm
  hasOneRe.lastIndex = 0
  while ((rm = hasOneRe.exec(text)) !== null) {
    const toFull = rm[1]
    const nav = rm[2] || null
    const body = rm[3]
    const fkM = body.match(/\.HasForeignKey(?:<[^>]+>)?\(([^)]*)\)/)
    const columns = fkM ? [...fkM[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : []
    ent.relations.push({
      toFull,
      toName: shortName(toFull),
      toModule: moduleOf(toFull),
      columns,
      nav,
    })
  }
}

// ---- Mark PK / FK on columns -------------------------------------------------
for (const ent of entities.values()) {
  for (const pk of ent.pk) {
    const c = ent.columnIndex.get(pk)
    if (c) c.isPK = true
  }
  for (const rel of ent.relations) {
    for (const fk of rel.columns) {
      const c = ent.columnIndex.get(fk)
      if (c) c.isFK = true
    }
  }
}

// ---- Reclassify RBAC out of SYSTEM -------------------------------------------
// RBAC entities live in HMS.Entities (not under Areas), so they default to SYSTEM.
// They all share the rbac_ table prefix — carve them into their own RBAC module.
for (const ent of entities.values()) {
  if (ent.module === 'SYSTEM' && ent.table && ent.table.startsWith('rbac_')) {
    ent.module = 'RBAC'
  }
}
// Now that modules are final, fix each relation's target module.
const moduleByFull = new Map([...entities.values()].map((e) => [e.fullName, e.module]))
for (const ent of entities.values()) {
  for (const rel of ent.relations) {
    rel.toModule = moduleByFull.get(rel.toFull) || moduleOf(rel.toFull)
  }
}

// ---- Build output ------------------------------------------------------------
const moduleCounts = new Map()
const tables = []
for (const ent of entities.values()) {
  const { columnIndex, ...rest } = ent
  tables.push(rest)
  moduleCounts.set(ent.module, (moduleCounts.get(ent.module) || 0) + 1)
}

const edges = []
for (const ent of entities.values()) {
  ent.relations.forEach((rel, idx) => {
    edges.push({
      id: `${ent.fullName}->${rel.toFull}#${idx}`,
      fromFull: ent.fullName,
      from: ent.name,
      fromModule: ent.module,
      toFull: rel.toFull,
      to: rel.toName,
      toModule: rel.toModule,
      columns: rel.columns,
    })
  })
}

const modules = [...moduleCounts.entries()]
  .map(([name, tableCount]) => ({ name, tableCount }))
  .sort((a, b) => (a.name === 'SYSTEM' ? 1 : b.name === 'SYSTEM' ? -1 : a.name.localeCompare(b.name)))

const schema = {
  generatedFrom: snapshotPath,
  totals: { tables: tables.length, modules: modules.length, relations: edges.length },
  modules,
  tables: tables.sort((a, b) => a.name.localeCompare(b.name)),
  edges,
}

writeFileSync(outPath, JSON.stringify(schema, null, 2))
console.log(`✓ Wrote ${outPath}`)
console.log(
  `  ${schema.totals.tables} tables  |  ${schema.totals.modules} modules  |  ${schema.totals.relations} relations`
)
console.log('  modules: ' + modules.map((x) => `${x.name}(${x.tableCount})`).join('  '))
