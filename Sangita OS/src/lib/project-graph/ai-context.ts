/**
 * AI Context Retrieval Layer
 * Translates user requests into relevant code context using the knowledge graph
 */

import { createClient } from '@supabase/supabase-js';

export interface AIContextResult {
  query: string;
  relevantNodes: Array<{
    id: string;
    path: string;
    type: string;
    name: string;
    feature?: string;
    metadata: Record<string, any>;
    relevance: number;
  }>;
  featuresInvolved: string[];
  dependencyChains?: Array<{
    root: string;
    dependencies: string[];
  }>;
  impactAnalysis?: {
    affectedFiles: string[];
    affectedFeatures: string[];
    testsToRun: string[];
  };
  contextSummary: string;
}

export class AIContextRetriever {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get AI-optimized context for a user query
   */
  async getContext(userQuery: string): Promise<AIContextResult> {
    // Use the cached RPC function first
    const { data: cachedContext, error } = await this.supabase
      .rpc('get_ai_context', {
        p_user_query: userQuery,
        p_max_nodes: 20
      });

    if (error) throw error;

    if (cachedContext) {
      return {
        query: userQuery,
        relevantNodes: cachedContext.nodes || [],
        featuresInvolved: cachedContext.features_involved || [],
        contextSummary: this.buildContextSummary(cachedContext.nodes || [])
      };
    }

    // Fallback to direct search
    return this.searchAndBuildContext(userQuery);
  }

  /**
   * Search graph and build context
   */
  private async searchAndBuildContext(query: string): Promise<AIContextResult> {
    const { data: nodes, error } = await this.supabase
      .rpc('search_graph_nodes', {
        p_query: query,
        p_limit: 20
      });

    if (error) throw error;

    const relevantNodes = (nodes || []).map((n: any) => ({
      id: n.node_id,
      path: n.node_path,
      type: n.node_type,
      name: n.node_name,
      feature: n.feature,
      metadata: n.metadata,
      relevance: n.rank
    }));

    const featuresInvolved = Array.from(
      new Set(relevantNodes.map(n => n.feature).filter(Boolean))
    ) as string[];

    return {
      query,
      relevantNodes,
      featuresInvolved,
      contextSummary: this.buildContextSummary(relevantNodes)
    };
  }

