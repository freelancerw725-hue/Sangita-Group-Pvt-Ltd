#!/usr/bin/env tsx
/**
 * CLI Script to Index Project Knowledge Graph
 * Usage: npm run index-graph
 */

import { ProjectGraphIndexer } from '../src/lib/project-graph/indexer';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');

async function main() {
  console.log('🧠 Starting Project Knowledge Graph Indexing...\n');
  console.log('Project Root:', projectRoot);
  console.log('Supabase URL:', supabaseUrl);
  console.log('');

  const indexer = new ProjectGraphIndexer(supabaseUrl, supabaseServiceKey, projectRoot);

  const startTime = Date.now();

  try {
    const stats = await indexer.indexProject();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ Indexing Complete!\n');
    console.log('📊 Statistics:');
    console.log(`   Files Scanned:    ${stats.filesScanned}`);
    console.log(`   Nodes Created:    ${stats.nodesCreated}`);
    console.log(`   Nodes Updated:    ${stats.nodesUpdated}`);
    console.log(`   Edges Created:    ${stats.edgesCreated}`);
    console.log(`   Errors:           ${stats.errors.length}`);
    console.log(`   Duration:         ${duration}s`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      stats.errors.slice(0, 10).forEach(err => {
        console.log(`   ${err.file}: ${err.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`   ... and ${stats.errors.length - 10} more`);
      }
    }

    console.log('\n🎯 Next Steps:');
    console.log('   1. View the graph: npm run dev → http://localhost:5173/project-graph');
    console.log('   2. Query the graph: Use /api/project-graph/context API');
    console.log('   3. Auto re-index: File watcher will update on changes');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Indexing failed:', error);
    process.exit(1);
  }
}

main();
