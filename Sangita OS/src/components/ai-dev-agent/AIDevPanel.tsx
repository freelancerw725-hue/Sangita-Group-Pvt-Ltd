/**
 * AI Development Agent Panel
 * Interactive UI for graph-aware AI development
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ExecutionResult {
  success: boolean;
  filesModified: string[];
  testsRun: string[];
  testsPassed: boolean;
  typecheckPassed: boolean;
  errors: string[];
  warnings: string[];
  graphUpdated: boolean;
}

export function AIDevPanel() {
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dryRun, setDryRun] = useState(true);

  const exampleCommands = [
    'Fix Bulk Email campaign creation',
    'Add a field to Leads',
    'Fix AI Insights',
    'Change Keyword Intelligence',
    'Find what depends on campaigns.ts',
    'Show everything connected to Bulk Email'
  ];

  async function executeCommand() {
    if (!command.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/ai-dev/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, dryRun })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-white">
      {/* Header */}
      <div className="border-b border-neutral-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              🤖 AI Development Agent
            </h2>
            <p className="text-sm text-neutral-400">
              Graph-aware intelligent code changes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded"
              />
              Dry Run
            </label>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex gap-2">
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
            placeholder="Enter command (e.g., Fix Bulk Email campaign creation)"
            className="flex-1 bg-neutral-900 border-neutral-800"
            disabled={loading}
          />
          <Button
            onClick={executeCommand}
            disabled={loading || !command.trim()}
          >
            {loading ? 'Executing...' : 'Execute'}
          </Button>
        </div>

        {/* Examples */}
        <div className="mt-3">
          <p className="text-xs text-neutral-500 mb-2">Examples:</p>
          <div className="flex flex-wrap gap-2">
            {exampleCommands.map((cmd, i) => (
              <button
                key={i}
                onClick={() => setCommand(cmd)}
                className="text-xs px-2 py-1 bg-neutral-900 hover:bg-neutral-800 rounded border border-neutral-800 transition"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">🧠</div>
              <p className="text-neutral-400">Processing request...</p>
              <p className="text-xs text-neutral-600 mt-2">
                Querying knowledge graph and analyzing dependencies
              </p>
            </div>
          </div>
        )}

        {!loading && result && (
          <div className="space-y-4">
            {/* Status */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">
                  {result.success ? '✅' : '❌'}
                </span>
                <span className="font-semibold">
                  {result.success ? 'Success' : 'Failed'}
                </span>
                {result.dryRun && (
                  <Badge variant="outline" className="ml-auto">
                    Dry Run
                  </Badge>
                )}
              </div>

              {result.result && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Files Modified:</span>
                    <span>{result.result.filesModified?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Tests Run:</span>
                    <span>{result.result.testsRun?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Tests Passed:</span>
                    <span>{result.result.testsPassed ? '✓' : '✗'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Typecheck:</span>
                    <span>{result.result.typecheckPassed ? '✓' : '✗'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Graph Updated:</span>
                    <span>{result.result.graphUpdated ? '✓' : '✗'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Query Results */}
            {result.type === 'dependents' && result.result && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Dependents</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-neutral-400">Direct Dependents:</span>
                    <span className="ml-2">{result.result.directDependents.length}</span>
                  </div>
                  <div className="ml-4 space-y-1">
                    {result.result.directDependents.slice(0, 10).map((f: string, i: number) => (
                      <div key={i} className="text-xs text-neutral-500">
                        • {f}
                      </div>
                    ))}
                    {result.result.directDependents.length > 10 && (
                      <div className="text-xs text-neutral-600">
                        ... and {result.result.directDependents.length - 10} more
                      </div>
                    )}
                  </div>
                  <div className="pt-2">
                    <span className="text-neutral-400">Total Dependents:</span>
                    <span className="ml-2">{result.result.allDependents.length}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400">Affected Features:</span>
                    <span className="ml-2">{result.result.features.join(', ') || 'none'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Feature Connections */}
            {result.type === 'feature_connections' && result.result && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
                <h3 className="font-semibold mb-3 capitalize">{result.feature} Feature</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-neutral-400 mb-1">Files ({result.result.files.length}):</div>
                    <div className="ml-4 space-y-1">
                      {result.result.files.slice(0, 10).map((f: string, i: number) => (
                        <div key={i} className="text-xs text-neutral-500">
                          • {f}
                        </div>
                      ))}
                      {result.result.files.length > 10 && (
                        <div className="text-xs text-neutral-600">
                          ... and {result.result.files.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-neutral-400 mb-1">APIs ({result.result.apis.length}):</div>
                    <div className="ml-4 space-y-1">
                      {result.result.apis.map((f: string, i: number) => (
                        <div key={i} className="text-xs text-neutral-500">
                          • {f}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-neutral-400 mb-1">Database Tables ({result.result.dbTables.length}):</div>
                    <div className="ml-4 space-y-1">
                      {result.result.dbTables.map((t: string, i: number) => (
                        <div key={i} className="text-xs text-neutral-500">
                          • {t}
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.result.dbRPCs.length > 0 && (
                    <div>
                      <div className="text-neutral-400 mb-1">Database RPCs ({result.result.dbRPCs.length}):</div>
                      <div className="ml-4 space-y-1">
                        {result.result.dbRPCs.map((r: string, i: number) => (
                          <div key={i} className="text-xs text-neutral-500">
                            • {r}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Errors */}
            {result.result?.errors && result.result.errors.length > 0 && (
              <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-red-400">Errors</h3>
                <div className="space-y-1 text-sm">
                  {result.result.errors.map((err: string, i: number) => (
                    <div key={i} className="text-red-300">
                      • {err}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {result.result?.warnings && result.result.warnings.length > 0 && (
              <div className="bg-yellow-950/20 border border-yellow-900/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-yellow-400">Warnings</h3>
                <div className="space-y-1 text-sm">
                  {result.result.warnings.map((warn: string, i: number) => (
                    <div key={i} className="text-yellow-300">
                      • {warn}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generic Error */}
            {result.error && (
              <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-red-400">Error</h3>
                <p className="text-sm text-red-300">{result.error}</p>
              </div>
            )}
          </div>
        )}

        {!loading && !result && (
          <div className="flex items-center justify-center h-full text-neutral-500">
            <div className="text-center max-w-md">
              <div className="text-4xl mb-4">🤖</div>
              <p className="mb-2">Graph-Aware AI Development Agent</p>
              <p className="text-sm text-neutral-600">
                Enter a command above to get started. The agent will query the knowledge graph,
                analyze dependencies, and make targeted changes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
