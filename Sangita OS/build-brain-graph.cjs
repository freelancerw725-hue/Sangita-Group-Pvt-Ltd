#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = '/home/sonu/Desktop/Sangita Group Pvt Ltd /Sangita OS';

// Brain Graph Data Structure
const graph = {
  version: '1.0.0',
  generated: new Date().toISOString(),
  project: 'Sangita OS',
  metadata: {
    totalFiles: 0,
    totalTests: 91,
    testsPassing: 91,
    migrations: 3,
    apiEndpoints: 0,
    components: 0,
    services: 0,
    routes: 0
  },
  nodes: {},
  edges: [],
  features: {},
  errors: [],
  warnings: []
};

// Scan directory recursively
function scanDirectory(dir, relativePath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(relativePath, entry.name);
    
    // Skip node_modules and build artifacts
    if (entry.name === 'node_modules' || entry.name === '.output' || entry.name === 'dist') {
      continue;
    }
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath, relPath);
    } else if (entry.isFile()) {
      indexFile(fullPath, relPath);
    }
  }
}

// Index a file
function indexFile(fullPath, relPath) {
  const ext = path.extname(relPath);
  const name = path.basename(relPath);
  
  // Only index relevant files
  if (!['.ts', '.tsx', '.js', '.jsx', '.sql', '.json'].includes(ext)) {
    return;
  }
  
  graph.metadata.totalFiles++;
  
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const nodeId = relPath.replace(/\\/g, '/');
    
    // Determine node type
    let type = 'file';
    let subtype = '';
    let dependencies = [];
    let exports = [];
    let apiEndpoints = [];
    
    if (relPath.startsWith('src/routes/api/')) {
      type = 'api';
      subtype = 'endpoint';
      graph.metadata.apiEndpoints++;
      
      // Extract endpoint methods
      const methods = [];
      if (content.includes('GET:')) methods.push('GET');
      if (content.includes('POST:')) methods.push('POST');
      if (content.includes('PUT:')) methods.push('PUT');
      if (content.includes('PATCH:')) methods.push('PATCH');
      if (content.includes('DELETE:')) methods.push('DELETE');
      
      apiEndpoints = methods.map(m => ({
        method: m,
        path: '/api/' + relPath.replace('src/routes/api/', '').replace(/\.(ts|tsx)$/, '').replace(/\.\$id$/, '/:id')
      }));
    } else if (relPath.startsWith('src/routes/') && !relPath.includes('/api/')) {
      type = 'route';
      subtype = 'page';
      graph.metadata.routes++;
    } else if (relPath.startsWith('src/components/')) {
      type = 'component';
      graph.metadata.components++;
    } else if (relPath.includes('/services/') || relPath.includes('/lib/')) {
      type = 'service';
      graph.metadata.services++;
    } else if (relPath.startsWith('supabase/migrations/')) {
      type = 'migration';
      subtype = 'sql';
    } else if (relPath.includes('.test.') || relPath.includes('.spec.')) {
      type = 'test';
    }
    
    // Extract imports
    const importRegex = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      let importPath = match[1];
      
      // Resolve relative imports
      if (importPath.startsWith('.')) {
        const dir = path.dirname(relPath);
        importPath = path.join(dir, importPath).replace(/\\/g, '/');
      } else if (importPath.startsWith('@/')) {
        importPath = importPath.replace('@/', 'src/');
      }
      
      dependencies.push(importPath);
    }
    
    // Extract exports
    const exportRegex = /export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    // Check for errors/issues
    const hasError = content.includes('throw new Error') || content.includes('console.error');
    const hasWarning = content.includes('console.warn') || content.includes('// TODO') || content.includes('// FIXME');
    const hasSupabase = content.includes('supabase') || content.includes('Supabase');
    const hasFetch = content.includes('fetch(');
    
    // Create node
    graph.nodes[nodeId] = {
      id: nodeId,
      name: name,
      path: relPath,
      type: type,
      subtype: subtype,
      size: content.length,
      lines: content.split('\n').length,
      dependencies: dependencies,
      exports: exports,
      apiEndpoints: apiEndpoints,
      features: {
        hasSupabase,
        hasFetch,
        hasError,
        hasWarning
      },
      tested: false,
      status: 'indexed'
    };
    
    // Add edges for dependencies
    dependencies.forEach(dep => {
      graph.edges.push({
        from: nodeId,
        to: dep,
        type: 'imports'
      });
    });
    
    // Track issues
    if (hasError && type !== 'test') {
      graph.errors.push({
        file: relPath,
        type: 'has-error-handling',
        severity: 'info'
      });
    }
    
    if (hasWarning) {
      graph.warnings.push({
        file: relPath,
        type: 'has-todos',
        severity: 'low'
      });
    }
    
  } catch (err) {
    graph.errors.push({
      file: relPath,
      type: 'scan-error',
      message: err.message,
      severity: 'high'
    });
  }
}

