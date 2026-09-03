/**
 * AI Context Retrieval API
 */

import { createAPIFileRoute } from '@tanstack/react-start/api';
import { AIContextRetriever } from '@/lib/project-graph/ai-context';

export const Route = createAPIFileRoute('/api/project-graph/context')({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { query, action } = body;

      if (!query) {
        return Response.json(
          { error: 'Query parameter required' },
          { status: 400 }
        );
      }

      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        return Response.json(
          { error: 'Supabase configuration missing' },
          { status: 500 }
        );
      }

      const retriever = new AIContextRetriever(supabaseUrl, supabaseAnonKey);

      switch (action) {
        case 'identify_files': {
          const result = await retriever.identifyRelevantFiles(query);
          return Response.json(result);
        }

        case 'get_context': {
          const context = await retriever.getContext(query);
          return Response.json(context);
        }

        case 'dependency_chain': {
          const { filePath } = body;
          if (!filePath) {
            return Response.json(
              { error: 'filePath required for dependency_chain' },
              { status: 400 }
            );
          }
          const chain = await retriever.getDependencyChain(filePath);
          return Response.json({ chain });
        }

        case 'impact_analysis': {
          const { filePath } = body;
          if (!filePath) {
            return Response.json(
              { error: 'filePath required for impact_analysis' },
              { status: 400 }
            );
          }
          const impact = await retriever.analyzeImpact(filePath);
          return Response.json(impact);
        }

        case 'feature_overview': {
          const { feature } = body;
          if (!feature) {
            return Response.json(
              { error: 'feature required for feature_overview' },
              { status: 400 }
            );
          }
          const overview = await retriever.getFeatureOverview(feature);
          return Response.json(overview);
        }

        default:
          return Response.json(
            { error: 'Invalid action. Valid actions: identify_files, get_context, dependency_chain, impact_analysis, feature_overview' },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error('AI Context API error:', error);
      return Response.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
});
