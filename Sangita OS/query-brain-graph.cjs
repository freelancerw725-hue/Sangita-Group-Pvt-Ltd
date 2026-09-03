#!/usr/bin/env node
/**
 * Brain Graph Query Tool
 * Usage: node query-brain-graph.cjs <command> [args]
 * 
 * Commands:
 *   feature <name>        - List all files for a feature
 *   deps <file>          - List dependencies of a file
 *   reverse-deps <file>  - List files that depend on this file
 *   trace <file>         - Trace full dependency chain
 *   api                  - List all API endpoints
 *   errors               - List files with errors
 *   untested             - List files without tests
 *   stats                - Show graph statistics
 */

const fs = require('fs');
const path = require('path');

const graphPath = path.join(__dirname, 'brain-graph.json');
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));

const command = process.argv[2];
const arg = process.argv[3];

function findNode(query) {
  // Exact match
  if (graph.nodes[query]) return graph.nodes[query];
  
  // Partial match
  const matches = Object.values(graph.nodes).filter(n => 
    n.path.includes(query) || n.name.includes(query)
  );
  
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    console.log('❌ Multiple matches found:');
    matches.forEach(m => console.log('   -', m.path));
    process.exit(1);
  }
  
  console.log('❌ No node found for:', query);
  process.exit(1);
}

function listFeature(featureName) {
  const features = Object.entries(graph.features).filter(([id, f]) => 
    id.includes(featureName.toLowerCase()) || f.name.toLowerCase().includes(featureName.toLowerCase())
  );
  
  if (features.length === 0) {
    console.log('❌ Feature not found:', featureName);
    console.log('Available features:');
    Object.entries(graph.features).forEach(([id, f]) => {
      console.log('  -', id, ':', f.name);
    });
    return;
  }
  
  features.forEach(([id, feature]) => {
    console.log(`\n🎯 ${feature.name} (${id})`);
    console.log(`   Status: ${feature.status}`);
    console.log(`   Files: ${feature.nodes.length}`);
    console.log(`   APIs: ${feature.apis.length}`);
    console.log(`   Components: ${feature.components.length}`);
    
    if (feature.database && feature.database.length) {
      console.log(`   Database: ${feature.database.join(', ')}`);
    }
    
    console.log('\n📄 Files:');
    feature.nodes.forEach(nodeId => {
      const node = graph.nodes[nodeId];
      if (node) {
        console.log(`   - ${node.path} (${node.type})`);
      }
    });
    
    if (feature.apis.length) {
      console.log('\n🔌 APIs:');
      feature.apis.forEach(apiId => {
        const node = graph.nodes[apiId];
        if (node && node.apiEndpoints) {
          node.apiEndpoints.forEach(e => {
            console.log(`   ${e.method} ${e.path}`);
          });
        }
      });
    }
  });
}

function listDependencies(file) {
  const node = findNode(file);
  console.log(`\n📦 Dependencies of ${node.path}:`);
  console.log(`   Type: ${node.type}`);
  console.log(`   Direct dependencies: ${node.dependencies.length}\n`);
  
  const internal = [];
  const external = [];
  
  node.dependencies.forEach(dep => {
    // Try to resolve the dependency
    const depNode = graph.nodes[dep] || 
                    graph.nodes[dep + '.ts'] || 
                    graph.nodes[dep + '.tsx'] ||
                    graph.nodes[dep + '/index.ts'] ||
                    graph.nodes[dep + '/index.tsx'];
    
    if (depNode) {
      internal.push({ dep, node: depNode });
    } else {
      external.push(dep);
    }
  });
  
  if (internal.length) {
    console.log('   Internal:');
    internal.forEach(({ dep, node }) => {
      console.log(`     ✓ ${dep} (${node.type})`);
    });
  }
  
  if (external.length) {
    console.log('\n   External:');
    external.forEach(dep => {
      console.log(`     📦 ${dep}`);
    });
  }
}

function listReverseDependencies(file) {
  const node = findNode(file);
  const reverseDeps = graph.edges.filter(e => e.to === node.id);
  
  console.log(`\n🔙 Reverse Dependencies of ${node.path}:`);
  console.log(`   Files that import this: ${reverseDeps.length}\n`);
  
  reverseDeps.forEach(edge => {
    const sourceNode = graph.nodes[edge.from];
    if (sourceNode) {
      console.log(`   ← ${sourceNode.path} (${sourceNode.type})`);
    }
  });
}

function traceFullChain(file) {
  const node = findNode(file);
  const visited = new Set();
  const chain = [];
  
  function traverse(nodeId, depth = 0) {
    if (visited.has(nodeId) || depth > 5) return;
    visited.add(nodeId);
    
    const n = graph.nodes[nodeId];
    if (!n) return;
    
    chain.push({ node: n, depth });
    
    n.dependencies.forEach(dep => {
      if (graph.nodes[dep]) {
        traverse(dep, depth + 1);
      }
    });
  }
  
  traverse(node.id);
  
  console.log(`\n🔍 Full Dependency Chain for ${node.path}:`);
  console.log(`   Total files in chain: ${chain.length}\n`);
  
  chain.forEach(({ node, depth }) => {
    const indent = '  '.repeat(depth);
    console.log(`${indent}${depth === 0 ? '🎯' : '└─'} ${node.path} (${node.type})`);
  });
}

