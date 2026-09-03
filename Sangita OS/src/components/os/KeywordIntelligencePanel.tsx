import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pause, Play, Trash2, Edit2, Search, Sparkles, Target, Loader2, RotateCcw, BarChart2, Settings, ChevronDown, ChevronUp } from "lucide-react";
import type { RegionConfig, KeywordTemplate, IntelligenceConfig } from "@/lib/keyword-intelligence/service";

type RegionRow = RegionConfig & { _editing?: boolean };
type TemplateRow = KeywordTemplate & { _editing?: boolean };

export function KeywordIntelligencePanel() {
  const [activeTab, setActiveTab] = useState<"overview" | "regions" | "templates" | "config" | "runs">("overview");

  // Overview state
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [lastRun, setLastRun] = useState<any>(null);
  const [nextRegion, setNextRegion] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalRegions: 0, activeRegions: 0, totalTemplates: 0, totalRuns: 0 });

  // Regions state
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [addRegionOpen, setAddRegionOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<RegionRow | null>(null);

  // Templates state
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | null>(null);
  const [templateRegionFilter, setTemplateRegionFilter] = useState<string>("all");

  // Config state
  const [config, setConfig] = useState<IntelligenceConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);

  // Runs state
  const [runs, setRuns] = useState<any[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [runDetailsOpen, setRunDetailsOpen] = useState(false);

  // Fetch all data
  async function fetchOverview() {
    setOverviewLoading(true);
    try {
      const [runsRes, regionsRes, templatesRes, configRes] = await Promise.all([
        fetch("/api/keyword-intelligence/runs?limit=5"),
        fetch("/api/keyword-intelligence/regions"),
        fetch("/api/keyword-intelligence/templates"),
        fetch("/api/keyword-intelligence/config"),
      ]);

      const [runsData, regionsData, templatesData, configData] = await Promise.all([
        runsRes.json(),
        regionsRes.json(),
        templatesRes.json(),
        configRes.json(),
      ]);

      if (runsData.runs?.length) setLastRun(runsData.runs[0]);
      setRegions(regionsData.regions ?? []);
      setTemplates(templatesData.templates ?? []);
      setConfig(configData.config ?? null);

      const activeRegions = regionsData.regions?.filter((r: RegionRow) => r.isActive).length ?? 0;
      setStats({
        totalRegions: regionsData.regions?.length ?? 0,
        activeRegions,
        totalTemplates: templatesData.templates?.length ?? 0,
        totalRuns: runsData.total ?? 0,
      });

      // Determine next region
      if (runsData.runs?.length && regionsData.regions?.length) {
        const lastRunRegion = runsData.runs[0].regionCode;
        const activeRegionsList = regionsData.regions.filter((r: RegionRow) => r.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
        const lastIdx = activeRegionsList.findIndex((r) => r.regionCode === lastRunRegion);
        const nextIdx = (lastIdx + 1) % activeRegionsList.length;
        setNextRegion(activeRegionsList[nextIdx]?.regionCode ?? null);
      } else if (regionsData.regions?.length) {
        const firstActive = regionsData.regions.find((r: RegionRow) => r.isActive);
        setNextRegion(firstActive?.regionCode ?? null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load overview");
    } finally {
      setOverviewLoading(false);
    }
  }

  async function fetchRegions() {
    setRegionsLoading(true);
    try {
      const res = await fetch("/api/keyword-intelligence/regions");
      const data = await res.json();
      setRegions((data.regions ?? []).map((r: RegionRow) => ({ ...r, _editing: false })));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load regions");
    } finally {
      setRegionsLoading(false);
    }
  }

  async function fetchTemplates() {
    setTemplatesLoading(true);
    try {
      const regionCode = templateRegionFilter === "all" ? undefined : templateRegionFilter;
      const url = regionCode ? `/api/keyword-intelligence/templates?regionCode=${regionCode}` : "/api/keyword-intelligence/templates";
      const res = await fetch(url);
      const data = await res.json();
      setTemplates((data.templates ?? []).map((t: TemplateRow) => ({ ...t, _editing: false })));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  }

  async function fetchConfig() {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/keyword-intelligence/config");
      const data = await res.json();
      setConfig(data.config);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load config");
    } finally {
      setConfigLoading(false);
    }
  }

  async function fetchRuns() {
    setRunsLoading(true);
    try {
      const res = await fetch("/api/keyword-intelligence/runs?limit=20");
      const data = await res.json();
      setRuns(data.runs ?? []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load runs");
    } finally {
      setRunsLoading(false);
    }
  }

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (activeTab === "regions") fetchRegions();
    else if (activeTab === "templates") fetchTemplates();
    else if (activeTab === "config") fetchConfig();
    else if (activeTab === "runs") fetchRuns();
  }, [activeTab, templateRegionFilter]);

  // Region handlers
  async function handleAddRegion(form: any) {
    try {
      const res = await fetch("/api/keyword-intelligence/regions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Region added: ${data.region.regionName}`);
      setAddRegionOpen(false);
      fetchRegions();
      fetchOverview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add region");
    }
  }

  async function handleUpdateRegion(regionCode: string, patch: any) {
    try {
      const res = await fetch(`/api/keyword-intelligence/regions/${regionCode}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Region updated");
      setEditingRegion(null);
      fetchRegions();
      fetchOverview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function toggleRegionActive(region: RegionRow) {
    await handleUpdateRegion(region.regionCode, { action: region.isActive ? "deactivate" : "activate" });
  }

  async function handleDeleteRegion(regionCode: string) {
    if (!confirm("Deactivate this region?")) return;
    try {
      const res = await fetch(`/api/keyword-intelligence/regions/${regionCode}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Region deactivated");
      fetchRegions();
      fetchOverview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  // Template handlers
  async function handleAddTemplate(form: any) {
    try {
      const res = await fetch("/api/keyword-intelligence/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Template added: ${data.template.name}`);
      setAddTemplateOpen(false);
      fetchTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add template");
    }
  }

  async function handleUpdateTemplate(id: string, patch: any) {
    try {
      const res = await fetch(`/api/keyword-intelligence/templates/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Template updated");
      setEditingTemplate(null);
      fetchTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/keyword-intelligence/templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Template deleted");
      fetchTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  // Config handlers
  async function handleSaveConfig() {
    if (!config) return;
    setConfigSaving(true);
    try {
      const res = await fetch("/api/keyword-intelligence/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Configuration saved");
      fetchOverview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save config");
    } finally {
      setConfigSaving(false);
    }
  }

  function handleConfigChange(key: string, value: any) {
    if (!config) return;
    setConfig((prev) => prev ? { ...prev, [key]: value } : null);
  }

  // Run handlers
  async function handleManualRun(dryRun = false) {
    try {
      const res = await fetch("/api/keyword-intelligence/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(dryRun ? "Dry run completed" : "Daily run executed");
      fetchRuns();
      fetchOverview();
      if (data.leadFinderResult?.failed?.length) {
        toast.warning(`${data.leadFinderResult.failed.length} keywords failed to submit`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to execute run");
    }
  }

  async function handlePreviewRun() {
    try {
      const res = await fetch("/api/keyword-intelligence/preview");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSelectedRun({ preview: true, previews: data.previews, date: data.date });
      setRunDetailsOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate preview");
    }
  }

  async function handleViewRunDetails(run: any) {
    try {
      const res = await fetch(`/api/keyword-intelligence/runs/${run.runId || run.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSelectedRun(data);
      setRunDetailsOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load run details");
    }
  }

  const filteredRegions = regions.filter((r) => r.isActive !== false || r._editing);

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Keyword Intelligence Engine
            <Badge variant="outline" className="text-[10px]">{stats.totalRegions} regions</Badge>
            <Badge variant="outline" className="text-[10px]">{stats.activeRegions} active</Badge>
            <Badge variant="outline" className="text-[10px]">{stats.totalTemplates} templates</Badge>
            <Badge variant="outline" className="text-[10px]">{stats.totalRuns} runs</Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Deterministic daily keyword selection with region rotation, performance-based prioritization, and Lead Finder integration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handlePreviewRun} disabled={overviewLoading}>
            <Sparkles className="h-3.5 w-3.5" /> Preview Today
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => handleManualRun(true)} disabled={overviewLoading}>
            <RotateCcw className="h-3.5 w-3.5" /> Dry Run
          </Button>
          <Button size="sm" className="gap-2" onClick={() => handleManualRun(false)} disabled={overviewLoading}>
            <Play className="h-3.5 w-3.5" /> Run Now
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Last Run</p>
          <p className="font-mono text-sm font-medium">{lastRun?.runDate ? new Date(lastRun.runDate).toLocaleDateString() : "Never"}</p>
          <p className="text-xs text-muted-foreground">{lastRun?.regionName} ({lastRun?.regionCode}) · {lastRun?.status ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Next Region</p>
          <p className="font-mono text-sm font-medium text-primary">{nextRegion ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Sequential rotation</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Last Run Keywords</p>
          <p className="font-mono text-sm font-medium">{lastRun?.totalKeywordsSelected ?? 0}</p>
          <p className="text-xs text-muted-foreground">Leads: {lastRun?.totalLeadsFound ?? 0} · New: {lastRun?.totalNewLeads ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Lead Finder Integration</p>
          <p className="font-mono text-sm font-medium">
            {config?.enableLeadFinderIntegration ? "Enabled" : "Disabled"}
          </p>
          <p className="text-xs text-muted-foreground">Batch size: {config?.leadFinderBatchSize ?? 10}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="runs">Run History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <h4 className="font-medium mb-3">Quick Actions</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handlePreviewRun} disabled={overviewLoading}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Preview Today's Keywords
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleManualRun(true)} disabled={overviewLoading}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Dry Run (No Lead Finder)
                </Button>
                <Button size="sm" onClick={() => handleManualRun(false)} disabled={overviewLoading}>
                  <Play className="h-3.5 w-3.5 mr-1" /> Execute Daily Run
                </Button>
                <Button variant="outline" size="sm" onClick={fetchOverview} disabled={overviewLoading}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Refresh
                </Button>
              </div>
            </div>

            {lastRun && (
              <div className="rounded-lg border border-border p-4">
                <h4 className="font-medium mb-3">Last Run Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Date:</span> <span className="ml-2 font-mono">{lastRun.runDate}</span></div>
                  <div><span className="text-muted-foreground">Region:</span> <span className="ml-2 font-mono">{lastRun.regionName} ({lastRun.regionCode})</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <span className="ml-2"><Badge variant="outline">{lastRun.status}</Badge></span></div>
                  <div><span className="text-muted-foreground">Keywords:</span> <span className="ml-2 font-mono">{lastRun.totalKeywordsSelected}</span></div>
                  <div><span className="text-muted-foreground">Searches:</span> <span className="ml-2 font-mono">{lastRun.totalSearchesInitiated}</span></div>
                  <div><span className="text-muted-foreground">Leads Found:</span> <span className="ml-2 font-mono">{lastRun.totalLeadsFound}</span></div>
                  <div><span className="text-muted-foreground">New Leads:</span> <span className="ml-2 font-mono">{lastRun.totalNewLeads}</span></div>
                  <div><span className="text-muted-foreground">Duration:</span> <span className="ml-2 font-mono">{lastRun.durationMs ? `${lastRun.durationMs}ms` : "—"}</span></div>
                </div>
                {lastRun.selectedKeywords && lastRun.selectedKeywords.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">Selected Keywords:</p>
                    <div className="flex flex-wrap gap-1">
                      {lastRun.selectedKeywords.slice(0, 15).map((k: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{k.keyword}</Badge>
                      ))}
                      {lastRun.selectedKeywords.length > 15 && <Badge variant="outline" className="text-[10px]">+{lastRun.selectedKeywords.length - 15} more</Badge>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Regions Tab */}
        <TabsContent value="regions" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <Dialog open={addRegionOpen} onOpenChange={setAddRegionOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Add Region</Button>
              </DialogTrigger>
              <AddRegionDialog onSubmit={handleAddRegion} />
            </Dialog>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-[11px] uppercase">Code</TableHead>
                  <TableHead className="text-[11px] uppercase">Name</TableHead>
                  <TableHead className="text-[11px] uppercase">Order</TableHead>
                  <TableHead className="text-[11px] uppercase">Max/Day</TableHead>
                  <TableHead className="text-[11px] uppercase">Min/Day</TableHead>
                  <TableHead className="text-[11px] uppercase">Weight</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase">Templates</TableHead>
                  <TableHead className="text-[11px] uppercase">Categories</TableHead>
                  <TableHead className="text-[11px] uppercase">Cities</TableHead>
                  <TableHead className="text-[11px] uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regionsLoading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</TableCell></TableRow>
                ) : filteredRegions.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-sm text-muted-foreground">No regions configured. Add your first region.</TableCell></TableRow>
                ) : (
                  filteredRegions.map((region) => (
                    <TableRow key={region.regionCode} className="border-border">
                      <TableCell className="text-sm font-mono">{region.regionCode}</TableCell>
                      <TableCell className="text-sm font-medium">{region.regionName}</TableCell>
                      <TableCell className="text-xs">{region.displayOrder}</TableCell>
                      <TableCell className="text-xs">{region.maxKeywordsPerDay}</TableCell>
                      <TableCell className="text-xs">{region.minKeywordsPerDay}</TableCell>
                      <TableCell className="text-xs">{region.performanceWeight}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${region.isActive ? "border-emerald-500/40 text-emerald-300" : "border-slate-500/40 text-slate-300"}`}>
                          {region.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{region.keywordTemplates?.length ?? 0}</TableCell>
                      <TableCell className="text-xs">{region.businessCategories?.length ?? 0}</TableCell>
                      <TableCell className="text-xs">{region.cityModifiers?.length ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={region.isActive ? "Deactivate" : "Activate"}
                            onClick={() => toggleRegionActive(region)}
                          >
                            {region.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Edit"
                            onClick={() => setEditingRegion({ ...region, _editing: true })}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400" title="Deactivate" onClick={() => handleDeleteRegion(region.regionCode)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Dialog open={!!editingRegion} onOpenChange={(o) => { if (!o) setEditingRegion(null); }}>
            {editingRegion && (
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader><DialogTitle>Edit Region: {editingRegion.regionName}</DialogTitle></DialogHeader>
                <EditRegionForm region={editingRegion} onSubmit={(patch) => handleUpdateRegion(editingRegion.regionCode, patch)} onCancel={() => setEditingRegion(null)} />
              </DialogContent>
            )}
          </Dialog>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <Select value={templateRegionFilter} onValueChange={setTemplateRegionFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter by region" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="">Global (no region)</SelectItem>
                {regions.filter(r => r.isActive).map((r) => <SelectItem key={r.regionCode} value={r.regionCode}>{r.regionName} ({r.regionCode})</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={addTemplateOpen} onOpenChange={setAddTemplateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Add Template</Button>
              </DialogTrigger>
              <AddTemplateDialog onSubmit={handleAddTemplate} regions={regions} />
            </Dialog>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-[11px] uppercase">Name</TableHead>
                  <TableHead className="text-[11px] uppercase">Region</TableHead>
                  <TableHead className="text-[11px] uppercase">Priority</TableHead>
                  <TableHead className="text-[11px] uppercase">Max/Run</TableHead>
                  <TableHead className="text-[11px] uppercase">Patterns</TableHead>
                  <TableHead className="text-[11px] uppercase">Categories</TableHead>
                  <TableHead className="text-[11px] uppercase">Cities</TableHead>
                  <TableHead className="text-[11px] uppercase">Suffixes</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templatesLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</TableCell></TableRow>
                ) : templates.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-sm text-muted-foreground">No templates configured. Add templates to enable keyword generation.</TableCell></TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template.id} className="border-border">
                      <TableCell className="text-sm font-medium">{template.name}</TableCell>
                      <TableCell className="text-xs">{template.regionCode ?? "Global"}</TableCell>
                      <TableCell className="text-xs">{template.priority}</TableCell>
                      <TableCell className="text-xs">{template.maxCombinationsPerRun}</TableCell>
                      <TableCell className="text-xs">{template.basePatterns?.length ?? 0}</TableCell>
                      <TableCell className="text-xs">{template.categoryModifiers?.length ?? 0}</TableCell>
                      <TableCell className="text-xs">{template.cityModifiers?.length ?? 0}</TableCell>
                      <TableCell className="text-xs">{template.suffixes?.length ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${template.isActive ? "border-emerald-500/40 text-emerald-300" : "border-slate-500/40 text-slate-300"}`}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Edit"
                            onClick={() => setEditingTemplate({ ...template, _editing: true })}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400" title="Delete" onClick={() => handleDeleteTemplate(template.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Dialog open={!!editingTemplate} onOpenChange={(o) => { if (!o) setEditingTemplate(null); }}>
            {editingTemplate && (
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader><DialogTitle>Edit Template: {editingTemplate.name}</DialogTitle></DialogHeader>
                <EditTemplateForm template={editingTemplate} onSubmit={(patch) => handleUpdateTemplate(editingTemplate.id, patch)} onCancel={() => setEditingTemplate(null)} regions={regions} />
              </DialogContent>
            )}
          </Dialog>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="mt-4">
          {configLoading ? (
            <div className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline mx-auto" />Loading…</div>
          ) : config ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <h4 className="font-medium mb-3">Rotation Settings</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium">Rotation Mode</label>
                    <Select value={config.rotationMode} onValueChange={(v) => handleConfigChange("rotationMode", v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sequential">Sequential (Round-robin)</SelectItem>
                        <SelectItem value="performance">Performance-based</SelectItem>
                        <SelectItem value="manual">Manual (Fixed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {config.rotationMode === "manual" && (
                    <div>
                      <label className="text-xs font-medium">Fixed Region Code</label>
                      <Select value={config.fixedRegionCode ?? ""} onValueChange={(v) => handleConfigChange("fixedRegionCode", v || null)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select region" /></SelectTrigger>
                        <SelectContent>
                          {regions.filter(r => r.isActive).map((r) => <SelectItem key={r.regionCode} value={r.regionCode}>{r.regionName} ({r.regionCode})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium">Analysis Window (days)</label>
                    <Input type="number" value={config.analysisWindowDays} onChange={(e) => handleConfigChange("analysisWindowDays", Number(e.target.value))} min={1} max={365} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Duplication Avoidance (days)</label>
                    <Input type="number" value={config.duplicationAvoidanceDays} onChange={(e) => handleConfigChange("duplicationAvoidanceDays", Number(e.target.value))} min={0} max={90} className="mt-1" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h4 className="font-medium mb-3">Keyword Limits</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium">Max Keywords/Day</label>
                    <Input type="number" value={config.maxKeywordsPerRegionPerDay} onChange={(e) => handleConfigChange("maxKeywordsPerRegionPerDay", Number(e.target.value))} min={1} max={100} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Min Keywords/Day</label>
                    <Input type="number" value={config.minKeywordsPerRegionPerDay} onChange={(e) => handleConfigChange("minKeywordsPerRegionPerDay", Number(e.target.value))} min={1} max={50} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Min Performance Score</label>
                    <Input type="number" value={config.minPerformanceScore} onChange={(e) => handleConfigChange("minPerformanceScore", Number(e.target.value))} min={0} max={100} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Lead Finder Batch Size</label>
                    <Input type="number" value={config.leadFinderBatchSize} onChange={(e) => handleConfigChange("leadFinderBatchSize", Number(e.target.value))} min={1} max={50} className="mt-1" />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h4 className="font-medium mb-3">Feature Toggles</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={config.autoGenerateKeywords} onChange={(e) => handleConfigChange("autoGenerateKeywords", e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm">Auto-generate keywords</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={config.enableLeadFinderIntegration} onChange={(e) => handleConfigChange("enableLeadFinderIntegration", e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm">Lead Finder integration</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={config.notificationOnFailure} onChange={(e) => handleConfigChange("notificationOnFailure", e.target.checked)} className="h-4 w-4" />
                    <span className="text-sm">Notify on failure</span>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h4 className="font-medium mb-3">Performance Score Weights (must sum to 1.0)</h4>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  {Object.entries(config.performanceScoreWeights).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-xs font-medium capitalize">{key.replace(/Rate$/, " Rate")}</label>
                      <Input
                        type="number"
                        step="0.05"
                        min={0}
                        max={1}
                        value={value}
                        onChange={(e) => handleConfigChange("performanceScoreWeights", { ...config.performanceScoreWeights, [key]: Number(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Current sum: {Object.values(config.performanceScoreWeights).reduce((a, b) => a + b, 0).toFixed(2)}
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveConfig} disabled={configSaving} className="gap-2">
                  {configSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Settings className="h-3.5 w-3.5" />}
                  Save Configuration
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No configuration loaded</div>
          )}
        </TabsContent>

        {/* Runs Tab */}
        <TabsContent value="runs" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={fetchRuns} disabled={runsLoading} className="gap-2">
              <RotateCcw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-[11px] uppercase">Date</TableHead>
                  <TableHead className="text-[11px] uppercase">Region</TableHead>
                  <TableHead className="text-[11px] uppercase">Status</TableHead>
                  <TableHead className="text-[11px] uppercase">Keywords</TableHead>
                  <TableHead className="text-[11px] uppercase">Searches</TableHead>
                  <TableHead className="text-[11px] uppercase">Leads</TableHead>
                  <TableHead className="text-[11px] uppercase">New Leads</TableHead>
                  <TableHead className="text-[11px] uppercase">Duration</TableHead>
                  <TableHead className="text-[11px] uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runsLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</TableCell></TableRow>
                ) : runs.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">No runs yet. Execute a daily run to see history.</TableCell></TableRow>
                ) : (
                  runs.map((run) => (
                    <TableRow key={run.runId || run.id} className="border-border cursor-pointer" onClick={() => handleViewRunDetails(run)}>
                      <TableCell className="text-sm font-mono">{run.runDate}</TableCell>
                      <TableCell className="text-sm">{run.regionName} <span className="text-muted-foreground">({run.regionCode})</span></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{run.status}</Badge></TableCell>
                      <TableCell className="text-xs">{run.totalKeywordsSelected}</TableCell>
                      <TableCell className="text-xs">{run.totalSearchesInitiated}</TableCell>
                      <TableCell className="text-xs">{run.totalLeadsFound}</TableCell>
                      <TableCell className="text-xs">{run.totalNewLeads}</TableCell>
                      <TableCell className="text-xs font-mono">{run.durationMs ? `${run.durationMs}ms` : "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="View Details">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Dialog open={runDetailsOpen} onOpenChange={(o) => { setRunDetailsOpen(o); if (!o) setSelectedRun(null); }}>
            {selectedRun && (
              <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedRun.preview ? "Preview Run" : `Run Details — ${selectedRun.run?.runDate ?? selectedRun.runDate}`}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {selectedRun.preview ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Date: {selectedRun.date}</p>
                      {selectedRun.previews.map((preview: any, i: number) => (
                        <div key={i} className="rounded-lg border border-border p-3 mb-3">
                          <h5 className="font-medium mb-2">{preview.regionName} ({preview.regionCode}) — {preview.selectedCount} keywords</h5>
                          {preview.error && <p className="text-rose-400 text-sm mb-2">Error: {preview.error}</p>}
                          <div className="flex flex-wrap gap-1">
                            {preview.keywords?.slice(0, 20).map((k: any, j: number) => (
                              <Badge key={j} variant="secondary" className="text-[10px]">{k.keyword} <span className="text-[9px] opacity-70">({k.source})</span></Badge>
                            ))}
                            {preview.keywords && preview.keywords.length > 20 && <Badge variant="outline" className="text-[10px]">+{preview.keywords.length - 20} more</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      {selectedRun.run && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div><span className="text-muted-foreground">Date:</span> <span className="ml-2 font-mono">{selectedRun.run.runDate}</span></div>
                          <div><span className="text-muted-foreground">Region:</span> <span className="ml-2 font-mono">{selectedRun.run.regionName} ({selectedRun.run.regionCode})</span></div>
                          <div><span className="text-muted-foreground">Status:</span> <span className="ml-2"><Badge variant="outline">{selectedRun.run.status}</Badge></span></div>
                          <div><span className="text-muted-foreground">Duration:</span> <span className="ml-2 font-mono">{selectedRun.run.durationMs ? `${selectedRun.run.durationMs}ms` : "—"}</span></div>
                          <div><span className="text-muted-foreground">Keywords:</span> <span className="ml-2 font-mono">{selectedRun.run.totalKeywordsSelected}</span></div>
                          <div><span className="text-muted-foreground">Searches:</span> <span className="ml-2 font-mono">{selectedRun.run.totalSearchesInitiated}</span></div>
                          <div><span className="text-muted-foreground">Leads:</span> <span className="ml-2 font-mono">{selectedRun.run.totalLeadsFound}</span></div>
                          <div><span className="text-muted-foreground">New Leads:</span> <span className="ml-2 font-mono">{selectedRun.run.totalNewLeads}</span></div>
                        </div>
                      )}
                      {selectedRun.selections && selectedRun.selections.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2">Selected Keywords ({selectedRun.selections.length})</h5>
                          <div className="rounded-lg border border-border overflow-hidden max-h-64 overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="border-border">
                                  <TableHead className="text-[11px] uppercase">Keyword</TableHead>
                                  <TableHead className="text-[11px] uppercase">Source</TableHead>
                                  <TableHead className="text-[11px] uppercase">Priority</TableHead>
                                  <TableHead className="text-[11px] uppercase">Daily Target</TableHead>
                                  <TableHead className="text-[11px] uppercase">Reason</TableHead>
                                  <TableHead className="text-[11px] uppercase">Perf Score</TableHead>
                                  <TableHead className="text-[11px] uppercase">Template</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedRun.selections.map((s: any) => (
                                  <TableRow key={s.keywordId || s.keyword} className="border-border">
                                    <TableCell className="text-sm font-medium">{s.keyword}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-[10px]">{s.source}</Badge></TableCell>
                                    <TableCell className="text-xs">{s.priority}</TableCell>
                                    <TableCell className="text-xs">{s.dailyTarget}</TableCell>
                                    <TableCell className="text-xs max-w-xs truncate">{s.selectionReason}</TableCell>
                                    <TableCell className="text-xs">{s.performanceScore ?? "—"}</TableCell>
                                    <TableCell className="text-xs">{s.templateId ?? "—"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </DialogContent>
            )}
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Dialog Forms
// ============================================================

function AddRegionDialog({ onSubmit }: { onSubmit: (form: any) => void }) {
  const [form, setForm] = useState({
    regionCode: "", regionName: "", displayOrder: 0,
    keywordTemplates: [] as string[], businessCategories: [] as string[],
    cityModifiers: [] as string[], languageModifiers: [] as string[],
    maxKeywordsPerDay: 20, minKeywordsPerDay: 5, performanceWeight: 1.0, isActive: true,
  });

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>Add Region</DialogTitle></DialogHeader>
      <div className="grid gap-3 py-2 max-h-[70vh] overflow-auto">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium">Region Code *</label><Input placeholder="BR" value={form.regionCode} onChange={(e) => setForm({...form, regionCode: e.target.value.toUpperCase()})} /></div>
          <div><label className="text-xs font-medium">Region Name *</label><Input placeholder="Bihar" value={form.regionName} onChange={(e) => setForm({...form, regionName: e.target.value})} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-xs font-medium">Display Order</label><Input type="number" value={form.displayOrder} onChange={(e) => setForm({...form, displayOrder: Number(e.target.value)})} /></div>
          <div><label className="text-xs font-medium">Max/Day</label><Input type="number" value={form.maxKeywordsPerDay} onChange={(e) => setForm({...form, maxKeywordsPerDay: Number(e.target.value)})} min={1} max={100} /></div>
          <div><label className="text-xs font-medium">Min/Day</label><Input type="number" value={form.minKeywordsPerDay} onChange={(e) => setForm({...form, minKeywordsPerDay: Number(e.target.value)})} min={1} max={50} /></div>
        </div>
        <div><label className="text-xs font-medium">Performance Weight</label><Input type="number" step="0.1" value={form.performanceWeight} onChange={(e) => setForm({...form, performanceWeight: Number(e.target.value)})} min={0.1} max={5} className="w-32" /></div>
        <div><label className="text-xs font-medium">Keyword Templates (JSON array)</label><Textarea placeholder='["{region} News", "{region} {category}"]' value={JSON.stringify(form.keywordTemplates, null, 2)} onChange={(e) => { try { setForm({...form, keywordTemplates: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
        <div><label className="text-xs font-medium">Business Categories (JSON array)</label><Textarea placeholder='["Business", "Politics", "Education"]' value={JSON.stringify(form.businessCategories, null, 2)} onChange={(e) => { try { setForm({...form, businessCategories: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
        <div><label className="text-xs font-medium">City Modifiers (JSON array)</label><Textarea placeholder='["Patna", "Gaya"]' value={JSON.stringify(form.cityModifiers, null, 2)} onChange={(e) => { try { setForm({...form, cityModifiers: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
        <div><label className="text-xs font-medium">Language Modifiers (JSON array)</label><Textarea placeholder='["हिंदी", "English"]' value={JSON.stringify(form.languageModifiers, null, 2)} onChange={(e) => { try { setForm({...form, languageModifiers: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
      </div>
      <DialogFooter><Button onClick={() => onSubmit(form)} disabled={!form.regionCode || !form.regionName}>Add Region</Button></DialogFooter>
    </DialogContent>
  );
}

function EditRegionForm({ region, onSubmit, onCancel }: { region: RegionRow; onSubmit: (patch: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    regionName: region.regionName, displayOrder: region.displayOrder,
    keywordTemplates: region.keywordTemplates, businessCategories: region.businessCategories,
    cityModifiers: region.cityModifiers, languageModifiers: region.languageModifiers,
    maxKeywordsPerDay: region.maxKeywordsPerDay, minKeywordsPerDay: region.minKeywordsPerDay,
    performanceWeight: region.performanceWeight, isActive: region.isActive,
  });

  return (
    <div className="grid gap-3 py-2 max-h-[70vh] overflow-auto">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium">Region Name</label><Input value={form.regionName} onChange={(e) => setForm({...form, regionName: e.target.value})} /></div>
        <div><label className="text-xs font-medium">Display Order</label><Input type="number" value={form.displayOrder} onChange={(e) => setForm({...form, displayOrder: Number(e.target.value)})} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-xs font-medium">Max/Day</label><Input type="number" value={form.maxKeywordsPerDay} onChange={(e) => setForm({...form, maxKeywordsPerDay: Number(e.target.value)})} /></div>
        <div><label className="text-xs font-medium">Min/Day</label><Input type="number" value={form.minKeywordsPerDay} onChange={(e) => setForm({...form, minKeywordsPerDay: Number(e.target.value)})} /></div>
        <div><label className="text-xs font-medium">Weight</label><Input type="number" step="0.1" value={form.performanceWeight} onChange={(e) => setForm({...form, performanceWeight: Number(e.target.value)})} /></div>
      </div>
      <div><label className="text-xs font-medium">Keyword Templates</label><Textarea value={JSON.stringify(form.keywordTemplates, null, 2)} onChange={(e) => { try { setForm({...form, keywordTemplates: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
      <div><label className="text-xs font-medium">Business Categories</label><Textarea value={JSON.stringify(form.businessCategories, null, 2)} onChange={(e) => { try { setForm({...form, businessCategories: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
      <div><label className="text-xs font-medium">City Modifiers</label><Textarea value={JSON.stringify(form.cityModifiers, null, 2)} onChange={(e) => { try { setForm({...form, cityModifiers: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
      <div><label className="text-xs font-medium">Language Modifiers</label><Textarea value={JSON.stringify(form.languageModifiers, null, 2)} onChange={(e) => { try { setForm({...form, languageModifiers: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
      <div><label className="text-xs font-medium flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({...form, isActive: e.target.checked})} className="h-4 w-4" /> Active</label></div>
      <div className="flex justify-end gap-2 mt-2"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onSubmit(form)}>Save</Button></div>
    </div>
  );
}

function AddTemplateDialog({ onSubmit, regions }: { onSubmit: (form: any) => void; regions: RegionRow[] }) {
  const [form, setForm] = useState({
    name: "", description: "", regionCode: "",
    basePatterns: [] as string[], categoryModifiers: [] as string[],
    cityModifiers: [] as string[], languageModifiers: [] as string[],
    suffixes: [] as string[], maxCombinationsPerRun: 50, priority: 5, sourceTag: "generated", isActive: true,
  });

  return (
    <DialogContent className="sm:max-w-3xl">
      <DialogHeader><DialogTitle>Add Keyword Template</DialogTitle></DialogHeader>
      <div className="grid gap-3 py-2 max-h-[70vh] overflow-auto">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-medium">Name *</label><Input placeholder="Bihar Local" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
          <div><label className="text-xs font-medium">Region</label>
            <Select value={form.regionCode} onValueChange={(v) => setForm({...form, regionCode: v})}>
              <SelectTrigger><SelectValue placeholder="Global (all regions)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Global</SelectItem>
                {regions.filter(r => r.isActive).map((r) => <SelectItem key={r.regionCode} value={r.regionCode}>{r.regionName} ({r.regionCode})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-xs font-medium">Priority (1=highest)</label><Input type="number" value={form.priority} onChange={(e) => setForm({...form, priority: Number(e.target.value)})} min={1} max={10} /></div>
          <div><label className="text-xs font-medium">Max/Run</label><Input type="number" value={form.maxCombinationsPerRun} onChange={(e) => setForm({...form, maxCombinationsPerRun: Number(e.target.value)})} min={1} max={200} /></div>
          <div><label className="text-xs font-medium">Source Tag</label><Input value={form.sourceTag} onChange={(e) => setForm({...form, sourceTag: e.target.value})} /></div>
        </div>
        <div><label className="text-xs font-medium">Description</label><Textarea placeholder="Optional" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} /></div>
        <div><label className="text-xs font-medium">Base Patterns (JSON array)</label><Textarea placeholder='["{region} News", "{region} {category}", "{city} News"]' value={JSON.stringify(form.basePatterns, null, 2)} onChange={(e) => { try { setForm({...form, basePatterns: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
        <div><label className="text-xs font-medium">Category Modifiers (JSON array)</label><Textarea placeholder='["Business", "Politics", "Education"]' value={JSON.stringify(form.categoryModifiers, null, 2)} onChange={(e) => { try { setForm({...form, categoryModifiers: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
        <div><label className="text-xs font-medium">City Modifiers (JSON array)</label><Textarea placeholder='["Patna", "Gaya"]' value={JSON.stringify(form.cityModifiers, null, 2)} onChange={(e) => { try { setForm({...form, cityModifiers: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
        <div><label className="text-xs font-medium">Language Modifiers (JSON array)</label><Textarea placeholder='["हिंदी", "English"]' value={JSON.stringify(form.languageModifiers, null, 2)} onChange={(e) => { try { setForm({...form, languageModifiers: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
        <div><label className="text-xs font-medium">Suffixes (JSON array)</label><Textarea placeholder='["Live", "Updates", "Today", "Breaking"]' value={JSON.stringify(form.suffixes, null, 2)} onChange={(e) => { try { setForm({...form, suffixes: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
        <div><label className="text-xs font-medium flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({...form, isActive: e.target.checked})} className="h-4 w-4" /> Active</label></div>
      </div>
      <DialogFooter><Button onClick={() => onSubmit(form)} disabled={!form.name || !form.basePatterns?.length}>Add Template</Button></DialogFooter>
    </DialogContent>
  );
}

function EditTemplateForm({ template, onSubmit, onCancel, regions }: { template: TemplateRow; onSubmit: (patch: any) => void; onCancel: () => void; regions: RegionRow[] }) {
  const [form, setForm] = useState({
    name: template.name, description: template.description, regionCode: template.regionCode ?? "",
    basePatterns: template.basePatterns, categoryModifiers: template.categoryModifiers,
    cityModifiers: template.cityModifiers, languageModifiers: template.languageModifiers,
    suffixes: template.suffixes, maxCombinationsPerRun: template.maxCombinationsPerRun,
    priority: template.priority, sourceTag: template.sourceTag, isActive: template.isActive,
  });

  return (
    <div className="grid gap-3 py-2 max-h-[70vh] overflow-auto">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium">Name</label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
        <div><label className="text-xs font-medium">Region</label>
          <Select value={form.regionCode} onValueChange={(v) => setForm({...form, regionCode: v})}>
            <SelectTrigger><SelectValue placeholder="Global" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Global</SelectItem>
              {regions.filter(r => r.isActive).map((r) => <SelectItem key={r.regionCode} value={r.regionCode}>{r.regionName} ({r.regionCode})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-xs font-medium">Priority</label><Input type="number" value={form.priority} onChange={(e) => setForm({...form, priority: Number(e.target.value)})} /></div>
        <div><label className="text-xs font-medium">Max/Run</label><Input type="number" value={form.maxCombinationsPerRun} onChange={(e) => setForm({...form, maxCombinationsPerRun: Number(e.target.value)})} /></div>
        <div><label className="text-xs font-medium">Source Tag</label><Input value={form.sourceTag} onChange={(e) => setForm({...form, sourceTag: e.target.value})} /></div>
      </div>
      <div><label className="text-xs font-medium">Description</label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} /></div>
      <div><label className="text-xs font-medium">Base Patterns</label><Textarea value={JSON.stringify(form.basePatterns, null, 2)} onChange={(e) => { try { setForm({...form, basePatterns: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
      <div><label className="text-xs font-medium">Category Modifiers</label><Textarea value={JSON.stringify(form.categoryModifiers, null, 2)} onChange={(e) => { try { setForm({...form, categoryModifiers: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
      <div><label className="text-xs font-medium">City Modifiers</label><Textarea value={JSON.stringify(form.cityModifiers, null, 2)} onChange={(e) => { try { setForm({...form, cityModifiers: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
      <div><label className="text-xs font-medium">Language Modifiers</label><Textarea value={JSON.stringify(form.languageModifiers, null, 2)} onChange={(e) => { try { setForm({...form, languageModifiers: JSON.parse(e.target.value)}); } catch {} }} rows={2} }}</div>
      <div><label className="text-xs font-medium">Suffixes</label><Textarea value={JSON.stringify(form.suffixes, null, 2)} onChange={(e) => { try { setForm({...form, suffixes: JSON.parse(e.target.value)}); } catch {} }} rows={2} /></div>
      <div><label className="text-xs font-medium flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({...form, isActive: e.target.checked})} className="h-4 w-4" /> Active</label></div>
      <div className="flex justify-end gap-2 mt-2"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button onClick={() => onSubmit(form)}>Save</Button></div>
    </div>
  );
}