/**
 * AI Development Agent API
 * Execute development requests via API
 */

import { createAPIFileRoute } from '@tanstack/react-start/api';
import { GraphAwareDevelopmentAgent } from '@/lib/ai-dev-agent/graph-aware-agent';
import { CommandParser } from '@/lib/ai-dev-agent/command-parser';

export const Route = createAPIFileRoute('/api/ai-dev/execute')({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { command, dryRun = true } = body;

      if (!command) {
        return Response.json(
          { error: 'Command parameter required' },
          { status: 400 }
        );
      }

      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
        return Response.json(
          { error: 'Supabase configuration missing' },
          { status: 500 }
        );
      }

      // Parse command
      const parsed = CommandParser.parse(command);

      if (!CommandParser.validate(parsed)) {
        return Response.json(
          { error: 'Invalid command', help: CommandParser.getHelp() },
          { status: 400 }
        );
      }

      // Create agent
      const projectRoot = process.cwd();
      const agent = new GraphAwareDevelopmentAgent(
        supabaseUrl,
        supabaseAnonKey,
        supabaseServiceKey,
        projectRoot,
        dryRun
      );

      // Handle query commands
      if (parsed.request.type === 'query') {
        const queryResult = await handleQueryCommand(agent, command);
        return Response.json(queryResult);
      }

      // Execute development request
      const result = await agent.executeDevelopmentRequest(parsed.request);

      return Response.json({
        success: result.success,
        command: parsed.request,
        result,
        dryRun
      });

    } catch (error) {
      console.error('AI Dev API error:', error);
      return Response.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
});

async function handleQueryCommand(
  agent: GraphAwareDevelopmentAgent,
  command: string
) {
  const lowerCommand = command.toLowerCase();

  // "Find what depends on X"
  if (lowerCommand.includes('depends on') || lowerCommand.includes('uses')) {
    const fileMatch = command.match(/depends on (.+?)(?:\?|$)/i) ||
                     command.match(/uses (.+?)(?:\?|$)/i);
    
    if (fileMatch) {
      const filePath = fileMatch[1].trim();
      const result = await agent.findDependents(filePath);
      return {
        type: 'dependents',
        filePath,
        result
      };
    }
  }

  // "Show everything connected to X"
  if (lowerCommand.includes('show') || lowerCommand.includes('connected to')) {
    const featureMatch = command.match(/(?:show|connected to) (.+?)(?:\?|$)/i);
    
    if (featureMatch) {
      const featureInput = featureMatch[1].trim().toLowerCase();
      
      const featureMap: Record<string, string> = {
        'bulk email': 'bulk-email',
        'bulk mail': 'bulk-email',
        'email': 'bulk-email',
        'keyword': 'keywords',
        'leads': 'leads',
        'crm': 'crm',
        'ai insights': 'ai-insights',
        'tasks': 'tasks',
        'finance': 'finance'
      };

      const feature = featureMap[featureInput] || featureInput;
      const result = await agent.showFeatureConnections(feature);
      
      return {
        type: 'feature_connections',
        feature,
        result
      };
    }
  }

  return {
    type: 'unknown_query',
    error: 'Could not parse query command'
  };
}
