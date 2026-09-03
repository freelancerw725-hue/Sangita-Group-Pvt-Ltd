/**
 * Embeddings Generator for Semantic Search
 * Generates vector embeddings for graph nodes
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  batchGenerateEmbeddings(texts: string[]): Promise<number[][]>;
}

/**
 * OpenAI Embeddings Provider
 */
export class OpenAIEmbeddingsProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'text-embedding-ada-002') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: this.model
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    // OpenAI supports batch embeddings
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: texts,
        model: this.model
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }
}

/**
 * Local Embeddings Provider (fallback)
 * Uses a simple hashing-based approach for offline/demo usage
 */
export class LocalEmbeddingsProvider implements EmbeddingProvider {
  private dimension: number;

  constructor(dimension = 1536) {
    this.dimension = dimension;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Simple hash-based embedding (not production-quality, but works offline)
    const embedding = new Array(this.dimension).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      const index = (char * i) % this.dimension;
      embedding[index] += Math.sin(char + i);
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (magnitude || 1));
  }

  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }
}

/**
 * Embeddings Service
 * Manages embedding generation and storage
 */
export class EmbeddingsService {
  private supabase: SupabaseClient<Database>;
  private provider: EmbeddingProvider;

  constructor(
    supabaseUrl: string, 
    supabaseServiceKey: string,
    provider?: EmbeddingProvider
  ) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
    
    // Use OpenAI if API key is available, otherwise use local
    const openaiKey = process.env.OPENAI_API_KEY;
    this.provider = provider || (
      openaiKey 
        ? new OpenAIEmbeddingsProvider(openaiKey)
        : new LocalEmbeddingsProvider()
    );
  }

  /**
   * Generate and store embeddings for all nodes without embeddings
   */
  async generateMissingEmbeddings(batchSize = 100): Promise<number> {
    let totalGenerated = 0;

    while (true) {
      // Get nodes without embeddings
      const { data: nodes, error } = await this.supabase
        .from('project_graph_nodes')
        .select('id, name, path, search_text, metadata')
        .is('embedding', null)
        .eq('status', 'active')
        .limit(batchSize);

      if (error) throw error;
      if (!nodes || nodes.length === 0) break;

      console.log(`Generating embeddings for ${nodes.length} nodes...`);

      // Prepare texts for embedding
      const texts = nodes.map(node => this.buildEmbeddingText(node));

      // Generate embeddings in batch
      const embeddings = await this.provider.batchGenerateEmbeddings(texts);

      // Store embeddings
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const embedding = embeddings[i];

        await this.supabase
          .from('project_graph_nodes')
          .update({ embedding: JSON.stringify(embedding) })
          .eq('id', node.id);

        totalGenerated++;
      }

      console.log(`✓ Generated ${totalGenerated} embeddings so far...`);
    }

    return totalGenerated;
  }

  /**
   * Generate embedding for a single node
   */
  async generateNodeEmbedding(nodeId: string): Promise<void> {
    // Get node data
    const { data: node, error } = await this.supabase
      .from('project_graph_nodes')
      .select('id, name, path, search_text, metadata')
      .eq('id', nodeId)
      .single();

    if (error) throw error;
    if (!node) return;

    // Build text
    const text = this.buildEmbeddingText(node);

    // Generate embedding
    const embedding = await this.provider.generateEmbedding(text);

    // Store embedding
    await this.supabase
      .from('project_graph_nodes')
      .update({ embedding: JSON.stringify(embedding) })
      .eq('id', nodeId);
  }

  /**
   * Build embedding text from node data
   */
  private buildEmbeddingText(node: any): string {
    const parts = [
      node.name,
      node.path,
      node.search_text || ''
    ];

    // Add metadata context
    if (node.metadata) {
      if (node.metadata.exports) {
        parts.push(`exports: ${node.metadata.exports.join(', ')}`);
      }
      if (node.metadata.functions) {
        parts.push(`functions: ${node.metadata.functions.join(', ')}`);
      }
      if (node.metadata.components) {
        parts.push(`components: ${node.metadata.components.join(', ')}`);
      }
      if (node.metadata.endpoint) {
        parts.push(`endpoint: ${node.metadata.endpoint}`);
      }
    }

    return parts.filter(Boolean).join(' | ');
  }

  /**
   * Search nodes using embeddings
   */
  async searchSemantic(query: string, limit = 20): Promise<any[]> {
    // Generate query embedding
    const queryEmbedding = await this.provider.generateEmbedding(query);

    // Search using RPC
    const { data, error } = await this.supabase.rpc('semantic_search_nodes', {
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_similarity_threshold: 0.7,
      p_limit: limit
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Hybrid search: combines keyword and semantic search
   */
  async searchHybrid(query: string, limit = 20): Promise<any[]> {
    // Generate query embedding
    const queryEmbedding = await this.provider.generateEmbedding(query);

    // Search using RPC
    const { data, error } = await this.supabase.rpc('hybrid_search_nodes', {
      p_query: query,
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_limit: limit
    });

    if (error) throw error;
    return data || [];
  }
}
