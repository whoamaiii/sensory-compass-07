// Temporary cleanup script to remove stray directories with names ending in " src"
// under src/components/profile-sections. Safe for macOS/Windows/Linux.
// Usage (from repo root):
//   npx tsx scripts/cleanupProfileSections.ts
//
// After successful run, you can delete this file.

import { readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Simple logger for script usage
const log = {
  error: (msg: string) => process.stderr.write(`ERROR: ${msg}\n`),
  info: (msg: string) => process.stdout.write(`${msg}\n`)
};

function main() {
  const base = join('src', 'components', 'profile-sections');
  let removed: string[] = [];
  let kept: string[] = [];

  let entries: string[];
  try {
    entries = readdirSync(base, { encoding: 'utf8' });
  } catch (e) {
    log.error(`Base path not found: ${base}`);
    process.exit(1);
  }

  for (const name of entries) {
    const full = join(base, name);
    try {
      const st = statSync(full);
      if (st.isDirectory() && (name.endsWith(' src') || name.includes('AnalyticsSection.tsx src'))) {
        rmSync(full, { recursive: true, force: true });
        removed.push(name);
      } else {
        kept.push(name);
      }
    } catch (e) {
      // ignore individual failures, continue
      kept.push(name + ' (unreadable)');
    }
  }

  log.info('Cleanup complete.');
  if (removed.length) {
    log.info('Removed directories:');
    for (const r of removed) log.info(` - ${r}`);
  } else {
    log.info('No matching stray directories found.');
  }

  log.info('\nRemaining entries in profile-sections:');
  for (const k of kept) log.info(` - ${k}`);
}

main();