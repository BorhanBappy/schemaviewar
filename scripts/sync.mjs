// One command to keep the deployed viewer in sync with the HMS database:
//   npm run sync
// It regenerates schema.json from the EF snapshot, and if anything changed,
// commits and pushes it (Vercel then redeploys automatically).
//
// Run this after every new migration. You never edit schema.json by hand.

import { execSync } from 'node:child_process'

const run = (cmd) => execSync(cmd, { stdio: 'inherit' })
const capture = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()

// 1. Regenerate schema.json from the EF Core snapshot.
run('node scripts/extract-schema.mjs')

// 2. Did it actually change?
const changed = capture('git status --porcelain src/schema.json')
if (!changed) {
  console.log('\n✓ schema.json is already up to date — nothing to commit.')
  process.exit(0)
}

// 3. Commit + push just the schema.
run('git add src/schema.json')
run('git commit -m "chore: sync schema from HMS snapshot"')
run('git push')

console.log('\n✓ Schema synced and pushed. Vercel will redeploy in ~1 min.')
