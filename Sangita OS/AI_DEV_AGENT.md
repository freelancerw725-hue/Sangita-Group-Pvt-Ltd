# 🤖 Graph-Aware AI Development Agent

An intelligent AI coding assistant that uses the Project Knowledge Graph as its persistent brain. Makes targeted code changes by querying the graph first, never scanning the entire project.

## 🎯 Core Concept

**Traditional AI Approach:**
```
Request → Scan entire project → Read 50+ files → Make changes → Hope nothing breaks
```

**Graph-Aware AI Approach:**
```
Request → Query Knowledge Graph → Identify 5 relevant files → Analyze dependencies → Make targeted changes → Run specific tests → Update graph
```

## ✨ Features

### 🧠 **Intelligent Context Retrieval**
- Never scans entire project
- Queries graph for relevant files only
- Understands dependencies automatically
- Knows which tests to run

### 🔍 **Dependency-Aware**
- "What depends on this?" - Instant answers
- "What will break?" - Impact analysis before changes
- "Which files for feature X?" - Feature-based queries
- "Which DB objects?" - Database awareness

### 🛡️ **Safety First**
- Risk assessment before changes
- Blocks high-risk modifications
- Runs tests automatically
- Type-checks before committing
- Never removes existing functionality

### 🔄 **Self-Maintaining**
- Auto-updates graph after changes
- Detects file modifications
- Keeps knowledge synchronized
- Learns project structure over time

## 🚀 Quick Start

### 1. Ensure Graph is Indexed

```bash
npm run index-graph
```

### 2. Use the CLI

```bash
npm run ai-dev "Fix Bulk Email campaign creation"
```

### 3. Or Use the Web UI

```bash
npm run dev
```

Navigate to: **http://localhost:5173/ai-dev**

## 📝 Supported Commands

### Fix Commands

**Purpose:** Bug fixes, error resolution

```bash
npm run ai-dev "Fix Bulk Email campaign creation"
npm run ai-dev "Fix the error in AI Insights"
npm run ai-dev "Resolve the keyword intelligence bug"
npm run ai-dev "Debug the CRM customer form"
```

**Workflow:**
1. Queries graph for feature files
2. Identifies related APIs, components, services
3. Analyzes dependencies
4. Reads only relevant files
5. Makes targeted fix
6. Runs related tests
7. Updates graph

### Add Commands

**Purpose:** Create new features or fields

```bash
npm run ai-dev "Add a field to Leads"
npm run ai-dev "Add email validation to campaigns"
npm run ai-dev "Create a new report in Finance"
npm run ai-dev "Implement task filtering"
```

**Workflow:**
1. Identifies affected files
2. Checks database schema
3. Plans migration if needed
4. Makes code changes
5. Runs tests
6. Updates graph

### Modify Commands

**Purpose:** Change existing features

```bash
npm run ai-dev "Change Keyword Intelligence algorithm"
npm run ai-dev "Update the email template"
npm run ai-dev "Modify the dashboard layout"
npm run ai-dev "Improve AI Insights performance"
```

**Workflow:**
1. Finds feature implementation
2. Analyzes impact
3. Checks dependencies
4. Makes changes
5. Verifies tests pass
6. Updates graph

### Refactor Commands

**Purpose:** Improve code structure

```bash
npm run ai-dev "Refactor the campaign service"
npm run ai-dev "Cleanup the leads component"
npm run ai-dev "Optimize keyword processing"
```

**Workflow:**
1. Identifies code to refactor
2. Finds all dependent files
3. Plans refactoring safely
4. Makes changes
5. Runs comprehensive tests
6. Updates graph

### Query Commands

**Purpose:** Ask questions, explore architecture

```bash
# Find dependencies
npm run ai-dev "Find what depends on campaigns.ts"
npm run ai-dev "What uses the campaigns table?"

# Show feature connections
npm run ai-dev "Show everything connected to Bulk Email"
npm run ai-dev "Show everything connected to keywords"
```

**Output:**
- Lists all dependent files
- Shows affected features
- Displays database connections
- No code changes made

## 🎯 Real-World Examples

### Example 1: Fix a Bug

**Command:**
```bash
npm run ai-dev "Fix Bulk Email campaign creation"
```

