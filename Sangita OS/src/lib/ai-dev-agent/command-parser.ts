/**
 * Natural Language Command Parser
 * Translates developer requests into structured commands
 */

import type { DevelopmentRequest } from './graph-aware-agent';

interface ParsedCommand {
  request: DevelopmentRequest;
  confidence: number;
}

export class CommandParser {
  /**
   * Parse natural language command into structured request
   */
  static parse(input: string): ParsedCommand {
    const lowerInput = input.toLowerCase();

    // Fix commands
    if (this.isFix(lowerInput)) {
      return {
        request: {
          description: input,
          type: 'fix',
          feature: this.extractFeature(lowerInput)
        },
        confidence: 0.9
      };
    }

    // Add commands
    if (this.isAdd(lowerInput)) {
      return {
        request: {
          description: input,
          type: 'add',
          feature: this.extractFeature(lowerInput)
        },
        confidence: 0.85
      };
    }

    // Modify/change/update commands
    if (this.isModify(lowerInput)) {
      return {
        request: {
          description: input,
          type: 'modify',
          feature: this.extractFeature(lowerInput)
        },
        confidence: 0.85
      };
    }

    // Refactor commands
    if (this.isRefactor(lowerInput)) {
      return {
        request: {
          description: input,
          type: 'refactor',
          feature: this.extractFeature(lowerInput)
        },
        confidence: 0.8
      };
    }

    // Query commands
    if (this.isQuery(lowerInput)) {
      return {
        request: {
          description: input,
          type: 'query',
          feature: this.extractFeature(lowerInput)
        },
        confidence: 0.95
      };
    }

    // Default to modify
    return {
      request: {
        description: input,
        type: 'modify',
        feature: this.extractFeature(lowerInput)
      },
      confidence: 0.5
    };
  }

  /**
   * Check if command is a fix
   */
  private static isFix(input: string): boolean {
    const fixKeywords = ['fix', 'repair', 'resolve', 'debug', 'bug', 'error', 'issue'];
    return fixKeywords.some(kw => input.includes(kw));
  }

  /**
   * Check if command is an add
   */
  private static isAdd(input: string): boolean {
    const addKeywords = ['add', 'create', 'new', 'implement', 'build'];
    return addKeywords.some(kw => input.includes(kw));
  }

  /**
   * Check if command is a modify
   */
  private static isModify(input: string): boolean {
    const modifyKeywords = ['change', 'modify', 'update', 'edit', 'adjust', 'improve'];
    return modifyKeywords.some(kw => input.includes(kw));
  }

  /**
   * Check if command is a refactor
   */
  private static isRefactor(input: string): boolean {
    const refactorKeywords = ['refactor', 'reorganize', 'restructure', 'cleanup', 'optimize'];
    return refactorKeywords.some(kw => input.includes(kw));
  }

  /**
   * Check if command is a query
   */
  private static isQuery(input: string): boolean {
    const queryKeywords = [
      'find', 'show', 'list', 'what', 'which', 'where',
      'depends on', 'connected to', 'related to', 'uses'
    ];
    return queryKeywords.some(kw => input.includes(kw));
  }

  /**
   * Extract feature name from input
   */
  private static extractFeature(input: string): string | undefined {
    const features = {
      'bulk email': 'bulk-email',
      'bulk mail': 'bulk-email',
      'email': 'bulk-email',
      'campaign': 'bulk-email',
      'keyword': 'keywords',
      'keyword intelligence': 'keywords',
      'lead': 'leads',
      'leads': 'leads',
      'lead finder': 'leads',
      'crm': 'crm',
      'customer': 'crm',
      'ai insight': 'ai-insights',
      'ai analytics': 'ai-insights',
      'task': 'tasks',
      'todo': 'tasks',
      'finance': 'finance',
      'invoice': 'finance',
      'quotation': 'finance'
    };

    for (const [keyword, feature] of Object.entries(features)) {
      if (input.includes(keyword)) {
        return feature;
      }
    }

    return undefined;
  }

  /**
   * Validate parsed command
   */
  static validate(parsed: ParsedCommand): boolean {
    if (parsed.confidence < 0.5) {
      return false;
    }

    if (!parsed.request.description || parsed.request.description.trim().length < 3) {
      return false;
    }

    return true;
  }

  /**
   * Get help text for commands
   */
  static getHelp(): string {
    return `
🤖 Graph-Aware AI Development Agent - Command Help

COMMAND TYPES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fix Commands (fix bugs, resolve errors):
  • "Fix Bulk Email campaign creation"
  • "Fix the error in AI Insights"
  • "Resolve the keyword intelligence bug"
  • "Debug the CRM customer form"

Add Commands (create new features):
  • "Add a field to Leads"
  • "Add email validation to campaigns"
  • "Create a new report in Finance"
  • "Implement task filtering"

Modify Commands (change existing features):
  • "Change Keyword Intelligence algorithm"
  • "Update the email template"
  • "Modify the dashboard layout"
  • "Improve AI Insights performance"

Refactor Commands (improve code structure):
  • "Refactor the campaign service"
  • "Cleanup the leads component"
  • "Optimize keyword processing"

Query Commands (ask questions):
  • "Find what depends on this function"
  • "Show everything connected to Bulk Email"
  • "What uses the campaigns table?"
  • "Which files implement keyword intelligence?"

FEATURES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  • bulk-email     - Email campaigns and sending
  • keywords       - Keyword intelligence system
  • leads          - Lead management and pipeline
  • crm            - Customer relationship management
  • ai-insights    - AI analytics and insights
  • tasks          - Task management
  • finance        - Finance, invoices, quotations

WORKFLOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Request → Parse command
2. Graph Search → Find relevant files
3. Dependency Analysis → Assess impact
4. Risk Check → Validate safety
5. Retrieve Context → Read only relevant files
6. Make Changes → Targeted modifications
7. Run Tests → Verify correctness
8. Typecheck → Ensure type safety
9. Update Graph → Keep knowledge synchronized

EXAMPLES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$ npm run ai-dev "Fix Bulk Email campaign creation"
  → Identifies email.tsx, campaigns.ts, campaigns service
  → Analyzes dependencies
  → Makes targeted fix
  → Runs email-related tests
  → Updates graph

$ npm run ai-dev "Add a status field to Leads"
  → Identifies lead schemas, forms, APIs
  → Checks database migrations
  → Plans migration + code changes
  → Validates with tests

$ npm run ai-dev "Find what depends on keyword service"
  → Queries graph for reverse dependencies
  → Shows all dependent files
  → Lists affected features
  → No code changes

SAFETY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Never scans entire project
✓ Only reads relevant files
✓ Analyzes dependencies first
✓ Blocks high-risk changes
✓ Runs tests before committing
✓ Keeps graph synchronized
✓ Detects breaking changes
✓ Preserves existing functionality
`;
  }
}
