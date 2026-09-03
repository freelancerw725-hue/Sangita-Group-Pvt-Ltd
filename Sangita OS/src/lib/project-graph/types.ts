/**
 * TypeScript types for Project Graph database tables
 */

export interface ProjectGraphNode {
  id: string;
  node_type: string;
  path: string;
  name: string;
  feature?: string;
  module?: string;
  metadata: Record<string, any>;
  search_text?: string;
  status: string;
  has_tests: boolean;
  has_errors: boolean;
  file_hash?: string;
  last_indexed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectGraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  edge_type: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ProjectGraphIndexJob {
  id: string;
  job_type: string;
  status: string;
  files_scanned?: number;
  nodes_created?: number;
  nodes_updated?: number;
  edges_created?: number;
  errors?: any[];
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      project_graph_nodes: {
        Row: ProjectGraphNode;
        Insert: Omit<ProjectGraphNode, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ProjectGraphNode, 'id' | 'created_at'>>;
      };
      project_graph_edges: {
        Row: ProjectGraphEdge;
        Insert: Omit<ProjectGraphEdge, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ProjectGraphEdge, 'id' | 'created_at'>>;
      };
      project_graph_index_jobs: {
        Row: ProjectGraphIndexJob;
        Insert: Omit<ProjectGraphIndexJob, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ProjectGraphIndexJob, 'id' | 'created_at'>>;
      };
    };
  };
}
