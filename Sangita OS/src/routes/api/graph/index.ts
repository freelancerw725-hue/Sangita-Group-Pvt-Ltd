/**
 * API endpoint to trigger graph indexing
 * POST /api/graph/index
 */

import { createAPIFileRoute } from '@tanstack/start/api';
import { ProjectGraphIndexer } from '~/lib/project-graph/indexer';
import * as path from 'path';

export const Route = createAPIFileRoute('/api/graph/index')({
  POST: async ({ request }) => {
    try {
      const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return new Response(
          JSON.stringify({ error: 'Missing Supabase configuration' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const PROJECT_ROOT = path.resolve(process.cwd());
      const indexer = new ProjectGraphIndexer(SUPABASE_URL, SUPABASE_SERVICE_KEY, PROJECT_ROOT);

      // Run indexing
      const stats = await indexer.indexProject(true);

      return new Response(
        JSON.stringify({
          success: true,
          stats
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error('Indexing error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Indexing failed',
          message: error instanceof Error ? error.message : String(error)
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
});
