/**
 * Project Knowledge Graph Page
 */

import { createFileRoute } from '@tanstack/react-router';
import { GraphVisualization } from '@/components/project-graph/GraphVisualization';

export const Route = createFileRoute('/project-graph')({
  component: ProjectGraphPage
});

function ProjectGraphPage() {
  return <GraphVisualization />;
}
