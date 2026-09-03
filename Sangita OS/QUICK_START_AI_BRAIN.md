# Quick Start: AI Brain Knowledge Graph

Get your enhanced Knowledge Graph up and running in 5 minutes!

## 🚀 Quick Setup (3 Steps)

### Step 1: Apply Database Migration
```bash
# 1. Open Supabase Dashboard
# 2. Go to SQL Editor
# 3. Copy & paste the contents of:
#    supabase/migrations/20260901000004_graph_enhancements.sql
# 4. Click "Run"
```

### Step 2: Index Your Project
```bash
cd "Sangita OS"
npm run index-graph
```

This will:
- Scan all TypeScript/TSX files with AST
- Build the knowledge graph
- Validate imports and schema
- Create health snapshot

**Time**: ~10 seconds

### Step 3: View the Dashboard
```bash
npm run dev
```

Navigate to: **http://localhost:5173/project-graph/health**

You'll see:
- 📊 Total nodes and edges
- ✅ Validation status
- 🔍 Any broken imports or schema issues
- 📜 Index history

---

## 🎯 Common Tasks

### Re-index After Changes
```bash
npm run index-graph
```

### Enable Auto-Sync on Git Commits
```bash
npm run install-git-hook
```

Now every `git commit` automatically updates the graph!

### Generate Embeddings for Semantic Search
```bash
# Add to .env:
# OPENAI_API_KEY=sk-your-key

npm run generate-embeddings
```

### Use the AI Agent
```bash
npm run ai-dev "Fix the bulk email campaign creation"
```

The agent will:
1. Query the knowledge graph
2. Find relevant files
3. Analyze dependencies
4. Show what would break
5. Plan the changes

---

## 📊 What You Get

### Before (Old System)
- Regex-based parsing ❌
- Manual re-indexing ❌
- No validation ❌
- Keyword search only ❌
- No health monitoring ❌

### After (New System)
- AST-based parsing ✅
- Auto git sync ✅
- Broken import detection ✅
- Schema validation ✅
- Semantic search ✅
- Health dashboard ✅
- Incremental indexing ✅

---

## 🔍 Key Features

### 1. Broken Import Detection
Automatically finds:
- Missing files
- Wrong paths
- Unresolved imports

### 2. Schema Validation
Cross-checks:
- Supabase tables used in code vs actual DB
- RPC functions called vs defined functions

### 3. Health Dashboard
Real-time view of:
- Total nodes/edges
- Validation issues
- Stale nodes
- Index history

### 4. Git Integration
Auto-syncs graph after each commit:
```bash
git commit -m "Add feature"
# → Graph automatically updates!
```

### 5. Semantic Search
Find related code by meaning, not just keywords:
```typescript
// Query: "email campaign management"
// Finds: campaign.service.ts, email.routes.ts, etc.
```

---

## 🧪 Verify Everything Works

```bash
# 1. Run tests
npm run test
# Expected: 91/91 passing ✅

# 2. Check indexing
npm run index-graph
# Expected: Scans files, creates nodes ✅

# 3. View dashboard
npm run dev
# → http://localhost:5173/project-graph/health
# Expected: Shows metrics ✅
```

---

## 📚 Full Documentation

- **Complete Guide**: `KNOWLEDGE_GRAPH_ENHANCEMENTS.md`
- **Validation Summary**: `VALIDATION_SUMMARY.md`
- **Original Docs**: `PROJECT_GRAPH.md`, `AI_DEV_AGENT.md`

---

## ⚡ Pro Tips

### Tip 1: Auto-Sync
Install the git hook once:
```bash
npm run install-git-hook
```

Never manually sync again!

### Tip 2: Health Checks
Bookmark the dashboard:
```
http://localhost:5173/project-graph/health
```

Check it before deployments to catch issues early.

### Tip 3: Semantic Search
Use OpenAI embeddings for best results:
```bash
# .env
OPENAI_API_KEY=sk-your-key

npm run generate-embeddings
```

### Tip 4: Incremental Indexing
The system only re-indexes changed files automatically.  
No need to worry about performance!

### Tip 5: Impact Analysis
Before making changes, run:
```bash
npm run ai-dev "What depends on this file?"
```

Avoid breaking things!

---

## 🆘 Troubleshooting

### Issue: "Migration fails"
**Solution**: Make sure you have service role key access in Supabase

### Issue: "No nodes created"
**Solution**: Check that `src/` directory exists and contains `.ts`/`.tsx` files

### Issue: "Git sync not working"
**Solution**: Run `npm run install-git-hook` to install the post-commit hook

### Issue: "Embeddings fail"
**Solution**: Check `OPENAI_API_KEY` in `.env` or use local embeddings (automatic fallback)

### Issue: "Dashboard shows errors"
**Solution**: That's the point! Fix the reported broken imports or schema mismatches

---

## 🎯 Success Indicators

You'll know it's working when:

1. ✅ Dashboard shows total nodes > 100
2. ✅ Index jobs show "completed" status
3. ✅ Git sync tracks commits
4. ✅ Validation issues are visible (if any exist)
5. ✅ Tests pass (91/91)

---

## 🚀 You're Done!

Your AI Brain is now:
- 🧠 Understanding your codebase via AST
- 🔄 Auto-syncing with Git
- 🔍 Validating imports and schema
- 📊 Monitoring health
- 🎯 Ready for AI-assisted development

**Happy coding with your persistent AI Brain!** 🎉

---

**Need Help?**  
Check `KNOWLEDGE_GRAPH_ENHANCEMENTS.md` for complete documentation.
