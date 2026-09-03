/**
 * Git Integration for Knowledge Graph
 * Automatically syncs changed files with the graph
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as path from 'path';
import { ProjectGraphIndexer } from './indexer';
import type { Database } from './types';

export class GitSync {
  private supabase: SupabaseClient<Database>;
  private projectRoot: string;
  private indexer: ProjectGraphIndexer;

  constructor(supabaseUrl: string, supabaseServiceKey: string, projectRoot: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
    this.projectRoot = projectRoot;
    this.indexer = new ProjectGraphIndexer(supabaseUrl, supabaseServiceKey, projectRoot);
  }

  /**
   * Sync changes from last git commit
   */
  async syncLastCommit(): Promise<void> {
    try {
      // Get last commit info
      const commitHash = execSync('git rev-parse HEAD', { cwd: this.projectRoot })
        .toString()
        .trim();
      
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: this.projectRoot })
        .toString()
        .trim();
      
      const author = execSync('git log -1 --format="%an"', { cwd: this.projectRoot })
        .toString()
        .trim();
      
      const commitMessage = execSync('git log -1 --format="%s"', { cwd: this.projectRoot })
        .toString()
        .trim();

      // Check if already synced
      const { data: existing } = await this.supabase
        .from('project_graph_git_sync')
        .select('id')
        .eq('commit_hash', commitHash)
        .single();

      if (existing) {
        console.log(`Commit ${commitHash.slice(0, 8)} already synced`);
        return;
      }

      // Get changed files in last commit
      const changedFiles = execSync('git diff-tree --no-commit-id --name-only -r HEAD', { 
        cwd: this.projectRoot 
      })
        .toString()
        .trim()
        .split('\n')
        .filter(f => f.length > 0);

      // Categorize changes
      const filesAdded: string[] = [];
      const filesModified: string[] = [];
      const filesDeleted: string[] = [];

      for (const file of changedFiles) {
        const status = execSync(`git diff-tree --no-commit-id --name-status -r HEAD | grep "${file}"`, {
          cwd: this.projectRoot
        })
          .toString()
          .trim()
          .charAt(0);

        if (status === 'A') filesAdded.push(file);
        else if (status === 'D') filesDeleted.push(file);
        else filesModified.push(file);
      }

      // Create git sync record
      const { data: gitSync, error } = await this.supabase
        .from('project_graph_git_sync')
        .insert({
          commit_hash: commitHash,
          branch,
          author,
          commit_message: commitMessage,
          files_changed: changedFiles,
          files_added: filesAdded.length > 0 ? filesAdded : null,
          files_deleted: filesDeleted.length > 0 ? filesDeleted : null,
          sync_status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;

      // Update sync status to syncing
      await this.supabase
        .from('project_graph_git_sync')
        .update({ sync_status: 'syncing' })
        .eq('id', gitSync.id);

      // Index changed files
      const filesToIndex = [...filesAdded, ...filesModified].filter(f => 
        f.startsWith('src/') && 
        (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx'))
      );

      if (filesToIndex.length > 0) {
        console.log(`Indexing ${filesToIndex.length} changed files...`);
        await this.indexer.indexFiles(filesToIndex);
      }

      // Delete nodes for deleted files
      for (const file of filesDeleted) {
        await this.supabase
          .from('project_graph_nodes')
          .update({ status: 'deprecated' })
          .eq('path', file);
      }

      // Mark as completed
      await this.supabase
        .from('project_graph_git_sync')
        .update({ 
          sync_status: 'completed',
          synced_at: new Date().toISOString()
        })
        .eq('id', gitSync.id);

      console.log(`✓ Synced commit ${commitHash.slice(0, 8)}: ${filesAdded.length} added, ${filesModified.length} modified, ${filesDeleted.length} deleted`);
    } catch (error) {
      console.error('Git sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync changes since last indexed commit
   */
  async syncSinceLastIndexed(): Promise<void> {
    try {
      // Get last synced commit
      const { data: lastSync } = await this.supabase
        .from('project_graph_git_sync')
        .select('commit_hash')
        .eq('sync_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastSync) {
        console.log('No previous sync found, syncing last commit only');
        return await this.syncLastCommit();
      }

      const lastCommit = lastSync.commit_hash;
      const currentCommit = execSync('git rev-parse HEAD', { cwd: this.projectRoot })
        .toString()
        .trim();

      if (lastCommit === currentCommit) {
        console.log('Already up to date');
        return;
      }

      // Get all commits since last sync
      const commits = execSync(`git log ${lastCommit}..${currentCommit} --format=%H`, {
        cwd: this.projectRoot
      })
        .toString()
        .trim()
        .split('\n')
        .filter(c => c.length > 0)
        .reverse(); // Process oldest first

      console.log(`Syncing ${commits.length} commits since ${lastCommit.slice(0, 8)}...`);

      for (const commit of commits) {
        // Checkout each commit temporarily (just to analyze)
        const changedFiles = execSync(`git diff-tree --no-commit-id --name-only -r ${commit}`, {
          cwd: this.projectRoot
        })
          .toString()
          .trim()
          .split('\n')
          .filter(f => f.length > 0 && f.startsWith('src/'));

        if (changedFiles.length > 0) {
          await this.indexer.indexFiles(changedFiles);
        }
      }

      console.log(`✓ Synced ${commits.length} commits`);
    } catch (error) {
      console.error('Git sync failed:', error);
      throw error;
    }
  }

  /**
   * Watch for git changes and auto-sync
   */
  watchGitChanges(intervalMs = 60000): void {
    console.log(`Watching for git changes every ${intervalMs / 1000}s...`);

    setInterval(async () => {
      try {
        await this.syncLastCommit();
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Install git post-commit hook
   */
  installGitHook(): void {
    const hookPath = path.join(this.projectRoot, '.git', 'hooks', 'post-commit');
    const hookContent = `#!/bin/sh
# Auto-sync Knowledge Graph after commit
cd "$(git rev-parse --show-toplevel)"
npm run sync-graph || true
`;

    const fs = require('fs');
    fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
    console.log('✓ Installed git post-commit hook');
  }
}
