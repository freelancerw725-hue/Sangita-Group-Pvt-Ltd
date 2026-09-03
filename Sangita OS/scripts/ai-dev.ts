#!/usr/bin/env tsx
/**
 * Graph-Aware AI Development CLI
 * Usage: npm run ai-dev "<command>"
 */

import { GraphAwareDevelopmentAgent } from '../src/lib/ai-dev-agent/graph-aware-agent';
import { CommandParser } from '../src/lib/ai-dev-agent/command-parser';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_ANON_KEY');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');

async function main() {
  const command = process.argv[2];

  // Show help
  if (!command || command === '--help' || command === '-h') {
    console.log(CommandParser.getHelp());
    process.exit(0);
  }

  // Special commands
  if (command === 'index' || command === '--index') {
    console.log('💡 To index the project, run: npm run index-graph');
    process.exit(0);
  }

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║        🤖 Graph-Aware AI Development Agent                    ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Parse command
  console.log('📝 Parsing Command...');
  const parsed = CommandParser.parse(command);
  
  if (!CommandParser.validate(parsed)) {
    console.error('❌ Invalid command');
    console.error('   Use --help to see available commands');
    process.exit(1);
  }

  console.log(`✓ Parsed as: ${parsed.request.type}`);
  console.log(`✓ Confidence: ${(parsed.confidence * 100).toFixed(0)}%`);
  if (parsed.request.feature) {
    console.log(`✓ Feature detected: ${parsed.request.feature}`);
  }
  console.log('');

  // Create agent
  const agent = new GraphAwareDevelopmentAgent(
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey,
    projectRoot,
    false // Set to true for dry-run mode
  );

  try {
    // Handle query commands differently
    if (parsed.request.type === 'query') {
      await handleQueryCommand(agent, command);
      return;
    }

    // Execute development request
    const result = await agent.executeDevelopmentRequest(parsed.request);

    // Display results
    console.log('');
    console.log('📊 RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Files Modified: ${result.filesModified.length}`);
    console.log(`Tests Run: ${result.testsRun.length}`);
    console.log(`Tests Passed: ${result.testsPassed ? '✓' : '✗'}`);
    console.log(`Typecheck: ${result.typecheckPassed ? '✓' : '✗'}`);
    console.log(`Graph Updated: ${result.graphUpdated ? '✓' : '✗'}`);

    if (result.errors.length > 0) {
      console.log('');
      console.log('❌ Errors:');
      result.errors.forEach(e => console.log(`   - ${e}`));
    }

    if (result.warnings.length > 0) {
      console.log('');
      console.log('⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`   - ${w}`));
    }

    console.log('');
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('');
    console.error('❌ Fatal Error:', error);
    process.exit(1);
  }
}

async function handleQueryCommand(agent: GraphAwareDevelopmentAgent, command: string) {
  const lowerCommand = command.toLowerCase();

  // "Find what depends on X"
  if (lowerCommand.includes('depends on') || lowerCommand.includes('uses')) {
    const fileMatch = command.match(/depends on (.+?)(?:\?|$)/i) ||
                     command.match(/uses (.+?)(?:\?|$)/i);
    
    if (fileMatch) {
      const filePath = fileMatch[1].trim();
      const result = await agent.findDependents(filePath);

      console.log('');
      console.log('📊 DEPENDENTS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Direct Dependents: ${result.directDependents.length}`);
      result.directDependents.slice(0, 10).forEach(f => console.log(`  - ${f}`));
      if (result.directDependents.length > 10) {
        console.log(`  ... and ${result.directDependents.length - 10} more`);
      }

      console.log('');
      console.log(`Total Dependents: ${result.allDependents.length}`);
      console.log(`Affected Features: ${result.features.join(', ') || 'none'}`);
      console.log('');
      process.exit(0);
    }
  }

  // "Show everything connected to X"
  if (lowerCommand.includes('show') || lowerCommand.includes('connected to')) {
    const featureMatch = command.match(/(?:show|connected to) (.+?)(?:\?|$)/i);
    
    if (featureMatch) {
      const featureInput = featureMatch[1].trim().toLowerCase();
      
      // Map common names to feature IDs
      const featureMap: Record<string, string> = {
        'bulk email': 'bulk-email',
        'bulk mail': 'bulk-email',
        'email': 'bulk-email',
        'keyword': 'keywords',
        'leads': 'leads',
        'crm': 'crm',
        'ai insights': 'ai-insights',
        'tasks': 'tasks',
        'finance': 'finance'
      };

      const feature = featureMap[featureInput] || featureInput;
      const result = await agent.showFeatureConnections(feature);

      console.log('');
      console.log(`📊 FEATURE: ${feature.toUpperCase()}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      console.log(`\nFiles (${result.files.length}):`);
      result.files.slice(0, 15).forEach(f => console.log(`  - ${f}`));
      if (result.files.length > 15) {
        console.log(`  ... and ${result.files.length - 15} more`);
      }

      console.log(`\nAPIs (${result.apis.length}):`);
      result.apis.forEach(f => console.log(`  - ${f}`));

      console.log(`\nComponents (${result.components.length}):`);
      result.components.slice(0, 10).forEach(f => console.log(`  - ${f}`));
      if (result.components.length > 10) {
        console.log(`  ... and ${result.components.length - 10} more`);
      }

      console.log(`\nDatabase Tables (${result.dbTables.length}):`);
      result.dbTables.forEach(t => console.log(`  - ${t}`));

      console.log(`\nDatabase RPCs (${result.dbRPCs.length}):`);
      result.dbRPCs.forEach(r => console.log(`  - ${r}`));

      console.log('');
      process.exit(0);
    }
  }

  // Fallback
  console.log('');
  console.log('❌ Could not parse query command');
  console.log('   Try: "Find what depends on <file>" or "Show everything connected to <feature>"');
  console.log('');
  process.exit(1);
}

main();