  /**
   * Get dependency chain for a file
   */
  async getDependencyChain(filePath: string, maxDepth = 5): Promise<any[]> {
    const { data, error } = await this.supabase
      .rpc('get_dependency_chain', {
        p_node_path: filePath,
        p_max_depth: maxDepth
      });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get reverse dependencies (impact analysis)
   */
  async getReverseDependencies(filePath: string, maxDepth = 3): Promise<any[]> {
    const { data, error } = await this.supabase
      .rpc('get_reverse_dependencies', {
        p_node_path: filePath,
        p_max_depth: maxDepth
      });

    if (error) throw error;
    return data || [];
  }

  /**
   * Analyze impact of changing a file
   */
  async analyzeImpact(filePath: string): Promise<{
    affectedFiles: string[];
    affectedFeatures: string[];
    testsToRun: string[];
  }> {
    const reverseDeps = await this.getReverseDependencies(filePath);

    const affectedFiles = reverseDeps.map(d => d.node_path);
    const affectedFeatures = Array.from(
      new Set(
        (await Promise.all(
          affectedFiles.map(async f => {
            const { data } = await this.supabase
              .from('project_graph_nodes')
              .select('feature')
              .eq('path', f)
              .single();
            return data?.feature;
          })
        )).filter(Boolean)
      )
    ) as string[];

    // Find test files related to affected files
    const testsToRun: string[] = [];
    for (const file of affectedFiles) {
      const testPath = file.replace(/\.(ts|tsx)$/, '.test.$1');
      const { data } = await this.supabase
        .from('project_graph_nodes')
        .select('path')
        .eq('path', testPath)
        .single();
      
      if (data) {
        testsToRun.push(data.path);
      }
    }

    return {
      affectedFiles,
      affectedFeatures,
      testsToRun
    };
  }

  /**
   * Get feature overview
   */
  async getFeatureOverview(feature: string): Promise<any> {
    const { data, error } = await this.supabase
      .rpc('get_feature_overview', {
        p_feature: feature
      });

    if (error) throw error;
    return data;
  }

  /**
   * Find files implementing a feature
   */
  async getFeatureFiles(feature: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('project_graph_nodes')
      .select('path')
      .eq('feature', feature)
      .in('node_type', ['file', 'route', 'api', 'component', 'service']);

    if (error) throw error;
    return (data || []).map(d => d.path);
  }

  /**
   * Find database objects used by a feature
   */
  async getFeatureDatabaseObjects(feature: string): Promise<{
    tables: string[];
    rpcs: string[];
  }> {
    // Get feature files
    const files = await this.getFeatureFiles(feature);

    // Find edges from these files to DB objects
    const { data: fileNodes } = await this.supabase
      .from('project_graph_nodes')
      .select('id')
      .in('path', files);

    if (!fileNodes || fileNodes.length === 0) {
      return { tables: [], rpcs: [] };
    }

    const nodeIds = fileNodes.map(n => n.id);

    const { data: edges } = await this.supabase
      .from('project_graph_edges')
      .select('target_id')
      .in('source_id', nodeIds)
      .in('edge_type', ['uses_table', 'calls_rpc']);

    if (!edges || edges.length === 0) {
      return { tables: [], rpcs: [] };
    }

    const targetIds = edges.map(e => e.target_id);

    const { data: dbNodes } = await this.supabase
      .from('project_graph_nodes')
      .select('node_type, path')
      .in('id', targetIds)
      .in('node_type', ['db_table', 'db_rpc']);

    const tables = (dbNodes || [])
      .filter(n => n.node_type === 'db_table')
      .map(n => n.path.replace('db.', ''));

    const rpcs = (dbNodes || [])
      .filter(n => n.node_type === 'db_rpc')
      .map(n => n.path.replace('rpc.', ''));

    return { tables, rpcs };
  }

  /**
   * Build a human-readable context summary
   */
  private buildContextSummary(nodes: any[]): string {
    if (nodes.length === 0) {
      return 'No relevant files found in the knowledge graph.';
    }

    const byType: Record<string, number> = {};
    const byFeature: Record<string, number> = {};

    nodes.forEach(node => {
      byType[node.type] = (byType[node.type] || 0) + 1;
      if (node.feature) {
        byFeature[node.feature] = (byFeature[node.feature] || 0) + 1;
      }
    });

    const typeSummary = Object.entries(byType)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ');

    const featureSummary = Object.keys(byFeature).length > 0
      ? `Features involved: ${Object.keys(byFeature).join(', ')}`
      : 'No specific feature identified';

    return `Found ${nodes.length} relevant nodes: ${typeSummary}. ${featureSummary}.`;
  }

  /**
   * Intelligently identify relevant files for a change request
   */
  async identifyRelevantFiles(request: string): Promise<{
    filesToRead: string[];
    filesToEdit: string[];
    testsToRun: string[];
    databaseObjects: { tables: string[]; rpcs: string[] };
    reasoning: string;
  }> {
    // Get initial context
    const context = await this.getContext(request);

    // Filter by relevance threshold
    const highRelevance = context.relevantNodes.filter(n => n.relevance > 0.1);

    const filesToRead = highRelevance
      .filter(n => ['route', 'api', 'component', 'service'].includes(n.type))
      .map(n => n.path);

    // Identify files to edit based on keywords in request
    const editKeywords = ['fix', 'update', 'change', 'modify', 'add', 'remove', 'create'];
    const shouldEdit = editKeywords.some(kw => request.toLowerCase().includes(kw));

    const filesToEdit = shouldEdit ? filesToRead.slice(0, 5) : [];

    // Find related tests
    const testsToRun = highRelevance
      .filter(n => n.type === 'file' && n.path.includes('.test.'))
      .map(n => n.path);

    // Get database objects for involved features
    let allTables: string[] = [];
    let allRpcs: string[] = [];

    for (const feature of context.featuresInvolved) {
      const dbObjects = await this.getFeatureDatabaseObjects(feature);
      allTables.push(...dbObjects.tables);
      allRpcs.push(...dbObjects.rpcs);
    }

    const reasoning = `Identified ${filesToRead.length} files to read based on query relevance. ` +
      `${filesToEdit.length > 0 ? `Suggested ${filesToEdit.length} files for editing. ` : ''}` +
      `Found ${testsToRun.length} related test files. ` +
      `Database objects: ${allTables.length} tables, ${allRpcs.length} RPCs.`;

    return {
      filesToRead: Array.from(new Set(filesToRead)),
      filesToEdit: Array.from(new Set(filesToEdit)),
      testsToRun: Array.from(new Set(testsToRun)),
      databaseObjects: {
        tables: Array.from(new Set(allTables)),
        rpcs: Array.from(new Set(allRpcs))
      },
      reasoning
    };
  }
}