**What Happens:**
```
🧠 Graph-Aware Development Agent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Request: Fix Bulk Email campaign creation

🔍 Step 1: Querying Knowledge Graph...
✓ Found 4 files to read
✓ Identified 2 files to edit
✓ Risk level: low

🔗 Step 2: Analyzing Dependencies...
  Files: 5 dependent files
  Features: 1 affected feature (bulk-email)
  Database: campaigns, email_queue tables

⚠️  Step 3: Risk Assessment...
✓ Risk assessment passed

📚 Step 4: Retrieving Relevant Context...
✓ Retrieved context from 4 files

✏️  Step 5: Making Code Changes...
   Files to edit:
   - src/routes/email.tsx
   - src/routes/api/campaigns.ts

🧪 Step 6: Running Tests...
✓ Tests: 3/3 passed

🔍 Step 7: Type Checking...
✓ Typecheck passed

🔄 Step 8: Updating Knowledge Graph...
✓ Graph updated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Development request completed!
```

### Example 2: Add a Feature

**Command:**
```bash
npm run ai-dev "Add a status field to Leads"
```

**What Happens:**
1. **Graph Query:** Finds lead schema, forms, APIs
2. **Database Check:** Identifies need for migration
3. **Dependency Analysis:** Shows 8 files will be affected
4. **Risk Assessment:** Medium risk (database change)
5. **Context Retrieval:** Reads schema, types, forms
6. **Changes:**
   - Create migration file
   - Update TypeScript types
   - Add field to forms
   - Update API endpoints
7. **Testing:** Runs lead-related tests
8. **Graph Update:** Indexes new files

### Example 3: Explore Dependencies

**Command:**
```bash
npm run ai-dev "Find what depends on campaigns.ts"
```

**Output:**
```
🔍 Finding dependents of: src/routes/api/campaigns.ts

✓ Found 3 direct dependents
✓ Found 12 total dependents
✓ Affects 2 features

📊 DEPENDENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Direct Dependents: 3
  - src/routes/email.tsx
  - src/components/os/CampaignMonitor.tsx
  - src/lib/supabase/services/campaigns.ts

Total Dependents: 12
Affected Features: bulk-email, ai-insights
```

## 🔧 Workflow Deep Dive

### Complete Workflow Steps

```
1. REQUEST RECEIVED
   ├─ Parse natural language command
   ├─ Extract intent (fix, add, modify, refactor, query)
   ├─ Detect feature (bulk-email, keywords, etc.)
   └─ Validate command

2. GRAPH SEARCH
   ├─ Query knowledge graph with request
   ├─ Use AI context retrieval
   ├─ Identify relevant files (routes, APIs, components, services)
   ├─ Map database objects (tables, RPCs)
   └─ Find related tests

3. DEPENDENCY ANALYSIS
   ├─ Get dependency chain for each file
   ├─ Find reverse dependencies
   ├─ Calculate impact (how many files affected)
   ├─ Identify affected features
   └─ List database connections

4. RISK ASSESSMENT
   ├─ Count affected files
   ├─ Count affected features
   ├─ Determine risk level (low/medium/high)
   ├─ Block high-risk changes
   └─ Warn for medium-risk changes

5. CONTEXT RETRIEVAL
   ├─ Read only identified files
   ├─ Load relevant code
   ├─ Understand current implementation
   └─ Build context for AI

6. CODE CHANGES
   ├─ Make targeted modifications
   ├─ Follow existing patterns
   ├─ Preserve existing functionality
   └─ Update related files only

7. TESTING
   ├─ Run identified tests
   ├─ Run feature-specific tests
   ├─ Check test results
   └─ Report failures

8. TYPE CHECKING
   ├─ Run TypeScript compiler
   ├─ Check for type errors
   ├─ Report issues
   └─ Block on failure

9. GRAPH UPDATE
   ├─ Re-index changed files
   ├─ Update node metadata
   ├─ Refresh dependency edges
   └─ Keep graph synchronized

10. REPORT RESULTS
    ├─ Success/failure status
    ├─ Files modified
    ├─ Tests run
    ├─ Errors encountered
    └─ Warnings issued
```

## 🎨 Using the Web UI

