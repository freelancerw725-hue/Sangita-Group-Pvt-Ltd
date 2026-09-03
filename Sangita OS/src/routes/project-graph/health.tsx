/**
 * Knowledge Graph Health & Validation Screen
 * Shows system health, validation issues, and indexing status
 */

import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '~/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Database, 
  FileText, 
  GitBranch, 
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';

export const Route = createFileRoute('/project-graph/health')({
  component: HealthScreen
});

function HealthScreen() {
  // Fetch graph health
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['graph-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_graph_health');
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 30000 // Refresh every 30s
  });

  // Fetch validation issues
  const { data: issues, isLoading: issuesLoading, refetch: refetchIssues } = useQuery({
    queryKey: ['validation-issues'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_validation_issues', { 
        p_severity: null, 
        p_type: null, 
        p_limit: 100 
      });
      if (error) throw error;
      return data;
    }
  });

  // Fetch recent index jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['index-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_graph_index_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  // Fetch git sync history
  const { data: gitSyncs, isLoading: gitLoading } = useQuery({
    queryKey: ['git-syncs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_graph_git_sync')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  const handleRefresh = async () => {
    await Promise.all([refetchHealth(), refetchIssues()]);
  };

  const handleRunIndexing = async () => {
    // Trigger indexing via API
    try {
      const response = await fetch('/api/graph/index', { method: 'POST' });
      if (!response.ok) throw new Error('Indexing failed');
      await handleRefresh();
    } catch (error) {
      console.error('Failed to trigger indexing:', error);
    }
  };

  if (healthLoading || issuesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const errorCount = issues?.filter(i => i.severity === 'error').length || 0;
  const warningCount = issues?.filter(i => i.severity === 'warning').length || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Graph Health</h1>
          <p className="text-muted-foreground">System status, validation issues, and indexing history</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleRunIndexing} size="sm">
            <Database className="w-4 h-4 mr-2" />
            Run Indexing
          </Button>
        </div>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
            <Database className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.total_nodes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {health?.indexed_files || 0} files indexed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Edges</CardTitle>
            <GitBranch className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.total_edges || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Connections between nodes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{errorCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {health?.broken_imports || 0} broken imports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{warningCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {health?.stale_nodes || 0} stale nodes
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="issues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="issues">Validation Issues</TabsTrigger>
          <TabsTrigger value="jobs">Index Jobs</TabsTrigger>
          <TabsTrigger value="git">Git Sync</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validation Issues</CardTitle>
            </CardHeader>
            <CardContent>
              {!issues || issues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                  <p className="text-lg font-medium">No issues found</p>
                  <p className="text-sm text-muted-foreground">Your knowledge graph is healthy!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {issues.map((issue: any) => (
                    <div key={issue.issue_id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {issue.severity === 'error' ? (
                            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                          ) : issue.severity === 'warning' ? (
                            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                          ) : (
                            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={
                                issue.severity === 'error' ? 'destructive' : 
                                issue.severity === 'warning' ? 'default' : 
                                'secondary'
                              }>
                                {issue.validation_type.replace('_', ' ')}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {issue.file_path}
                                {issue.line_number && `:${issue.line_number}`}
                              </span>
                            </div>
                            <p className="text-sm">{issue.message}</p>
                            {issue.details && Object.keys(issue.details).length > 0 && (
                              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                                {JSON.stringify(issue.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Index Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {jobs?.map((job: any) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'failed' ? 'destructive' :
                            job.status === 'running' ? 'secondary' :
                            'outline'
                          }>
                            {job.status}
                          </Badge>
                          <span className="font-medium">{job.job_type}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {job.files_scanned || 0} files scanned, {job.nodes_created || 0} nodes created, {job.edges_created || 0} edges created
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(job.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    {job.errors && job.errors.length > 0 && (
                      <div className="mt-2 text-sm text-destructive">
                        {job.errors.length} errors occurred
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="git" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Git Sync History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gitSyncs?.map((sync: any) => (
                  <div key={sync.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={
                            sync.sync_status === 'completed' ? 'default' :
                            sync.sync_status === 'failed' ? 'destructive' :
                            'secondary'
                          }>
                            {sync.sync_status}
                          </Badge>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {sync.commit_hash?.slice(0, 8)}
                          </code>
                          <span className="text-sm text-muted-foreground">{sync.branch}</span>
                        </div>
                        <p className="text-sm mb-2">{sync.commit_message}</p>
                        <p className="text-xs text-muted-foreground">
                          {sync.files_changed?.length || 0} files changed
                          {sync.files_added && ` • ${sync.files_added.length} added`}
                          {sync.files_deleted && ` • ${sync.files_deleted.length} deleted`}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{sync.author}</div>
                        <div>{new Date(sync.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Health Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Validation Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {health?.validation_summary && Object.entries(health.validation_summary).map(([type, count]: [string, any]) => (
                      <div key={type} className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">{type.replace('_', ' ')}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Last Index Job</h3>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(health?.last_index_job, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
