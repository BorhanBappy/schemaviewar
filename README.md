# HMS Schema Viewer

Interactive, **module-wise ER diagram** for the HMS EF Core database. Pick a module
(e.g. **PAMS**) and instantly see every table in it plus the tables in other modules
that are connected by a foreign key.

No database connection needed — the whole schema is extracted from the EF Core model
snapshot into a static `schema.json`, then rendered with [React Flow](https://reactflow.dev/).

## What it shows

- **272 tables** across **15 modules** (ACARE, ACC, EMERG, FACILITY, HRM, LIS, OTM,
  PAMS, PCARE, QUEUE, ROUTING, SCM, WBM, DCARE, SYSTEM) with **508 relationships**.
- Each table node lists its columns with type, nullability, 🔑 primary keys and 🔗 foreign keys.
- **Same-module** links are solid, **cross-module** links are dashed.
- Click any table for a detail panel (columns + "references →" and "← referenced by").
- Search any table by name and jump straight to it.

## Run it

```bash
npm install
npm run extract   # regenerate src/schema.json from the EF snapshot (see below)
npm run dev       # open http://localhost:5290
```

## Regenerating the schema

The data comes from the HMS EF Core model snapshot. Re-run the extractor whenever the
schema changes (after a new migration):

```bash
node scripts/extract-schema.mjs "path/to/ApplicationDbContextModelSnapshot.cs"
```

The default path is set inside `scripts/extract-schema.mjs`.

## Stack

React + Vite · React Flow (`@xyflow/react`) · dagre auto-layout · a ~180-line snapshot parser.