Access the interactive UI at: **http://localhost:5173/ai-dev**

**Features:**
- Command input with examples
- Real-time execution
- Dry-run mode (preview changes without applying)
- Visual results display
- Error highlighting
- Query result visualization

**Dry Run Mode:**
- Check the "Dry Run" checkbox
- Execute commands safely
- See what would happen
- No actual changes made
- Perfect for testing

## 📡 Using the API

**Endpoint:** `POST /api/ai-dev/execute`

**Request:**
```json
{
  "command": "Fix Bulk Email campaign creation",
  "dryRun": true
}
```

**Response:**
```json
{
  "success": true,
  "command": {
    "description": "Fix Bulk Email campaign creation",
    "type": "fix",
    "feature": "bulk-email"
  },
  "result": {
    "success": true,
    "filesModified": ["src/routes/email.tsx"],
    "testsRun": ["src/routes/__tests__/email.test.tsx"],
    "testsPassed": true,
    "typecheckPassed": true,
    "errors": [],
    "warnings": [],
    "graphUpdated": true
  },
  "dryRun": true
}
```

## 🔐 Safety Mechanisms

### Risk Levels

**Low Risk:**
- 1-5 files affected
- 0-1 features affected
- Localized changes
- → Proceeds automatically

**Medium Risk:**
- 6-20 files affected
- 2-4 features affected
- Cross-feature changes
- → Warns but proceeds

**High Risk:**
- 20+ files affected
- 5+ features affected
- System-wide changes
- → Blocks in production, warns in dry-run

### Safety Checks

1. **Pre-Change:**
   - Dependency analysis
   - Impact assessment
   - Risk calculation
   - User confirmation (high-risk)

2. **During Change:**
   - Preserve existing code
   - Follow project patterns
   - Update only necessary files
   - Maintain backwards compatibility

3. **Post-Change:**
   - Run affected tests
   - Type-check all code
   - Verify build succeeds
   - Update graph

4. **Rollback:**
   - Git integration (planned)
   - Automatic rollback on test failure (planned)
   - Manual rollback support

## 📊 Command Recognition

The agent uses natural language processing to understand commands:

**Fix Keywords:**
- fix, repair, resolve, debug, bug, error, issue

**Add Keywords:**
- add, create, new, implement, build

**Modify Keywords:**
- change, modify, update, edit, adjust, improve

**Refactor Keywords:**
- refactor, reorganize, restructure, cleanup, optimize

**Query Keywords:**
- find, show, list, what, which, where, depends on, connected to

**Feature Detection:**
- Bulk Email: "bulk email", "bulk mail", "email", "campaign"
- Keywords: "keyword", "keyword intelligence"
- Leads: "lead", "leads", "lead finder"
- CRM: "crm", "customer"
- AI Insights: "ai insight", "ai analytics"
- Tasks: "task", "todo"
- Finance: "finance", "invoice", "quotation"

## 🎯 Best Practices

### DO ✅

1. **Be Specific:**
   ```
   ✓ "Fix campaign creation form validation"
   ✗ "Fix stuff"
   ```

2. **Mention Features:**
   ```
   ✓ "Add email field to Bulk Email campaigns"
   ✗ "Add email field"
   ```

3. **Use Dry-Run First:**
   ```bash
   # Test first
   npm run ai-dev "Refactor keywords service" --dry-run
   
   # Then apply
   npm run ai-dev "Refactor keywords service"
   ```

4. **Query Before Changing:**
   ```bash
   # Check dependencies first
   npm run ai-dev "Find what depends on keywords.ts"
   
   # Then make changes
   npm run ai-dev "Update keywords service"
   ```

5. **One Change at a Time:**
   ```
   ✓ "Fix campaign validation"
   ✓ "Add campaign status field"
   ✗ "Fix validation and add status field and refactor component"
   ```

### DON'T ❌

1. **Don't Be Vague:**
   ```
   ✗ "Make it better"
   ✗ "Fix the thing"
   ✗ "Update stuff"
   ```

2. **Don't Skip Dry-Run:**
   ```
   ✗ Making changes without testing first
   ✓ Always dry-run high-risk changes
   ```

