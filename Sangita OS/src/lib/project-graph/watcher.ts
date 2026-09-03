/**
 * File System Watcher for Automatic Re-indexing
 * Watches for file changes and triggers incremental indexing
 */

import * as fs from 'fs';
import { ProjectGraphIndexer } from './indexer';
import * as path from 'path';

export class ProjectGraphWatcher {
  private indexer: ProjectGraphIndexer;
  private projectRoot: string;
  private watchers: any[] = [];
  private changeQueue: Set<string> = new Set();
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_MS = 2000; // Wait 2s after last change

  constructor(
    supabaseUrl: string,
    supabaseServiceKey: string,
    projectRoot: string
  ) {
    this.indexer = new ProjectGraphIndexer(supabaseUrl, supabaseServiceKey, projectRoot);
    this.projectRoot = projectRoot;
  }

  /**
   * Start watching for file changes
   */
  start(): void {
    console.log('🔍 Starting Project Graph file watcher...');

    // Watch src directory
    this.watchDirectory(path.join(this.projectRoot, 'src'));

    // Watch supabase migrations
    this.watchDirectory(path.join(this.projectRoot, 'supabase', 'migrations'));

    console.log('✅ Project Graph watcher started');
  }

  /**
   * Stop watching
   */
  stop(): void {
    this.watchers.forEach((watcher: any) => watcher.close());
    this.watchers = [];
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    console.log('🛑 Project Graph watcher stopped');
  }

  /**
   * Watch a directory for changes
   */
  private watchDirectory(dir: string): void {
    try {
      const watcher = fs.watch(
        dir,
        { recursive: true },
        (eventType, filename) => {
          if (!filename) return;

          // Skip node_modules, build artifacts
          if (
            filename.includes('node_modules') ||
            filename.includes('.output') ||
            filename.includes('dist') ||
            filename.includes('.next')
          ) {
            return;
          }

          // Only watch relevant files
          const ext = path.extname(filename);
          if (!['.ts', '.tsx', '.js', '.jsx', '.sql'].includes(ext)) {
            return;
          }

          const fullPath = path.join(dir, filename);
          this.queueChange(fullPath);
        }
      );

      this.watchers.push(watcher);
    } catch (error) {
      console.error(`Failed to watch directory ${dir}:`, error);
    }
  }

  /**
   * Queue a file change for processing
   */
  private queueChange(filePath: string): void {
    this.changeQueue.add(filePath);

    // Debounce: wait for changes to settle
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processChanges();
    }, this.DEBOUNCE_MS);
  }

  /**
   * Process queued file changes
   */
  private async processChanges(): Promise<void> {
    if (this.changeQueue.size === 0) return;

    const files = Array.from(this.changeQueue);
    this.changeQueue.clear();

    console.log(`📝 Indexing ${files.length} changed files...`);

    try {
      await this.indexer.indexFiles(files);
      console.log('✅ Re-indexing complete');
    } catch (error) {
      console.error('❌ Re-indexing failed:', error);
    }
  }
}