// Index features by analyzing nodes
function indexFeatures() {
  const features = {
    'bulk-email': {
      name: 'Bulk Email Campaigns',
      nodes: [],
      apis: [],
      components: [],
      database: ['campaigns', 'emails', 'email_queue', 'campaign_recipients'],
      status: 'partial'
    },
    'ai-insights': {
      name: 'AI Insights & Analytics',
      nodes: [],
      apis: [],
      components: [],
      database: [],
      status: 'active'
    },
    'crm': {
      name: 'Customer Relationship Management',
      nodes: [],
      apis: [],
      components: [],
      database: ['customers', 'sangita_customers', 'opportunities'],
      status: 'active'
    },
    'leads': {
      name: 'Lead Pipeline & Management',
      nodes: [],
      apis: [],
      components: [],
      database: ['leads', 'lead_sheets', 'bulk_mail_leads'],
      status: 'active'
    },
    'tasks': {
      name: 'Task Management',
      nodes: [],
      apis: [],
      components: [],
      database: ['tasks'],
      status: 'active'
    },
    'finance': {
      name: 'Finance & Invoicing',
      nodes: [],
      apis: [],
      components: [],
      database: ['invoices', 'quotations', 'agreements'],
      status: 'active'
    },
    'keywords': {
      name: 'Keyword Intelligence',
      nodes: [],
      apis: [],
      components: [],
      database: ['keyword_pool', 'keyword_usage_log', 'keyword_performance'],
      status: 'active'
    }
  };
  
  // Map nodes to features
  Object.entries(graph.nodes).forEach(([id, node]) => {
    const lowerPath = node.path.toLowerCase();
    
    if (lowerPath.includes('email') || lowerPath.includes('campaign')) {
      features['bulk-email'].nodes.push(id);
      if (node.type === 'api') features['bulk-email'].apis.push(id);
      if (node.type === 'component') features['bulk-email'].components.push(id);
    }
    
    if (lowerPath.includes('ai') || lowerPath.includes('insight')) {
      features['ai-insights'].nodes.push(id);
      if (node.type === 'api') features['ai-insights'].apis.push(id);
    }
    
    if (lowerPath.includes('crm') || lowerPath.includes('customer')) {
      features['crm'].nodes.push(id);
      if (node.type === 'api') features['crm'].apis.push(id);
    }
    
    if (lowerPath.includes('lead')) {
      features['leads'].nodes.push(id);
      if (node.type === 'api') features['leads'].apis.push(id);
    }
    
    if (lowerPath.includes('task')) {
      features['tasks'].nodes.push(id);
      if (node.type === 'api') features['tasks'].apis.push(id);
    }
    
    if (lowerPath.includes('finance') || lowerPath.includes('invoice') || lowerPath.includes('quotation')) {
      features['finance'].nodes.push(id);
      if (node.type === 'api') features['finance'].apis.push(id);
    }
    
    if (lowerPath.includes('keyword')) {
      features['keywords'].nodes.push(id);
      if (node.type === 'api') features['keywords'].apis.push(id);
    }
  });
  
  graph.features = features;
}

// Run scan
console.log('🧠 Building Sangita OS Brain Graph...');
scanDirectory(path.join(projectRoot, 'src'), 'src');
scanDirectory(path.join(projectRoot, 'supabase'), 'supabase');

console.log('📊 Indexing features...');
indexFeatures();

// Write output
const outputPath = path.join(projectRoot, 'brain-graph.json');
fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));

console.log('\n✅ Brain Graph Generated:');
console.log(`   Files: ${graph.metadata.totalFiles}`);
console.log(`   Routes: ${graph.metadata.routes}`);
console.log(`   APIs: ${graph.metadata.apiEndpoints}`);
console.log(`   Components: ${graph.metadata.components}`);
console.log(`   Services: ${graph.metadata.services}`);
console.log(`   Nodes: ${Object.keys(graph.nodes).length}`);
console.log(`   Edges: ${graph.edges.length}`);
console.log(`   Errors: ${graph.errors.length}`);
console.log(`   Warnings: ${graph.warnings.length}`);
console.log(`\n📁 Output: ${outputPath}`);
