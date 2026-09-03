/**
 * Sync Knowledge Graph with Git changes
 * Run: npm run sync-graph
 */

import { GitSync } from '../src/lib/project-graph/git-sync';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_ROOT = path.resolve(__dirname, '..');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function main() {
  console.log('🔄 Syncing Knowledge Graph with Git...\n');

  const gitSync = new GitSync(SUPABASE_URL, SUPABASE_SERVICE_KEY, PROJECT_ROOT);

  try {
    await gitSync.syncLastCommit();
    console.log('\n✅ Sync completed successfully');
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  }
}

main();
