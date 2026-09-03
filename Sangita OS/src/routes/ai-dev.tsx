/**
 * AI Development Agent Page
 */

import { createFileRoute } from '@tanstack/react-router';
import { AIDevPanel } from '@/components/ai-dev-agent/AIDevPanel';

export const Route = createFileRoute('/ai-dev')({
  component: AIDevPage
});

function AIDevPage() {
  return (
    <div className="h-screen">
      <AIDevPanel />
    </div>
  );
}
