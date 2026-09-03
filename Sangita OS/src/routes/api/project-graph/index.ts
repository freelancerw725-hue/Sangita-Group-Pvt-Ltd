/**
 * Project Graph API - Trigger indexing
 */

import { createAPIFileRoute } from '@tanstack/react-start/api';
import { ProjectGraphIndexer } from '@/lib/project-graph/indexer';

export const Route = createAPIFileRoute('/api/project-graph')({
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url);
      const action = url.searchParams.get('action');

      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        return Response.json(
          { error: 'Supabase configuration missing' },
          { status: 500 }
        );
      }

      const projectRoot = process.cwd();
      const indexer = new ProjectGraphIndexer(supabaseUrl, supabaseServiceKey, projectRoot);

      if (action === 'index') {
        // Trigger full index
        const stats = await indexer.indexProject();
        return Response.json({
          success: true,
          stats
        });
      }

      // Return status
      return Response.json({
        success: true,
        message: 'Project Graph API',
        actions: ['index']
      });
    } catch (error) {
      console.error('Project Graph API error:', error);
      return Response.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
});
