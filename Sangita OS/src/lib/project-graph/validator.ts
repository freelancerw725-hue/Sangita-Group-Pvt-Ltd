/**
 * Graph Validator
 * Detects broken imports, schema mismatches, and other issues
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import type { Database } from './types';

export interface ValidationIssue {
  type: 'broken_import' | 'missing_function' | 'schema_mismatch' | 'unused_dependency' | 'type_error' | 'missing_migration';
  severity: 'error' | 'warning' | 'info';
  filePath: string;
  lineNumber?: number;
  message: string;
  details: Record<string, any>;
}

export class GraphValidator {
  private supabase: SupabaseClient<Database>;
  private projectRoot: string;
  private nodeCache: Map<string, any> = new Map();

  constructor(supabaseUrl: string, supabaseServiceKey: string, projectRoot: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
    this.projectRoot = projectRoot;
  }

  /**
   * Run full validation
   */
  async validate(): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Load all nodes into cache
    await this.loadNodeCache();

    // 1. Validate imports
    const importIssues = await this.validateImports();
    issues.push(...importIssues);

    // 2. Validate Supabase schema
    const schemaIssues = await this.validateSupabaseSchema();
    issues.push(...schemaIssues);

    // 3. Store issues in database
    await this.storeValidationIssues(issues);

    return issues;
  }

  /**
   * Load all nodes into memory for faster validation
   */
  private async loadNodeCache() {
    const { data: nodes, error } = await this.supabase
      .from('project_graph_nodes')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;

    this.nodeCache.clear();
    nodes?.forEach(node => {
      this.nodeCache.set(node.path, node);
    });
  }

  /**
   * Validate all imports - detect broken imports
   */
  private async validateImports(): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Get all edges of type 'imports'
    const { data: edges, error } = await this.supabase
      .from('project_graph_edges')
      .select('*, source:source_id(path, metadata), target:target_id(path)')
      .eq('edge_type', 'imports');

    if (error) {
      console.error('Error loading edges:', error);
      return issues;
    }

    for (const edge of edges || []) {
      const source = edge.source as any;
      const target = edge.target as any;

      if (!source || !target) continue;

      const sourcePath = source.path;
      const targetPath = target.path;

      // Check if target exists
      if (!this.nodeCache.has(targetPath)) {
        // Try to resolve the import
        const resolved = this.resolveImport(sourcePath, targetPath);

        if (!resolved || !this.nodeCache.has(resolved)) {
          issues.push({
            type: 'broken_import',
            severity: 'error',
            filePath: sourcePath,
            message: `Broken import: cannot resolve '${targetPath}'`,
            details: {
              importPath: targetPath,
              sourceFile: sourcePath
            }
          });
        }
      }
    }

    return issues;
  }

  /**
   * Resolve import path (handle .ts/.tsx extensions, index files)
   */
  private resolveImport(sourcePath: string, importPath: string): string | null {
    // If it's a relative import starting with . or ..
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
      return null; // External package, skip
    }

    // Resolve @/ alias
    if (importPath.startsWith('@/')) {
      importPath = importPath.replace('@/', 'src/');
    }

    // Resolve relative path
    if (importPath.startsWith('.')) {
      const sourceDir = path.dirname(sourcePath);
      importPath = path.join(sourceDir, importPath).replace(/\\/g, '/');
    }

    // Try different extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];

    for (const ext of extensions) {
      const resolved = importPath + ext;
      if (this.nodeCache.has(resolved)) {
        return resolved;
      }
    }

    return null;
  }

  /**
   * Validate Supabase schema usage
   */
  private async validateSupabaseSchema(): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Get actual Supabase schema
    const actualSchema = await this.getSupabaseSchema();

    // Get all nodes that use Supabase
    for (const [filePath, node] of this.nodeCache.entries()) {
      const metadata = node.metadata || {};

      // Check table usage
      if (metadata.supabaseTables && Array.isArray(metadata.supabaseTables)) {
        for (const tableName of metadata.supabaseTables) {
          if (!actualSchema.tables.includes(tableName)) {
            issues.push({
              type: 'schema_mismatch',
              severity: 'error',
              filePath,
              message: `Table '${tableName}' does not exist in Supabase schema`,
              details: {
                table: tableName,
                availableTables: actualSchema.tables
              }
            });
          }
        }
      }

      // Check RPC usage
      if (metadata.supabaseRPCs && Array.isArray(metadata.supabaseRPCs)) {
        for (const rpcName of metadata.supabaseRPCs) {
          if (!actualSchema.rpcs.includes(rpcName)) {
            issues.push({
              type: 'schema_mismatch',
              severity: 'error',
              filePath,
              message: `RPC function '${rpcName}' does not exist in Supabase`,
              details: {
                rpc: rpcName,
                availableRPCs: actualSchema.rpcs
              }
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Get actual Supabase schema from database
   */
  private async getSupabaseSchema(): Promise<{ tables: string[]; rpcs: string[] }> {
    const tables: string[] = [];
    const rpcs: string[] = [];

    try {
      // Get tables from information_schema
      const { data: tableData } = await this.supabase.rpc('sql', {
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        `
      } as any);

      if (tableData) {
        tables.push(...(tableData as any[]).map(r => r.table_name));
      }
    } catch (error) {
      // Fallback: get from indexed nodes
      const { data: dbTables } = await this.supabase
        .from('project_graph_nodes')
        .select('name')
        .eq('node_type', 'db_table');

      if (dbTables) {
        tables.push(...dbTables.map(t => t.name));
      }
    }

    try {
      // Get RPCs from pg_proc
      const { data: rpcData } = await this.supabase.rpc('sql', {
        query: `
          SELECT proname as name
          FROM pg_proc
          JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
          WHERE pg_namespace.nspname = 'public'
        `
      } as any);

      if (rpcData) {
        rpcs.push(...(rpcData as any[]).map(r => r.name));
      }
    } catch (error) {
      // Fallback: get from indexed nodes
      const { data: dbRPCs } = await this.supabase
        .from('project_graph_nodes')
        .select('name')
        .eq('node_type', 'db_rpc');

      if (dbRPCs) {
        rpcs.push(...dbRPCs.map(r => r.name));
      }
    }

    return { tables, rpcs };
  }

  /**
   * Store validation issues in database
   */
  private async storeValidationIssues(issues: ValidationIssue[]) {
    // Clear old issues
    await this.supabase
      .from('project_graph_validation')
      .delete()
      .eq('status', 'open');

    // Insert new issues
    for (const issue of issues) {
      await this.supabase
        .from('project_graph_validation')
        .insert({
          validation_type: issue.type,
          file_path: issue.filePath,
          line_number: issue.lineNumber,
          severity: issue.severity,
          message: issue.message,
          details: issue.details,
          status: 'open'
        });
    }
  }

  /**
   * Validate specific file
   */
  async validateFile(filePath: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Load node cache if empty
    if (this.nodeCache.size === 0) {
      await this.loadNodeCache();
    }

    const node = this.nodeCache.get(filePath);
    if (!node) return issues;

    // Check imports for this file
    const { data: edges } = await this.supabase
      .from('project_graph_edges')
      .select('*, source:source_id!inner(path), target:target_id(path)')
      .eq('edge_type', 'imports')
      .eq('source.path', filePath);

    for (const edge of edges || []) {
      const target = edge.target as any;
      if (!target) continue;

      const targetPath = target.path;
      const resolved = this.resolveImport(filePath, targetPath);

      if (!resolved || !this.nodeCache.has(resolved)) {
        issues.push({
          type: 'broken_import',
          severity: 'error',
          filePath,
          message: `Broken import: cannot resolve '${targetPath}'`,
          details: {
            importPath: targetPath
          }
        });
      }
    }

    return issues;
  }
}
