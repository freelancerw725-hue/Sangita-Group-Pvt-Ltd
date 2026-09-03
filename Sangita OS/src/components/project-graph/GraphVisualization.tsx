/**
 * Project Knowledge Graph Visualization
 * Obsidian-style interactive graph
 */

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/integrations/supabase/client';

interface GraphNode {
  id: string;
  path: string;
  type: string;
  name: string;
  feature?: string;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export function GraphVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterFeature, setFilterFeature] = useState<string>('all');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const supabase = createClient();

  // Load graph data
  useEffect(() => {
    loadGraphData();
  }, [filterType, filterFeature]);

  async function loadGraphData() {
    try {
      let query = supabase
        .from('project_graph_nodes')
        .select('id, path, node_type, name, feature')
        .eq('status', 'active')
        .limit(500);

      if (filterType !== 'all') {
        query = query.eq('node_type', filterType);
      }

      if (filterFeature !== 'all') {
        query = query.eq('feature', filterFeature);
      }

      const { data: nodesData, error: nodesError } = await query;

      if (nodesError) throw nodesError;

      // Load edges for these nodes
      const nodeIds = nodesData.map(n => n.id);
      const { data: edgesData, error: edgesError } = await supabase
        .from('project_graph_edges')
        .select('source_id, target_id, edge_type')
        .in('source_id', nodeIds)
        .in('target_id', nodeIds)
        .limit(1000);

      if (edgesError) throw edgesError;

      // Initialize node positions
      const initializedNodes = nodesData.map((n, i) => ({
        id: n.id,
        path: n.path,
        type: n.node_type,
        name: n.name,
        feature: n.feature,
        x: Math.random() * 800,
        y: Math.random() * 600
      }));

      setNodes(initializedNodes);
      setEdges(edgesData.map(e => ({
        source: e.source_id,
        target: e.target_id,
        type: e.edge_type
      })));

      // Run force simulation
      simulateForces(initializedNodes);
    } catch (error) {
      console.error('Failed to load graph:', error);
    }
  }

  // Simple force-directed layout
  function simulateForces(initialNodes: GraphNode[]) {
    let currentNodes = [...initialNodes];
    const iterations = 100;
    const repulsion = 5000;
    const attraction = 0.01;
    const centerPull = 0.01;

    for (let iter = 0; iter < iterations; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const dx = currentNodes[j].x! - currentNodes[i].x!;
          const dy = currentNodes[j].y! - currentNodes[i].y!;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (distance * distance);
          
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          currentNodes[i].x! -= fx;
          currentNodes[i].y! -= fy;
          currentNodes[j].x! += fx;
          currentNodes[j].y! += fy;
        }
      }

      // Attraction along edges
      edges.forEach(edge => {
        const source = currentNodes.find(n => n.id === edge.source);
        const target = currentNodes.find(n => n.id === edge.target);
        
        if (source && target && source.x !== undefined && target.x !== undefined) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = distance * attraction;
          
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          source.x += fx;
          source.y += fy;
          target.x -= fx;
          target.y -= fy;
        }
      });

      // Pull towards center
      const centerX = 400;
      const centerY = 300;
      currentNodes.forEach(node => {
        const dx = centerX - node.x!;
        const dy = centerY - node.y!;
        node.x! += dx * centerPull;
        node.y! += dy * centerPull;
      });
    }

    setNodes(currentNodes);
  }

  // Render graph on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transform
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw edges
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1;
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      
      if (source && target && source.x !== undefined && target.x !== undefined) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y!);
        ctx.lineTo(target.x, target.y!);
        ctx.stroke();
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      if (node.x === undefined || node.y === undefined) return;

      // Node color by type
      const colors: Record<string, string> = {
        route: '#3b82f6',
        api: '#10b981',
        component: '#8b5cf6',
        service: '#f59e0b',
        hook: '#ec4899',
        db_table: '#06b6d4',
        db_rpc: '#14b8a6',
        feature: '#f43f5e',
        file: '#71717a'
      };

      ctx.fillStyle = colors[node.type] || '#71717a';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Highlight selected
      if (selectedNode?.id === node.id) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw labels for important nodes
      if (['route', 'api', 'feature'].includes(node.type)) {
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(node.name, node.x + 10, node.y + 4);
      }
    });

    ctx.restore();
  }, [nodes, edges, zoom, pan, selectedNode]);

  // Handle canvas interactions
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Find clicked node
    const clickedNode = nodes.find(node => {
      if (node.x === undefined || node.y === undefined) return false;
      const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
      return distance < 10;
    });

    setSelectedNode(clickedNode || null);
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(4, prev * delta)));
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  // Search nodes
  async function handleSearch() {
    if (!searchQuery.trim()) {
      loadGraphData();
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('search_graph_nodes', {
          p_query: searchQuery,
          p_limit: 100
        });

      if (error) throw error;

      const searchedNodes = data.map((n: any, i: number) => ({
        id: n.node_id,
        path: n.node_path,
        type: n.node_type,
        name: n.node_name,
        feature: n.feature,
        x: Math.random() * 800,
        y: Math.random() * 600
      }));

      setNodes(searchedNodes);
      simulateForces(searchedNodes);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-white">
      {/* Sidebar */}
      <div className="w-80 border-r border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <h2 className="text-lg font-semibold mb-4">Project Knowledge Graph</h2>
          
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search files, functions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm"
            />
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm"
            >
              <option value="all">All Types</option>
              <option value="route">Routes</option>
              <option value="api">APIs</option>
              <option value="component">Components</option>
              <option value="service">Services</option>
              <option value="hook">Hooks</option>
              <option value="db_table">DB Tables</option>
              <option value="db_rpc">DB RPCs</option>
            </select>

            <select
              value={filterFeature}
              onChange={e => setFilterFeature(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm"
            >
              <option value="all">All Features</option>
              <option value="bulk-email">Bulk Email</option>
              <option value="keywords">Keywords</option>
              <option value="leads">Leads</option>
              <option value="crm">CRM</option>
              <option value="ai-insights">AI Insights</option>
              <option value="tasks">Tasks</option>
              <option value="finance">Finance</option>
            </select>
          </div>
        </div>

        {/* Node details */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedNode ? (
            <div>
              <h3 className="font-semibold mb-2">Selected Node</h3>
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-neutral-400">Name:</span> {selectedNode.name}
                </div>
                <div>
                  <span className="text-neutral-400">Type:</span> {selectedNode.type}
                </div>
                <div>
                  <span className="text-neutral-400">Path:</span>{' '}
                  <code className="text-xs bg-neutral-900 px-1 py-0.5 rounded">{selectedNode.path}</code>
                </div>
                {selectedNode.feature && (
                  <div>
                    <span className="text-neutral-400">Feature:</span> {selectedNode.feature}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-neutral-500 text-sm">
              Click on a node to see details
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <h3 className="font-semibold mb-2 text-sm">Graph Stats</h3>
            <div className="text-xs space-y-1 text-neutral-400">
              <div>Nodes: {nodes.length}</div>
              <div>Edges: {edges.length}</div>
              <div>Zoom: {(zoom * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-neutral-900/90 backdrop-blur border border-neutral-800 rounded p-3 text-xs">
          <div className="font-semibold mb-2">Legend</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Routes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>APIs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Components</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span>Services</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <span>DB Tables</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            onClick={() => setZoom(prev => Math.min(4, prev * 1.2))}
            className="w-10 h-10 bg-neutral-900/90 backdrop-blur border border-neutral-800 rounded flex items-center justify-center hover:bg-neutral-800"
          >
            +
          </button>
          <button
            onClick={() => setZoom(prev => Math.max(0.1, prev / 1.2))}
            className="w-10 h-10 bg-neutral-900/90 backdrop-blur border border-neutral-800 rounded flex items-center justify-center hover:bg-neutral-800"
          >
            −
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="w-10 h-10 bg-neutral-900/90 backdrop-blur border border-neutral-800 rounded flex items-center justify-center hover:bg-neutral-800 text-xs"
          >
            ⊡
          </button>
        </div>
      </div>
    </div>
  );
}
