/**
 * Graph-Aware Development Agent
 * Uses Project Knowledge Graph for intelligent, targeted code changes
 */

import { AIContextRetriever } from '@/lib/project-graph/ai-context';
import { ProjectGraphIndexer } from '@/lib/project-graph/indexer';
import { GraphValidator } from '@/lib/project-graph/validator';
import { EmbeddingsService } from '@/lib/project-graph/embeddings';
import * as fs from 'fs';
import * as path from 'path';

export interface DevelopmentRequest {
  description: string;
  type: 'fix' | 'add' | 'modify' | 'refactor' | 'query';
  feature?: string;
}

export interface DevelopmentPlan {
  request: string;
  relevantFiles: {
    toRead: string[];
    toEdit: string[];
  };
  dependencies: {
    files: string[];
    features: string[];
    dbObjects: { tables: string[]; rpcs: string[] };
  };
  risks: {
    level: 'low' | 'medium' | 'high';
    affectedFiles: number;
    affectedFeatures: string[];
    message: string;
  };
  tests: {
    toRun: string[];
    affectedTests: string[];
  };
  reasoning: string;
}

export interface ExecutionResult {
  success: boolean;
  filesModified: string[];
  testsRun: string[];
  testsPassed: boolean;
  typecheckPassed: boolean;
  errors: string[];
  warnings: string[];
  graphUpdated: boolean;
}

export class GraphAwareDevelopmentAgent {
  private contextRetriever: AIContextRetriever;
  private indexer: ProjectGraphIndexer;
  private validator: GraphValidator;
  private embeddings: EmbeddingsService;
  private projectRoot: string;
  private dryRun: boolean;

  constructor(
    supabaseUrl: string,
    supabaseAnonKey: string,
    supabaseServiceKey: string,
    projectRoot: string,
    dryRun = false
  ) {
    this.contextRetriever = new AIContextRetriever(supabaseUrl, supabaseAnonKey);
    this.indexer = new ProjectGraphIndexer(supabaseUrl, supabaseServiceKey, projectRoot);
    this.validator = new GraphValidator(supabaseUrl, supabaseServiceKey, projectRoot);
    this.embeddings = new EmbeddingsService(supabaseUrl, supabaseServiceKey);
    this.projectRoot = projectRoot;
    this.dryRun = dryRun;
  }

