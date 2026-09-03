# 🧠 Sangita OS AI Brain Graph

The AI Brain Graph is a live architectural index of the entire Sangita OS codebase. It maps files, components, services, database tables, APIs, dependencies, routes, and tests into an interactive visual graph with search, filter, focus, and dependency tracing capabilities.

## 📊 Current Status

- **Files Indexed:** 192
- **Routes:** 29
- **API Endpoints:** 53
- **Components:** 61
- **Services:** 35
- **Graph Nodes:** 192
- **Dependency Edges:** 795
- **Tests:** 91/91 passing ✓
- **Migrations:** 3

## 🎯 Features Mapped

1. **Bulk Email Campaigns** (6 files, 3 APIs) - Status: partial
2. **AI Insights & Analytics** (17 files, 6 APIs) - Status: active
3. **Customer Relationship Management** (5 files, 3 APIs) - Status: active
4. **Lead Pipeline & Management** (11 files, 5 APIs) - Status: active
5. **Task Management** (6 files, 3 APIs) - Status: active
6. **Finance & Invoicing** (8 files, 4 APIs) - Status: active
7. **Keyword Intelligence** (36 files, 16 APIs) - Status: active

## 🚀 Quick Start

### 1. View Interactive Graph

Open the visual graph viewer in your browser:

```bash
cd "/home/sonu/Desktop/Sangita Group Pvt Ltd /Sangita OS"
open brain-graph-viewer.html
# Or: xdg-open brain-graph-viewer.html (Linux)
```

**Features:**
- 🔍 Search files by name or path
- 🎨 Filter by type (routes, APIs, components, services, etc.)
- 🎯 Focus on specific features (bulk-email, crm, keywords, etc.)
- 🔗 Trace dependency chains
- 📊 Highlight errors and warnings
- 🖱️ Click nodes to see details
- 🔎 Zoom and pan

### 2. Query Graph via CLI

Use the query tool for targeted file operations:

```bash
# Show statistics
node query-brain-graph.cjs stats

# List all files in a feature
node query-brain-graph.cjs feature bulk-email
node query-brain-graph.cjs feature keywords

# Show dependencies of a file
node query-brain-graph.cjs deps email.tsx
node query-brain-graph.cjs deps src/routes/email.tsx

# Show reverse dependencies (what imports this file)
node query-brain-graph.cjs reverse-deps email.tsx

# Trace full dependency chain
node query-brain-graph.cjs trace email.tsx

# List all API endpoints
node query-brain-graph.cjs api

# List files with errors
node query-brain-graph.cjs errors

# List untested files
node query-brain-graph.cjs untested
```

### 3. Rebuild Graph After Changes

Regenerate the graph index after making significant changes:

```bash
node build-brain-graph.cjs
```

**When to rebuild:**
- After adding new files
- After refactoring imports
- After creating new features
- Before pushing to production

## 📁 Files

- **`brain-graph.json`** - The index containing all nodes, edges, and metadata
- **`brain-graph-viewer.html`** - Interactive D3.js visualization (standalone, no build required)
- **`build-brain-graph.cjs`** - Index generator script
- **`query-brain-graph.cjs`** - CLI query tool for targeted operations

## 🔧 Architecture Preservation Rules

The Brain Graph respects the existing project boundaries:

1. **Lead Finder** - Handles YouTube lead discovery, collection, verification
2. **Bulk Mail** - Manages email campaigns, SMTP, queue, tracking (external service)
3. **Sangita OS** - Central dashboard, CRM, tasks, finance, AI integrations
4. **n8n** - Automation bridge between projects

**Important:** The graph identifies dependencies but does NOT duplicate responsibilities across projects. Each project maintains its own data sources and APIs.

## 💡 Usage Examples

### Example 1: Before Editing Email Feature

```bash
# See what files are involved
node query-brain-graph.cjs feature bulk-email

# Check dependencies of the main route
node query-brain-graph.cjs deps src/routes/email.tsx

# See what depends on the email API
node query-brain-graph.cjs reverse-deps src/routes/api/dashboard/email.ts
```

Now you know exactly which files to read/edit without scanning the entire project.

### Example 2: Adding New Feature

```bash
# Check similar features for reference
node query-brain-graph.cjs feature crm
node query-brain-graph.cjs feature tasks

# After implementing, rebuild graph
node build-brain-graph.cjs

# Verify it's indexed
node query-brain-graph.cjs stats
```

### Example 3: Debugging Import Issues

```bash
# Trace the full dependency chain
node query-brain-graph.cjs trace src/routes/my-future.tsx

# Check for circular dependencies visually
open brain-graph-viewer.html
# Click node → click "Trace Dependencies" button
```

### Example 4: Understanding API Surface

```bash
# List all API endpoints
node query-brain-graph.cjs api

# Focus on specific feature APIs
node query-brain-graph.cjs feature keywords
```

## 🎨 Visual Graph Legend

