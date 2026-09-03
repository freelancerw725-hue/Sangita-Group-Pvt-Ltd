/**
 * React Hook for Project Knowledge Graph
 */

import { useState, useCallback } from 'react';

export interface RelevantFiles {
  filesToRead: string[];
  filesToEdit: string[];
  testsToRun: string[];
  databaseObjects: {
    tables: string[];
    rpcs: string[];
  };
  reasoning: string;
}

export interface DependencyChain {
  node_id: string;
  node_path: string;
  node_type: string;
  node_name: string;
  depth: number;
  relationship: string;
}

export interface ImpactAnalysis {
  affectedFiles: string[];
  affectedFeatures: string[];
  testsToRun: string[];
}

export function useProjectGraph() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identifyRelevantFiles = useCallback(async (query: string): Promise<RelevantFiles | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/project-graph/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'identify_files',
          query
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to identify files: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getContext = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/project-graph/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_context',
          query
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get context: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDependencyChain = useCallback(async (filePath: string): Promise<DependencyChain[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/project-graph/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dependency_chain',
          filePath
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get dependency chain: ${response.statusText}`);
      }

      const data = await response.json();
      return data.chain;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeImpact = useCallback(async (filePath: string): Promise<ImpactAnalysis | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/project-graph/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'impact_analysis',
          filePath
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze impact: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFeatureOverview = useCallback(async (feature: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/project-graph/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'feature_overview',
          feature
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get feature overview: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerIndexing = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/project-graph?action=index');

      if (!response.ok) {
        throw new Error(`Failed to trigger indexing: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    identifyRelevantFiles,
    getContext,
    getDependencyChain,
    analyzeImpact,
    getFeatureOverview,
    triggerIndexing
  };
}
