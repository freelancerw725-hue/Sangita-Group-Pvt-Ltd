import { KeywordIntelligencePanel } from "@/components/os/KeywordIntelligencePanel";

export default function KeywordIntelligencePage() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Keyword Intelligence Engine</h1>
        <p className="text-muted-foreground mt-1">
          Deterministic daily keyword selection with region rotation, performance-based
          prioritization, and Lead Finder integration.
        </p>
      </div>
      <KeywordIntelligencePanel />
    </div>
  );
}