function listAPIs() {
  const apis = Object.values(graph.nodes)
    .filter(n => n.type === 'api' && n.apiEndpoints.length > 0);
  
  console.log(`\n🔌 API Endpoints (${apis.length} files):\n`);
  
  apis.forEach(node => {
    console.log(`📄 ${node.path}`);
    node.apiEndpoints.forEach(e => {
      console.log(`   ${e.method.padEnd(6)} ${e.path}`);
    });
    console.log();
  });
}

function listErrors() {
  console.log(`\n⚠️  Files with Errors (${graph.errors.length}):\n`);
  
  const errorsByType = {};
  graph.errors.forEach(err => {
    if (!errorsByType[err.type]) errorsByType[err.type] = [];
    errorsByType[err.type].push(err);
  });
  
  Object.entries(errorsByType).forEach(([type, errors]) => {
    console.log(`\n${type} (${errors.length}):`);
    errors.slice(0, 20).forEach(err => {
      console.log(`   - ${err.file}`);
      if (err.message) console.log(`     ${err.message}`);
    });
    if (errors.length > 20) {
      console.log(`   ... and ${errors.length - 20} more`);
    }
  });
}

function listUntested() {
  const untested = Object.values(graph.nodes)
    .filter(n => !n.tested && n.type !== 'test' && n.type !== 'migration')
    .sort((a, b) => b.lines - a.lines);
  
  console.log(`\n🧪 Untested Files (${untested.length}):\n`);
  
  const byType = {};
  untested.forEach(n => {
    if (!byType[n.type]) byType[n.type] = [];
    byType[n.type].push(n);
  });
  
  Object.entries(byType).forEach(([type, nodes]) => {
    console.log(`\n${type} (${nodes.length}):`);
    nodes.slice(0, 10).forEach(n => {
      console.log(`   - ${n.path} (${n.lines} lines)`);
    });
    if (nodes.length > 10) {
      console.log(`   ... and ${nodes.length - 10} more`);
    }
  });
}

function showStats() {
  console.log('\n📊 Brain Graph Statistics:\n');
  console.log('Files:', graph.metadata.totalFiles);
  console.log('Routes:', graph.metadata.routes);
  console.log('APIs:', graph.metadata.apiEndpoints);
  console.log('Components:', graph.metadata.components);
  console.log('Services:', graph.metadata.services);
  console.log('\nGraph Structure:');
  console.log('Nodes:', Object.keys(graph.nodes).length);
  console.log('Edges:', graph.edges.length);
  console.log('\nHealth:');
  console.log('Tests:', `${graph.metadata.testsPassing}/${graph.metadata.totalTests} passing`);
  console.log('Errors:', graph.errors.length);
  console.log('Warnings:', graph.warnings.length);
  console.log('\nFeatures:', Object.keys(graph.features).length);
  Object.entries(graph.features).forEach(([id, f]) => {
    console.log(`  - ${f.name}: ${f.nodes.length} files, ${f.apis.length} APIs`);
  });
}

// Main command router
switch (command) {
  case 'feature':
    if (!arg) {
      console.log('Usage: node query-brain-graph.cjs feature <name>');
      process.exit(1);
    }
    listFeature(arg);
    break;
  
  case 'deps':
    if (!arg) {
      console.log('Usage: node query-brain-graph.cjs deps <file>');
      process.exit(1);
    }
    listDependencies(arg);
    break;
  
  case 'reverse-deps':
    if (!arg) {
      console.log('Usage: node query-brain-graph.cjs reverse-deps <file>');
      process.exit(1);
    }
    listReverseDependencies(arg);
    break;
  
  case 'trace':
    if (!arg) {
      console.log('Usage: node query-brain-graph.cjs trace <file>');
      process.exit(1);
    }
    traceFullChain(arg);
    break;
  
  case 'api':
    listAPIs();
    break;
  
  case 'errors':
    listErrors();
    break;
  
  case 'untested':
    listUntested();
    break;
  
  case 'stats':
    showStats();
    break;
  
  default:
    console.log(`
🧠 Brain Graph Query Tool

Usage: node query-brain-graph.cjs <command> [args]

Commands:
  feature <name>        - List all files for a feature
  deps <file>          - List dependencies of a file
  reverse-deps <file>  - List files that depend on this file
  trace <file>         - Trace full dependency chain
  api                  - List all API endpoints
  errors               - List files with errors
  untested             - List files without tests
  stats                - Show graph statistics

Examples:
  node query-brain-graph.cjs feature bulk-email
  node query-brain-graph.cjs deps email.tsx
  node query-brain-graph.cjs trace src/routes/email.tsx
  node query-brain-graph.cjs api
    `);
    process.exit(1);
}