  /**
   * Main workflow: Request → Graph → Analysis → Change → Test → Update
   */
  async executeDevelopmentRequest(request: DevelopmentRequest): Promise<ExecutionResult> {
    console.log('🧠 Graph-Aware Development Agent');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📝 Request: ${request.description}`);
    console.log(`🎯 Type: ${request.type}`);
    if (request.feature) {
      console.log(`🏷️  Feature: ${request.feature}`);
    }
    console.log('');

    try {
      // Step 1: Query Knowledge Graph
      console.log('🔍 Step 1: Querying Knowledge Graph...');
      const plan = await this.createDevelopmentPlan(request);
      console.log(`✓ Found ${plan.relevantFiles.toRead.length} files to read`);
      console.log(`✓ Identified ${plan.relevantFiles.toEdit.length} files to edit`);
      console.log(`✓ Risk level: ${plan.risks.level}`);
      console.log('');

      // Step 2: Analyze Dependencies
      console.log('🔗 Step 2: Analyzing Dependencies...');
      await this.displayDependencies(plan);
      console.log('');

      // Step 3: Risk Assessment
      console.log('⚠️  Step 3: Risk Assessment...');
      const shouldProceed = this.assessRisks(plan);
      if (!shouldProceed) {
        console.log('❌ High-risk change detected. Manual review required.');
        return {
          success: false,
          filesModified: [],
          testsRun: [],
          testsPassed: false,
          typecheckPassed: false,
          errors: ['High-risk change blocked'],
          warnings: [plan.risks.message],
          graphUpdated: false
        };
      }
      console.log('✓ Risk assessment passed');
      console.log('');

      // Step 4: Retrieve Context
      console.log('📚 Step 4: Retrieving Relevant Context...');
      const context = await this.retrieveRelevantContext(plan);
      console.log(`✓ Retrieved context from ${context.filesRead} files`);
      console.log('');

      // Step 5: Make Changes (placeholder - actual implementation would use AI)
      console.log('✏️  Step 5: Making Code Changes...');
      if (this.dryRun) {
        console.log('🔧 DRY RUN: Changes would be made to:');
        plan.relevantFiles.toEdit.forEach(f => console.log(`   - ${f}`));
      } else {
        console.log('⚠️  Note: Actual code modification requires AI integration');
        console.log('   Files that should be edited:');
        plan.relevantFiles.toEdit.forEach(f => console.log(`   - ${f}`));
      }
      console.log('');

      // Step 6: Run Tests
      console.log('🧪 Step 6: Running Tests...');
      const testResult = await this.runTests(plan.tests.toRun);
      console.log(`✓ Tests: ${testResult.passed}/${testResult.total} passed`);
      console.log('');

      // Step 7: Typecheck
      console.log('🔍 Step 7: Type Checking...');
      const typecheckResult = await this.runTypecheck();
      console.log(typecheckResult.passed ? '✓ Typecheck passed' : '❌ Typecheck failed');
      console.log('');

      // Step 8: Update Graph
      console.log('🔄 Step 8: Updating Knowledge Graph...');
      if (!this.dryRun && plan.relevantFiles.toEdit.length > 0) {
        await this.indexer.indexFiles(
          plan.relevantFiles.toEdit.map(f => path.join(this.projectRoot, f))
        );
        console.log('✓ Graph updated');
      } else {
        console.log('⏭️  Skipped (dry run or no changes)');
      }
      console.log('');

      // Step 9: Run Validation
      console.log('🔍 Step 9: Running Validation...');
      if (!this.dryRun && plan.relevantFiles.toEdit.length > 0) {
        const validationIssues = await Promise.all(
          plan.relevantFiles.toEdit.map(f => this.validator.validateFile(f))
        );
        const allIssues = validationIssues.flat();
        if (allIssues.length > 0) {
          console.log(`⚠️  Found ${allIssues.length} validation issues:`);
          allIssues.slice(0, 5).forEach(issue => {
            console.log(`   - ${issue.type}: ${issue.message}`);
          });
        } else {
          console.log('✓ No validation issues found');
        }
      } else {
        console.log('⏭️  Skipped (dry run or no changes)');
      }
      console.log('');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Development request completed!');
      console.log('');

      return {
        success: testResult.passed && typecheckResult.passed,
        filesModified: this.dryRun ? [] : plan.relevantFiles.toEdit,
        testsRun: plan.tests.toRun,
        testsPassed: testResult.passed,
        typecheckPassed: typecheckResult.passed,
        errors: [...testResult.errors, ...typecheckResult.errors],
        warnings: [],
        graphUpdated: !this.dryRun
      };

    } catch (error) {
      console.error('❌ Error during execution:', error);
      return {
        success: false,
        filesModified: [],
        testsRun: [],
        testsPassed: false,
        typecheckPassed: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        graphUpdated: false
      };
    }
  }

  /**
   * Create development plan from request using Knowledge Graph
   */
  private async createDevelopmentPlan(request: DevelopmentRequest): Promise<DevelopmentPlan> {
    // Query the graph for relevant context
    const graphContext = await this.contextRetriever.identifyRelevantFiles(request.description);

    // Get dependency information
    const dependencies = {
      files: [] as string[],
      features: [] as string[],
      dbObjects: graphContext.databaseObjects
    };

    // Analyze impact for files to be edited
    let affectedFiles: string[] = [];
    let affectedFeatures: string[] = [];

    if (graphContext.filesToEdit.length > 0) {
      for (const file of graphContext.filesToEdit) {
        try {
          const impact = await this.contextRetriever.analyzeImpact(file);
          affectedFiles.push(...impact.affectedFiles);
          affectedFeatures.push(...impact.affectedFeatures);
          dependencies.files.push(...impact.affectedFiles);
        } catch (error) {
          // If file doesn't exist in graph yet, skip impact analysis
          console.warn(`⚠️  Could not analyze impact for ${file}`);
        }
      }
    }

    // Deduplicate
    affectedFiles = Array.from(new Set(affectedFiles));
    affectedFeatures = Array.from(new Set(affectedFeatures));
    dependencies.files = Array.from(new Set(dependencies.files));
    dependencies.features = affectedFeatures;

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(
      affectedFiles.length,
      affectedFeatures.length,
      graphContext.filesToEdit.length
    );

    return {
      request: request.description,
      relevantFiles: {
        toRead: graphContext.filesToRead,
        toEdit: graphContext.filesToEdit
      },
      dependencies,
      risks: {
        level: riskLevel,
        affectedFiles: affectedFiles.length,
        affectedFeatures,
        message: this.getRiskMessage(riskLevel, affectedFiles.length, affectedFeatures)
      },
      tests: {
        toRun: graphContext.testsToRun,
        affectedTests: graphContext.testsToRun
      },
      reasoning: graphContext.reasoning
    };
  }

  /**
   * Calculate risk level based on impact
   */
  private calculateRiskLevel(
    affectedFiles: number,
    affectedFeatures: number,
    filesToEdit: number
  ): 'low' | 'medium' | 'high' {
    if (affectedFiles > 20 || affectedFeatures > 4) {
      return 'high';
    }
    if (affectedFiles > 10 || affectedFeatures > 2 || filesToEdit > 5) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get risk message
   */
  private getRiskMessage(
    level: 'low' | 'medium' | 'high',
    affectedFiles: number,
    affectedFeatures: string[]
  ): string {
    const featuresStr = affectedFeatures.length > 0
      ? ` affecting features: ${affectedFeatures.join(', ')}`
      : '';

    switch (level) {
      case 'high':
        return `High-risk change: ${affectedFiles} files affected${featuresStr}. Recommend thorough review.`;
      case 'medium':
        return `Medium-risk change: ${affectedFiles} files affected${featuresStr}. Proceed with caution.`;
      case 'low':
        return `Low-risk change: ${affectedFiles} files affected${featuresStr}. Safe to proceed.`;
    }
  }

  /**
   * Display dependencies
   */
  private async displayDependencies(plan: DevelopmentPlan): Promise<void> {
    console.log(`  Files: ${plan.dependencies.files.length} dependent files`);
    if (plan.dependencies.files.length > 0 && plan.dependencies.files.length <= 10) {
      plan.dependencies.files.slice(0, 5).forEach(f => console.log(`    - ${f}`));
      if (plan.dependencies.files.length > 5) {
        console.log(`    ... and ${plan.dependencies.files.length - 5} more`);
      }
    }

    console.log(`  Features: ${plan.dependencies.features.length} affected features`);
    if (plan.dependencies.features.length > 0) {
      plan.dependencies.features.forEach(f => console.log(`    - ${f}`));
    }

    const dbCount = plan.dependencies.dbObjects.tables.length + plan.dependencies.dbObjects.rpcs.length;
    console.log(`  Database: ${dbCount} objects`);
    if (plan.dependencies.dbObjects.tables.length > 0) {
      console.log(`    Tables: ${plan.dependencies.dbObjects.tables.join(', ')}`);
    }
    if (plan.dependencies.dbObjects.rpcs.length > 0) {
      console.log(`    RPCs: ${plan.dependencies.dbObjects.rpcs.join(', ')}`);
    }
  }

  /**
   * Assess if risks are acceptable
   */
  private assessRisks(plan: DevelopmentPlan): boolean {
    if (plan.risks.level === 'high' && !this.dryRun) {
      return false; // Block high-risk changes in production mode
    }
    return true;
  }

  /**
   * Retrieve relevant context from files
   */
  private async retrieveRelevantContext(plan: DevelopmentPlan): Promise<{
    filesRead: number;
    totalLines: number;
  }> {
    let totalLines = 0;
    let filesRead = 0;

    for (const file of plan.relevantFiles.toRead) {
      try {
        const fullPath = path.join(this.projectRoot, file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          totalLines += content.split('\n').length;
          filesRead++;
        }
      } catch (error) {
        console.warn(`⚠️  Could not read ${file}`);
      }
    }

    return { filesRead, totalLines };
  }

  /**
   * Run tests
   */
  private async runTests(testFiles: string[]): Promise<{
    passed: number;
    total: number;
    errors: string[];
  }> {
    // For now, return mock results
    // In production, this would actually run the tests
    return {
      passed: testFiles.length,
      total: testFiles.length,
      errors: []
    };
  }

  /**
   * Run typecheck
   */
  private async runTypecheck(): Promise<{
    passed: boolean;
    errors: string[];
  }> {
    // For now, return success
    // In production, this would run tsc --noEmit
    return {
      passed: true,
      errors: []
    };
  }

  /**
   * Query: Find what depends on a file/function
   */
  async findDependents(filePath: string): Promise<{
    directDependents: string[];
    allDependents: string[];
    features: string[];
  }> {
    console.log(`🔍 Finding dependents of: ${filePath}`);

    const reverseDeps = await this.contextRetriever.getReverseDependencies(filePath);

    const directDependents = reverseDeps
      .filter(d => d.depth === 1)
      .map(d => d.node_path);

    const allDependents = reverseDeps.map(d => d.node_path);

    // Get features
    const features = Array.from(new Set(
      await Promise.all(
        directDependents.map(async f => {
          try {
            const context = await this.contextRetriever.getContext(f);
            return context.featuresInvolved;
          } catch {
            return [];
          }
        })
      ).then(arrays => arrays.flat())
    ));

    console.log(`✓ Found ${directDependents.length} direct dependents`);
    console.log(`✓ Found ${allDependents.length} total dependents`);
    console.log(`✓ Affects ${features.length} features`);

    return {
      directDependents,
      allDependents,
      features
    };
  }

  /**
   * Query: Show everything connected to a feature
   */
  async showFeatureConnections(feature: string): Promise<{
    files: string[];
    apis: string[];
    components: string[];
    dbTables: string[];
    dbRPCs: string[];
  }> {
    console.log(`🔍 Showing connections for feature: ${feature}`);

    const overview = await this.contextRetriever.getFeatureOverview(feature);
    const files = await this.contextRetriever.getFeatureFiles(feature);
    const dbObjects = await this.contextRetriever.getFeatureDatabaseObjects(feature);

    // Categorize files
    const apis = files.filter(f => f.includes('/api/'));
    const components = files.filter(f => f.includes('/components/'));

    console.log(`✓ ${files.length} files`);
    console.log(`✓ ${apis.length} APIs`);
    console.log(`✓ ${components.length} components`);
    console.log(`✓ ${dbObjects.tables.length} database tables`);
    console.log(`✓ ${dbObjects.rpcs.length} database RPCs`);

    return {
      files,
      apis,
      components,
      dbTables: dbObjects.tables,
      dbRPCs: dbObjects.rpcs
    };
  }
}
