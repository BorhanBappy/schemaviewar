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

## Keeping it in sync (after a new migration)

You **never edit `schema.json` by hand** — it is generated from the HMS EF Core model
snapshot. Whenever the database schema changes, run one command:

```bash
npm run sync
```

That regenerates `src/schema.json` from the snapshot and, if anything changed, commits
and pushes it — Vercel then redeploys automatically. If nothing changed it just says so.

To only regenerate the JSON without committing:

```bash
npm run extract
```

The snapshot location is resolved in this order:

1. CLI arg — `node scripts/extract-schema.mjs "C:\path\to\ApplicationDbContextModelSnapshot.cs"`
2. Env var — `HMS_SNAPSHOT=... npm run extract`
3. The default path baked into `scripts/extract-schema.mjs`

If the snapshot file isn't found, the extractor keeps the existing `schema.json` instead
of failing (so cloud builds that only have this repo still work).

## Stack

React + Vite · React Flow (`@xyflow/react`) · dagre auto-layout · a ~180-line snapshot parser.