- **Blue** - Routes (page components)
- **Green** - API Endpoints
- **Purple** - UI Components
- **Orange** - Services/Libraries
- **Cyan** - Database Migrations
- **Red** - Tests
- **Gray** - Other files

**Edge colors:**
- Gray - Normal import dependency
- Blue (highlighted) - Active/selected dependency path

## 🔍 Node Details

Click any node in the viewer to see:
- File path and name
- Type (route, api, component, service, etc.)
- Size and line count
- Number of dependencies
- Exported functions/components
- API endpoints (for API files)
- Whether it uses Supabase, fetch, etc.

## ⚠️ Known Issues (Tracked in Graph)

The graph tracks 94 error markers and 5 warnings. Most are:
- `has-error-handling` - Files with error handling code (info only)
- `has-todos` - Files with TODO/FIXME comments

Run `node query-brain-graph.cjs errors` for details.

## 🧪 Testing Integration

All tests passing: **91/91** ✓

The graph metadata tracks:
- Which files have test coverage
- Test file locations
- Test dependencies

Run tests before rebuilding graph:
```bash
npm test
node build-brain-graph.cjs
```

## 🔄 Update Workflow

**Standard workflow for using the Brain Graph:**

1. **Receive short prompt** - User describes what to change
2. **Query graph** - `node query-brain-graph.cjs feature <name>` to identify relevant files
3. **Trace dependencies** - `node query-brain-graph.cjs deps <file>` to understand impact
4. **Read only affected files** - Use graph output to target specific files
5. **Make changes** - Edit identified files only
6. **Run affected tests** - Test the feature area
7. **Update graph** - `node build-brain-graph.cjs` to reflect changes
8. **Verify** - Visual check in `brain-graph-viewer.html`

**Do NOT:**
- Rescan the entire project for every change
- Read files not in the dependency chain
- Rebuild features that are already working

## 🗺️ Graph Schema

### Node Structure
```json
{
  "id": "src/routes/email.tsx",
  "name": "email.tsx",
  "path": "src/routes/email.tsx",
  "type": "route",
  "subtype": "page",
  "size": 12345,
  "lines": 234,
  "dependencies": ["react", "src/components/..."],
  "exports": ["Route"],
  "apiEndpoints": [],
  "features": {
    "hasSupabase": true,
    "hasFetch": true,
    "hasError": false,
    "hasWarning": false
  },
  "tested": false,
  "status": "indexed"
}
```

### Edge Structure
```json
{
  "from": "src/routes/email.tsx",
  "to": "src/components/os/AppLayout",
  "type": "imports"
}
```

### Feature Structure
```json
{
  "bulk-email": {
    "name": "Bulk Email Campaigns",
    "nodes": ["src/routes/email.tsx", "..."],
    "apis": ["src/routes/api/campaigns.ts"],
    "components": ["src/components/os/CampaignMonitor.tsx"],
    "database": ["campaigns", "emails", "email_queue"],
    "status": "partial"
  }
}
```

## 📚 Integration with Existing Projects

The Brain Graph indexes **Sangita OS only**. It tracks external integrations:

- **Lead Finder API** - `/api/lead-finder-stats` endpoint (external)
- **Bulk Mail API** - Campaign endpoints reference external service
- **n8n Workflows** - Referenced but not indexed

To query other projects:
- Lead Finder: `cd ../Leads && <use its own tools>`
- Bulk Mail: `cd "../Bulk Mail" && <use its own tools>`
- n8n: Check `n8n/N8N_SETUP.md`

## 🔐 Environment Dependencies

The graph tracks which files use:
- **Supabase** - `features.hasSupabase = true`
- **External APIs** - `features.hasFetch = true`

Files with `hasSupabase: true` require:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

## 🚦 Status Indicators

**Feature Status:**
- `active` - Fully implemented and tested
- `partial` - Working but incomplete
- `planned` - Indexed but not yet functional
- `deprecated` - Scheduled for removal

## 📈 Maintenance

**Best practices:**

1. **Rebuild graph weekly** - Keep index fresh
2. **Check errors** - Run `node query-brain-graph.cjs errors` regularly
3. **Validate after refactoring** - Ensure dependency chains are correct
4. **Update feature metadata** - Edit `build-brain-graph.cjs` when adding features
5. **Keep graph in repo** - Commit `brain-graph.json` after significant changes

## 🤝 Contributing

When adding new features:

1. Implement the feature
2. Run tests: `npm test`
3. Rebuild graph: `node build-brain-graph.cjs`
4. Verify in viewer: `open brain-graph-viewer.html`
5. Query to confirm: `node query-brain-graph.cjs feature <your-feature>`
6. Commit both code and updated `brain-graph.json`

## 📞 Support

For issues or questions about the Brain Graph:
1. Check graph stats: `node query-brain-graph.cjs stats`
2. Rebuild if stale: `node build-brain-graph.cjs`
3. Check this documentation: `BRAIN_GRAPH.md`

---

**Generated:** 2026-09-01  
**Version:** 1.0.0  
**Sangita OS** - AI-Powered Business Management Platform
