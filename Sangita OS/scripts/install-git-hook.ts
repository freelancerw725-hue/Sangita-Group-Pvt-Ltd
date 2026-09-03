/**
 * Install git post-commit hook for automatic graph syncing
 * Run: npm run install-git-hook
 */

import { GitSync } from '../src/lib/project-graph/git-sync';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PROJECT_ROOT = path.resolve(__dirname, '..');

async function main() {
  console.log('📦 Installing git post-commit hook...\n');

  const gitSync = new GitSync(SUPABASE_URL, SUPABASE_SERVICE_KEY, PROJECT_ROOT);

  try {
    gitSync.installGitHook();
    console.log('\n✅ Git hook installed successfully');
    console.log('The Knowledge Graph will now auto-sync after each commit');
  } catch (error) {
    console.error('\n❌ Installation failed:', error);
    process.exit(1);
  }
}

main();
