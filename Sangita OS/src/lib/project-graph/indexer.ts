/**
 * Project Knowledge Graph Indexer
 * Scans the codebase and indexes structure into Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { Database } from './types';
import { ASTParser } from './ast-parser';
import { GraphValidator } from './validator';

export interface GraphNode {
  nodeType: 'file' | 'route' | 'api' | 'component' | 'hook' | 'service' | 'function' | 'class' | 'db_table' | 'db_rpc' | 'db_migration' | 'db_policy' | 'feature' | 'config';
  path: string;
  name: string;
  feature?: string;
  module?: string;
  metadata: Record<string, any>;
  searchText: string;
  status: 'active' | 'deprecated' | 'planned';
  hasTests: boolean;
  hasErrors: boolean;
  fileHash?: string;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  edgeType: 'imports' | 'exports' | 'depends_on' | 'uses_table' | 'calls_rpc' | 'implements_feature' | 'tests' | 'references' | 'extends' | 'composes';
  metadata?: Record<string, any>;
}

interface IndexerStats {
  filesScanned: number;
  nodesCreated: number;
  nodesUpdated: number;
  edgesCreated: number;
  errors: Array<{ file: string; error: string }>;
}

export class ProjectGraphIndexer {
  private supabase: SupabaseClient<Database>;
  private projectRoot: string;
  private nodeCache: Map<string, string> = new Map(); // path -> node_id
  private stats: IndexerStats = {
    filesScanned: 0,
    nodesCreated: 0,
    nodesUpdated: 0,
    edgesCreated: 0,
    errors: []
  };

  constructor(supabaseUrl: string, supabaseServiceKey: string, projectRoot: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
    this.projectRoot = projectRoot;
  }

  /**
   * Full project scan and index
   */
  async indexProject(runValidation = true): Promise<IndexerStats> {
    const jobId = await this.createIndexJob('full_scan');
    
    try {
      await this.updateJobStatus(jobId, 'running');
      
      // Index code files
      await this.indexDirectory(path.join(this.projectRoot, 'src'));
      
      // Index database schema
      await this.indexDatabaseSchema();
      
      // Index features
      await this.indexFeatures();
      
      // Run validation
      if (runValidation) {
        console.log('Running validation...');
        const validator = new GraphValidator(
          this.supabase.supabaseUrl,
          this.supabase.supabaseKey,
          this.projectRoot
        );
        const issues = await validator.validate();
        console.log(`Found ${issues.length} validation issues`);
      }
      
      // Update health snapshot
      await this.updateHealthSnapshot();
      
      await this.updateJobStatus(jobId, 'completed', this.stats);
      
      return this.stats;
    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', this.stats);
      throw error;
    }
  }

  /**
   * Incremental index for specific files
   */
  async indexFiles(filePaths: string[]): Promise<void> {
    const jobId = await this.createIndexJob('incremental');
    
    try {
      await this.updateJobStatus(jobId, 'running');
      
      for (const filePath of filePaths) {
        await this.indexFile(filePath);
      }
      
      await this.updateJobStatus(jobId, 'completed', this.stats);
    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', this.stats);
      throw error;
    }
  }

  /**
   * Index a directory recursively
   */
  private async indexDirectory(dir: string, relativePath = ''): Promise<void> {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);
        
        // Skip node_modules, .output, dist
        if (['node_modules', '.output', 'dist', '.next'].includes(entry.name)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await this.indexDirectory(fullPath, relPath);
        } else if (entry.isFile()) {
          await this.indexFile(fullPath, relPath);
        }
      }
    } catch (error) {
      this.stats.errors.push({
        file: dir,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Index a single file
   */
  private async indexFile(fullPath: string, relativePath?: string): Promise<void> {
    const relPath = relativePath || path.relative(this.projectRoot, fullPath);
    const ext = path.extname(relPath);
    
    // Only index relevant files
    if (!['.ts', '.tsx', '.js', '.jsx', '.sql', '.json'].includes(ext)) {
      return;
    }
    
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const fileHash = crypto.createHash('md5').update(content).digest('hex');
      
      this.stats.filesScanned++;
      
      // Determine node type
      const node = this.analyzeFile(relPath, content, fileHash);
      
      // Check if file already indexed and unchanged
      const { data: existing } = await this.supabase
        .from('project_graph_nodes')
        .select('id, file_hash')
        .eq('path', node.path)
        .single();
      
      if (existing && existing.file_hash === fileHash) {
        this.nodeCache.set(node.path, existing.id);
        return; // No changes
      }
      
      // Upsert node
      const { data: upserted, error } = await this.supabase
        .from('project_graph_nodes')
        .upsert({
          node_type: node.nodeType,
          path: node.path,
          name: node.name,
          feature: node.feature,
          module: node.module,
          metadata: node.metadata,
          search_text: node.searchText,
          status: node.status,
          has_tests: node.hasTests,
          has_errors: node.hasErrors,
          file_hash: node.fileHash,
          last_indexed_at: new Date().toISOString()
        }, {
          onConflict: 'path'
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      if (existing) {
        this.stats.nodesUpdated++;
      } else {
        this.stats.nodesCreated++;
      }
      
      this.nodeCache.set(node.path, upserted.id);
      
      // Index dependencies
      await this.indexFileDependencies(upserted.id, relPath, content);
      
    } catch (error) {
      this.stats.errors.push({
        file: relPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Analyze file content and extract metadata using AST
   */
  private analyzeFile(relPath: string, content: string, fileHash: string): GraphNode {
    const name = path.basename(relPath);
    const lowerPath = relPath.toLowerCase();
    
    // Determine node type
    let nodeType: GraphNode['nodeType'] = 'file';
    let feature: string | undefined;
    
    if (lowerPath.startsWith('src/routes/api/')) {
      nodeType = 'api';
    } else if (lowerPath.startsWith('src/routes/')) {
      nodeType = 'route';
    } else if (lowerPath.startsWith('src/components/')) {
      nodeType = 'component';
    } else if (lowerPath.includes('/hooks/') || lowerPath.startsWith('src/hooks/')) {
      nodeType = 'hook';
    } else if (lowerPath.includes('/services/') || lowerPath.includes('/lib/')) {
      nodeType = 'service';
    } else if (lowerPath.includes('.sql')) {
      nodeType = 'db_migration';
    }
    
    // Detect feature
    if (lowerPath.includes('email') || lowerPath.includes('campaign')) {
      feature = 'bulk-email';
    } else if (lowerPath.includes('keyword')) {
      feature = 'keywords';
    } else if (lowerPath.includes('lead')) {
      feature = 'leads';
    } else if (lowerPath.includes('customer') || lowerPath.includes('crm')) {
      feature = 'crm';
    } else if (lowerPath.includes('ai') || lowerPath.includes('insight')) {
      feature = 'ai-insights';
    } else if (lowerPath.includes('task')) {
      feature = 'tasks';
    } else if (lowerPath.includes('finance') || lowerPath.includes('invoice') || lowerPath.includes('quotation')) {
      feature = 'finance';
    }
    
    // Extract metadata using AST for TS/TSX files
    const metadata: Record<string, any> = {
      lines: content.split('\n').length,
      size: content.length
    };

    const ext = path.extname(relPath);
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      try {
        const fullPath = path.join(this.projectRoot, relPath);
        const parsed = ASTParser.parseFile(fullPath);

        // Store exports
        if (parsed.exports.length > 0) {
          metadata.exports = parsed.exports.map(e => e.name);
          metadata.exportTypes = parsed.exports.map(e => e.type);
        }

        // Store imports
        if (parsed.imports.length > 0) {
          metadata.imports = parsed.imports.map(i => i.source);
          metadata.importSpecifiers = parsed.imports.reduce((acc, imp) => {
            acc[imp.source] = imp.specifiers;
            return acc;
          }, {} as Record<string, string[]>);
        }

        // Store functions
        if (parsed.functions.length > 0) {
          metadata.functions = parsed.functions.map(f => f.name);
        }

        // Store classes
        if (parsed.classes.length > 0) {
          metadata.classes = parsed.classes.map(c => c.name);
        }

        // Store components
        if (parsed.components.length > 0) {
          metadata.components = parsed.components.map(c => c.name);
          metadata.componentProps = parsed.components.reduce((acc, comp) => {
            acc[comp.name] = comp.props;
            return acc;
          }, {} as Record<string, string[]>);
        }

        // Store hooks
        if (parsed.hooks.length > 0) {
          metadata.hooks = parsed.hooks;
        }

        // Store Supabase usage
        if (parsed.supabaseUsage.hasClient || parsed.supabaseUsage.tables.length > 0 || parsed.supabaseUsage.rpcs.length > 0) {
          metadata.hasSupabase = true;
          metadata.supabaseTables = parsed.supabaseUsage.tables;
          metadata.supabaseRPCs = parsed.supabaseUsage.rpcs;
        }

        // Extract API endpoints for API routes
        if (nodeType === 'api' && parsed.apiEndpoints) {
          metadata.methods = parsed.apiEndpoints.map(e => e.method);
          metadata.endpoint = parsed.apiEndpoints[0]?.endpoint || 
            '/api/' + relPath.replace('src/routes/api/', '').replace(/\.(ts|tsx)$/, '').replace(/\.\$(\w+)/, '/:$1');
        }
      } catch (error) {
        // Fallback to regex if AST parsing fails
        console.warn(`AST parsing failed for ${relPath}, using regex fallback:`, error);
        
        const exportMatches = content.matchAll(/export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+(\w+)/g);
        const exports = Array.from(exportMatches).map(m => m[1]);
        if (exports.length > 0) {
          metadata.exports = exports;
        }
      }
    }
    
    const hasFetch = content.includes('fetch(');
    const hasError = content.includes('throw new Error') || content.includes('console.error');
    const hasTests = relPath.includes('.test.') || relPath.includes('.spec.');
    
    metadata.hasFetch = hasFetch;
    
    // Build search text
    const searchText = [
      name,
      relPath,
      feature || '',
      ...(metadata.exports || []),
      ...(metadata.functions || []),
      ...(metadata.components || []),
      ...(metadata.classes || []),
      metadata.endpoint || ''
    ].filter(Boolean).join(' ');
    
    return {
      nodeType,
      path: relPath,
      name,
      feature,
      metadata,
      searchText,
      status: 'active',
      hasTests,
      hasErrors: hasError,
      fileHash
    };
  }

  /**
   * Index file dependencies (imports) using AST
   */
  private async indexFileDependencies(sourceId: string, relPath: string, content: string): Promise<void> {
    const ext = path.extname(relPath);
    
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return;
    }

    try {
      const fullPath = path.join(this.projectRoot, relPath);
      const parsed = ASTParser.parseFile(fullPath);

      for (const imp of parsed.imports) {
        let importPath = imp.source;
        
        // Skip external packages
        if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
          continue;
        }
        
        // Resolve relative imports
        if (importPath.startsWith('.')) {
          const dir = path.dirname(relPath);
          importPath = path.join(dir, importPath).replace(/\\/g, '/');
        } else if (importPath.startsWith('@/')) {
          importPath = importPath.replace('@/', 'src/');
        }
        
        // Try to find target node
        const targetId = this.nodeCache.get(importPath) || 
                        this.nodeCache.get(importPath + '.ts') ||
                        this.nodeCache.get(importPath + '.tsx') ||
                        this.nodeCache.get(importPath + '/index.ts') ||
                        this.nodeCache.get(importPath + '/index.tsx');
        
        if (!targetId) continue;
        
        // Create edge
        try {
          await this.supabase
            .from('project_graph_edges')
            .insert({
              source_id: sourceId,
              target_id: targetId,
              edge_type: 'imports',
              metadata: { specifiers: imp.specifiers, isTypeOnly: imp.isTypeOnly }
            })
            .select()
            .single();
          
          this.stats.edgesCreated++;
        } catch (error) {
          // Ignore duplicate edge errors
          if (!error.message?.includes('duplicate')) {
            this.stats.errors.push({
              file: relPath,
              error: `Failed to create edge: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        }
      }

      // Create edges for Supabase usage
      for (const tableName of parsed.supabaseUsage.tables) {
        const tableNodeId = this.nodeCache.get(`db.${tableName}`);
        if (tableNodeId) {
          try {
            await this.supabase
              .from('project_graph_edges')
              .insert({
                source_id: sourceId,
                target_id: tableNodeId,
                edge_type: 'uses_table'
              })
              .select()
              .single();
            
            this.stats.edgesCreated++;
          } catch (error) {
            // Ignore duplicates
          }
        }
      }

      for (const rpcName of parsed.supabaseUsage.rpcs) {
        const rpcNodeId = this.nodeCache.get(`rpc.${rpcName}`);
        if (rpcNodeId) {
          try {
            await this.supabase
              .from('project_graph_edges')
              .insert({
                source_id: sourceId,
                target_id: rpcNodeId,
                edge_type: 'calls_rpc'
              })
              .select()
              .single();
            
            this.stats.edgesCreated++;
          } catch (error) {
            // Ignore duplicates
          }
        }
      }
    } catch (error) {
      // Fallback to regex-based import extraction
      const importRegex = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        let importPath = match[1];
        
        // Skip external packages
        if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
          continue;
        }
        
        // Resolve relative imports
        if (importPath.startsWith('.')) {
          const dir = path.dirname(relPath);
          importPath = path.join(dir, importPath).replace(/\\/g, '/');
        } else if (importPath.startsWith('@/')) {
          importPath = importPath.replace('@/', 'src/');
        }
        
        // Try to find target node
        const targetId = this.nodeCache.get(importPath) || 
                        this.nodeCache.get(importPath + '.ts') ||
                        this.nodeCache.get(importPath + '.tsx') ||
                        this.nodeCache.get(importPath + '/index.ts') ||
                        this.nodeCache.get(importPath + '/index.tsx');
        
        if (!targetId) continue;
        
        // Create edge
        try {
          await this.supabase
            .from('project_graph_edges')
            .insert({
              source_id: sourceId,
              target_id: targetId,
              edge_type: 'imports'
            })
            .select()
            .single();
          
          this.stats.edgesCreated++;
        } catch (error) {
          // Ignore duplicate edge errors
          if (!error.message?.includes('duplicate')) {
            this.stats.errors.push({
              file: relPath,
              error: `Failed to create edge: ${error instanceof Error ? error.message : String(error)}`
            });
          }
        }
      }
    }
  }

  /**
   * Index database schema from migrations
   */
  private async indexDatabaseSchema(): Promise<void> {
    const migrationsDir = path.join(this.projectRoot, 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) return;
    
    const migrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const migration of migrations) {
      const filePath = path.join(migrationsDir, migration);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract table names
      const tableMatches = content.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi);
      for (const match of tableMatches) {
        const tableName = match[1];
        
        const { data, error } = await this.supabase
          .from('project_graph_nodes')
          .upsert({
            node_type: 'db_table',
            path: `db.${tableName}`,
            name: tableName,
            metadata: { migration },
            search_text: tableName,
            status: 'active',
            last_indexed_at: new Date().toISOString()
          }, {
            onConflict: 'path'
          })
          .select('id')
          .single();
        
        if (!error && data) {
          this.nodeCache.set(`db.${tableName}`, data.id);
          this.stats.nodesCreated++;
        }
      }
      
      // Extract RPC functions
      const rpcMatches = content.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)/gi);
      for (const match of rpcMatches) {
        const rpcName = match[1];
        
        const { data, error } = await this.supabase
          .from('project_graph_nodes')
          .upsert({
            node_type: 'db_rpc',
            path: `rpc.${rpcName}`,
            name: rpcName,
            metadata: { migration },
            search_text: rpcName,
            status: 'active',
            last_indexed_at: new Date().toISOString()
          }, {
            onConflict: 'path'
          })
          .select('id')
          .single();
        
        if (!error && data) {
          this.nodeCache.set(`rpc.${rpcName}`, data.id);
          this.stats.nodesCreated++;
        }
      }
    }
  }

  /**
   * Index high-level features
   */
  private async indexFeatures(): Promise<void> {
    const features = [
      { id: 'bulk-email', name: 'Bulk Email Campaigns', status: 'active' },
      { id: 'keywords', name: 'Keyword Intelligence', status: 'active' },
      { id: 'leads', name: 'Lead Management', status: 'active' },
      { id: 'crm', name: 'Customer Relationship Management', status: 'active' },
      { id: 'ai-insights', name: 'AI Insights & Analytics', status: 'active' },
      { id: 'tasks', name: 'Task Management', status: 'active' },
      { id: 'finance', name: 'Finance & Invoicing', status: 'active' }
    ];
    
    for (const feature of features) {
      await this.supabase
        .from('project_graph_nodes')
        .upsert({
          node_type: 'feature',
          path: `feature.${feature.id}`,
          name: feature.name,
          feature: feature.id,
          metadata: {},
          search_text: `${feature.id} ${feature.name}`,
          status: feature.status as any,
          last_indexed_at: new Date().toISOString()
        }, {
          onConflict: 'path'
        });
    }
  }

  /**
   * Create index job record
   */
  private async createIndexJob(jobType: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('project_graph_index_jobs')
      .insert({
        job_type: jobType,
        status: 'pending'
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: string, stats?: IndexerStats): Promise<void> {
    const update: any = { status };
    
    if (status === 'running') {
      update.started_at = new Date().toISOString();
    }
    
    if (status === 'completed' || status === 'failed') {
      update.completed_at = new Date().toISOString();
      if (stats) {
        update.files_scanned = stats.filesScanned;
        update.nodes_created = stats.nodesCreated;
        update.nodes_updated = stats.nodesUpdated;
        update.edges_created = stats.edgesCreated;
        update.errors = stats.errors;
      }
    }
    
    await this.supabase
      .from('project_graph_index_jobs')
      .update(update)
      .eq('id', jobId);
  }

  /**
   * Update health snapshot
   */
  private async updateHealthSnapshot(): Promise<void> {
    const { data: nodeCount } = await this.supabase
      .from('project_graph_nodes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { data: edgeCount } = await this.supabase
      .from('project_graph_edges')
      .select('*', { count: 'exact', head: true });

    const { data: fileCount } = await this.supabase
      .from('project_graph_nodes')
      .select('*', { count: 'exact', head: true })
      .in('node_type', ['file', 'route', 'api', 'component', 'service']);

    const { data: brokenImports } = await this.supabase
      .from('project_graph_validation')
      .select('*', { count: 'exact', head: true })
      .eq('validation_type', 'broken_import')
      .eq('status', 'open');

    const { data: schemaMismatches } = await this.supabase
      .from('project_graph_validation')
      .select('*', { count: 'exact', head: true })
      .eq('validation_type', 'schema_mismatch')
      .eq('status', 'open');

    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 7);
    
    const { data: staleNodes } = await this.supabase
      .from('project_graph_nodes')
      .select('*', { count: 'exact', head: true })
      .lt('last_indexed_at', staleDate.toISOString());

    await this.supabase
      .from('project_graph_health')
      .insert({
        total_nodes: nodeCount?.length || 0,
        total_edges: edgeCount?.length || 0,
        indexed_files: fileCount?.length || 0,
        broken_imports: brokenImports?.length || 0,
        schema_mismatches: schemaMismatches?.length || 0,
        stale_nodes: staleNodes?.length || 0,
        indexing_errors: this.stats.errors.length
      });
  }
}
