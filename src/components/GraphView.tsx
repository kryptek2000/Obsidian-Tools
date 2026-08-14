import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  EyeOff,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { VaultFile, GraphNode, GraphLink } from '../types';
import { buildGraphData } from '../utils/vaultParser';

interface GraphViewProps {
  files: VaultFile[];
  onSelectNote: (note: VaultFile) => void;
  searchQuery?: string;
}

export const GraphView: React.FC<GraphViewProps> = ({ files, onSelectNote, searchQuery = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [filterSearch, setFilterSearch] = useState(searchQuery);
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [hideOrphans, setHideOrphans] = useState(false);
  const [highlightBroken, setHighlightBroken] = useState(true);
  const [colorMode, setColorMode] = useState<'folder' | 'health' | 'tag'>('folder');
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Sync external search query
  useEffect(() => {
    if (searchQuery) setFilterSearch(searchQuery);
  }, [searchQuery]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => f.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [files]);

  // Build raw graph data
  const rawGraph = useMemo(() => buildGraphData(files), [files]);

  // Color generators - Editorial warm & refined palette
  const folderColors = useMemo(() => {
    const palette = ['#1A1A1A', '#4A4A45', '#78350F', '#1E3A8A', '#14532D', '#701A75', '#0F766E', '#831843'];
    const folders: string[] = Array.from(new Set(files.map((f) => f.folder)));
    const map = new Map<string, string>();
    folders.forEach((folder: string, idx: number) => {
      map.set(folder, palette[idx % palette.length]);
    });
    return map;
  }, [files]);

  const tagColors = useMemo(() => {
    const palette = ['#1E3A8A', '#14532D', '#78350F', '#701A75', '#0F766E', '#831843', '#334155'];
    const map = new Map<string, string>();
    allTags.forEach((tag, idx) => {
      map.set(tag, palette[idx % palette.length]);
    });
    return map;
  }, [allTags]);

  const getNodeColor = (node: GraphNode) => {
    if (colorMode === 'health') {
      if (node.isOrphan) return '#D97706'; // Amber for orphans
      if (node.hasBrokenLinks) return '#DC2626'; // Red for broken
      return '#16A34A'; // Forest Green for healthy
    }
    if (colorMode === 'tag') {
      if (node.tags.length > 0 && tagColors.has(node.tags[0])) {
        return tagColors.get(node.tags[0])!;
      }
      return '#78716C';
    }
    // Default folder mode
    return folderColors.get(node.folder) || '#1A1A1A';
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    // Set high-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Filter nodes and links based on UI controls
    let filteredNodes = rawGraph.nodes.filter((node) => {
      if (hideOrphans && node.isOrphan) return false;
      if (selectedTag !== 'all' && !node.tags.includes(selectedTag)) return false;
      return true;
    });

    const activeNodeIds = new Set(filteredNodes.map((n) => n.id));
    let filteredLinks = rawGraph.links.filter((link) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source;
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
      return activeNodeIds.has(srcId) && activeNodeIds.has(tgtId);
    });

    // Deep clone nodes and links for simulation
    const simNodes: any[] = filteredNodes.map((d) => ({ ...d }));
    const simLinks: any[] = filteredLinks.map((d) => ({ ...d }));

    // Setup D3 Force Simulation
    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3
          .forceLink(simLinks)
          .id((d: any) => d.id)
          .distance(70)
      )
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => Math.max(8, Math.min(22, 6 + d.degree * 2.5))))
      .alphaDecay(0.025);

    // Zoom transform state
    let transform = d3.zoomIdentity;

    const render = () => {
      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Light editorial background fill on canvas
      ctx.fillStyle = '#FAF9F5';
      ctx.fillRect(0, 0, width, height);

      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      // Draw links
      simLinks.forEach((link: any) => {
        const isHoverConnected =
          hoveredNode &&
          (link.source.id === hoveredNode.id || link.target.id === hoveredNode.id);

        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        if (isHoverConnected) {
          ctx.strokeStyle = '#1A1A1A';
          ctx.lineWidth = 2.5 / transform.k;
        } else {
          ctx.strokeStyle = link.isEmbed ? 'rgba(30, 58, 138, 0.35)' : 'rgba(214, 214, 210, 0.85)';
          ctx.lineWidth = 1 / transform.k;
        }
        ctx.stroke();
      });

      // Draw nodes
      simNodes.forEach((node: any) => {
        const radius = Math.max(5, Math.min(18, 5 + node.degree * 2));
        const isHovered = hoveredNode && hoveredNode.id === node.id;
        const matchesSearch =
          filterSearch.trim() !== '' &&
          node.name.toLowerCase().includes(filterSearch.toLowerCase());

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);

        // Fill color
        ctx.fillStyle = getNodeColor(node);
        ctx.fill();

        // Stroke highlight
        if (isHovered || matchesSearch) {
          ctx.strokeStyle = '#1A1A1A';
          ctx.lineWidth = 3 / transform.k;
          ctx.stroke();
        } else if (highlightBroken && node.hasBrokenLinks) {
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 2 / transform.k;
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5 / transform.k;
          ctx.stroke();
        }

        // Labels
        if (showLabels || isHovered || matchesSearch || node.degree > 3) {
          const fontSize = Math.max(9, Math.min(13, 11 / transform.k));
          ctx.font = `${isHovered ? '600' : '500'} ${fontSize}px Newsreader, Georgia, serif`;
          ctx.fillStyle = isHovered ? '#1A1A1A' : matchesSearch ? '#92400E' : '#4A4A45';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(node.name, node.x, node.y + radius + 3);
        }
      });

      ctx.restore();
    };

    simulation.on('tick', render);

    // D3 Zoom Behavior
    const zoomBehavior = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        transform = event.transform;
        render();
      });

    const d3Canvas = d3.select(canvas).call(zoomBehavior);

    // Mouse Interaction for Drag & Hover & Click
    let isDragging = false;
    let draggedNode: any = null;

    const findNodeAtCoords = (x: number, y: number) => {
      const [transX, transY] = transform.invert([x, y]);
      return simNodes.find((node) => {
        const dx = transX - node.x;
        const dy = transY - node.y;
        const radius = Math.max(6, Math.min(18, 5 + node.degree * 2));
        return Math.sqrt(dx * dx + dy * dy) <= radius + 4;
      });
    };

    canvas.onmousemove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      if (isDragging && draggedNode) {
        const [transX, transY] = transform.invert([mouseX, mouseY]);
        draggedNode.fx = transX;
        draggedNode.fy = transY;
        simulation.alpha(0.3).restart();
        return;
      }

      const found = findNodeAtCoords(mouseX, mouseY);
      if (found !== hoveredNode) {
        setHoveredNode(found || null);
        render();
      }
      canvas.style.cursor = found ? 'pointer' : 'default';
    };

    canvas.onmousedown = (event) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const found = findNodeAtCoords(mouseX, mouseY);

      if (found) {
        isDragging = true;
        draggedNode = found;
        found.fx = found.x;
        found.fy = found.y;
        simulation.alphaTarget(0.3).restart();
      }
    };

    canvas.onmouseup = () => {
      if (isDragging && draggedNode) {
        draggedNode.fx = null;
        draggedNode.fy = null;
        simulation.alphaTarget(0);
        isDragging = false;
        draggedNode = null;
      }
    };

    canvas.onclick = (event) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const found = findNodeAtCoords(mouseX, mouseY);

      if (found) {
        const fullFile = files.find((f) => f.id === found.id);
        if (fullFile) {
          onSelectNote(fullFile);
        }
      }
    };

    return () => {
      simulation.stop();
    };
  }, [
    rawGraph,
    files,
    hideOrphans,
    selectedTag,
    highlightBroken,
    colorMode,
    showLabels,
    filterSearch,
  ]);

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3.5 p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-xs">
        {/* Left: Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Node Search */}
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C88]" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Highlight note in graph..."
              className="w-full bg-[#F7F7F4] border border-[#E5E5E1] rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-[#1A1A1A] placeholder:text-[#8C8C88] focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>

          {/* Tag Filter */}
          <div className="flex items-center gap-1.5 text-xs text-[#5A5A57]">
            <Filter className="w-3.5 h-3.5 text-[#8C8C88]" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-[#F7F7F4] border border-[#E5E5E1] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
            >
              <option value="all">All Tags ({allTags.length})</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          </div>

          {/* Color Mode */}
          <div className="flex items-center gap-1.5 text-xs text-[#5A5A57]">
            <Sliders className="w-3.5 h-3.5 text-[#8C8C88]" />
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as any)}
              className="bg-[#F7F7F4] border border-[#E5E5E1] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
            >
              <option value="folder">Color by Folder</option>
              <option value="health">Color by Health (Orphan/Broken)</option>
              <option value="tag">Color by Tag</option>
            </select>
          </div>
        </div>

        {/* Right: Toggles */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setHideOrphans(!hideOrphans)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              hideOrphans
                ? 'bg-[#1A1A1A] border-[#1A1A1A] text-[#FCFCF9] font-medium shadow-xs'
                : 'bg-[#F7F7F4] border-[#E5E5E1] text-[#5A5A57] hover:text-[#1A1A1A]'
            }`}
          >
            {hideOrphans ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>Hide Orphans</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              showLabels
                ? 'bg-[#1A1A1A] border-[#1A1A1A] text-[#FCFCF9] font-medium shadow-xs'
                : 'bg-[#F7F7F4] border-[#E5E5E1] text-[#5A5A57] hover:text-[#1A1A1A]'
            }`}
          >
            <span>Labels</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Stage */}
      <div
        ref={containerRef}
        className="relative w-full h-[620px] rounded-2xl bg-[#FAF9F5] border border-[#E5E5E1] overflow-hidden shadow-xs flex items-center justify-center"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Hover Inspector Card */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 p-4 rounded-xl bg-[#FFFFFF] border border-[#E5E5E1] shadow-lg max-w-xs text-xs space-y-1.5 pointer-events-none transition-all">
            <div className="font-serif font-bold text-[#1A1A1A] flex items-center justify-between gap-2">
              <span className="truncate">{hoveredNode.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F0F0ED] border border-[#E5E5E1] text-[#1A1A1A] font-mono shrink-0">
                {hoveredNode.degree} links
              </span>
            </div>
            <div className="text-[11px] text-[#8C8C88] truncate">📁 {hoveredNode.folder}</div>
            {hoveredNode.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {hoveredNode.tags.map((t) => (
                  <span key={t} className="text-[10px] text-[#1A1A1A] bg-[#F7F7F4] border border-[#E5E5E1] px-1.5 py-0.5 rounded">
                    #{t}
                  </span>
                ))}
              </div>
            )}
            <div className="text-[10px] text-[#8C8C88] font-medium pt-1 font-sans">
              Click node to open Note Inspector
            </div>
          </div>
        )}

        {/* Legend Overlay */}
        <div className="absolute top-4 right-4 p-3.5 rounded-xl bg-[#FFFFFF]/90 border border-[#E5E5E1] text-[11px] text-[#5A5A57] space-y-1.5 backdrop-blur-xs pointer-events-none shadow-xs">
          <div className="font-semibold text-[#8C8C88] text-[10px] uppercase tracking-wider">Legend</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] inline-block" />
            <span className="text-[#1A1A1A]">Connected Note</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] inline-block" />
            <span className="text-[#1A1A1A]">Orphan Note</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] inline-block" />
            <span className="text-[#1A1A1A]">Has Broken Links</span>
          </div>
        </div>
      </div>
    </div>
  );
};