3. **Don't Ignore Warnings:**
   ```
   If agent warns "High-risk change" → Review carefully
   If agent shows "20 files affected" → Consider splitting
   ```

4. **Don't Make Parallel Changes:**
   ```
   ✗ Running multiple commands simultaneously
   ✓ Wait for one to complete before next
   ```

## 🔄 Graph Synchronization

The agent automatically keeps the graph synchronized:

**When Changes Occur:**
1. Files modified → Graph immediately re-indexes them
2. New files created → Automatically added to graph
3. Files deleted → Removed from graph
4. Imports changed → Dependencies updated

**Manual Re-index:**
```bash
npm run index-graph
```

**Check Graph Status:**
```sql
SELECT 
  last_indexed_at,
  files_scanned,
  nodes_created
FROM project_graph_index_jobs
ORDER BY created_at DESC
LIMIT 1;
```

## 📈 Monitoring & Debugging

### View Execution Logs

The agent logs all steps to console:
- Graph queries
- Files identified
- Dependencies found
- Risks assessed
- Changes made
- Tests run
- Errors encountered

### Check Graph Health

```bash
# Query graph stats
npm run ai-dev "Show everything connected to Bulk Email"

# Check dependencies
npm run ai-dev "Find what depends on campaigns.ts"
```

### Debug Issues

1. **Command not recognized:**
   - Check spelling
   - Use --help for examples
   - Try different phrasing

2. **No files identified:**
   - Graph may be outdated
   - Run: `npm run index-graph`
   - Try more specific command

3. **Tests failing:**
   - Agent will show test errors
   - Fix errors manually
   - Re-run command

4. **High risk blocked:**
   - Use dry-run mode
   - Review affected files
   - Consider splitting change

## 🎓 Advanced Usage

### Custom Workflows

You can integrate the agent into custom workflows:

```typescript
import { GraphAwareDevelopmentAgent } from '@/lib/ai-dev-agent/graph-aware-agent';

const agent = new GraphAwareDevelopmentAgent(
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceKey,
  projectRoot,
  false // dryRun
);

const result = await agent.executeDevelopmentRequest({
  description: "Fix campaign creation",
  type: 'fix',
  feature: 'bulk-email'
});
```

### Programmatic Queries

```typescript
// Find dependencies
const deps = await agent.findDependents('src/routes/api/campaigns.ts');
console.log(`Affects ${deps.features.length} features`);

// Feature overview
const overview = await agent.showFeatureConnections('bulk-email');
console.log(`${overview.files.length} files in bulk-email feature`);
```

### Integration with CI/CD

```yaml
# .github/workflows/ai-assisted-fix.yml
name: AI-Assisted Bug Fix

on:
  issues:
    types: [opened, labeled]

jobs:
  ai-fix:
    if: contains(github.event.issue.labels.*.name, 'bug')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run index-graph
      - run: npm run ai-dev "Fix ${{ github.event.issue.title }}" --dry-run
```

## 🚀 Performance

**Graph Query:** <500ms
**Context Retrieval:** <2s for 10 files
**Test Execution:** Varies by tests
**Graph Update:** <1s per file
**Total Time:** 5-30s depending on complexity

**Comparison:**
- Traditional: Scan all 200 files → 10-20s
- Graph-Aware: Query graph + read 5 files → 2-5s
- **Speedup:** 2-4x faster

## 🎉 Benefits

### For Developers
- ⚡ Faster development
- 🎯 Targeted changes
- 🛡️ Safer refactoring
- 📚 Better understanding
- 🔍 Easy exploration

### For AI Agents
- 🧠 Project knowledge
- 🎯 Relevant context
- 🔗 Dependency awareness
- 🗺️ Architecture understanding
- 📊 Impact prediction

### For Teams
- 📖 Living documentation
- 🔄 Automated maintenance
- 🎓 Faster onboarding
- 🔍 Code discovery
- 🛡️ Change safety

## 📚 Further Reading

- **PROJECT_GRAPH.md** - Knowledge graph documentation
- **AGENTS.md** - General agent rules
- **README.md** - Project overview

---

**Status:** ✅ Production-Ready  
**Version:** 1.0.0  
**Built for:** Sangita OS  
**Date:** September 1, 2026
