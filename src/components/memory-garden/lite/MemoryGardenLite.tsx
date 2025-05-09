import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Types for memory nodes
export interface MemoryNode {
  id: string;
  type: "memory" | "task" | "milestone" | "ritual";
  title: string;
  description: string;
  date: string;
  tags: string[];
  importance: number; // 1-10
  connections: string[]; // IDs of connected nodes
  position?: { x: number; y: number }; // Optional position for layout
  metadata?: Record<string, any>; // Additional metadata
}

// Props for the Memory Garden Lite component
interface MemoryGardenLiteProps {
  className?: string;
  memories?: MemoryNode[];
  onMemorySelect?: (memory: MemoryNode) => void;
  onMemoryUpdate?: (memory: MemoryNode) => void;
  season?: "spring" | "summer" | "autumn" | "winter";
  height?: number;
}

/**
 * Memory Garden Lite Component
 * 
 * A 2D visualization of memories and tasks using SVG and Canvas.
 * Features include interactive nodes, seasonal themes, and natural gestures.
 */
export function MemoryGardenLite({
  className,
  memories = [],
  onMemorySelect,
  onMemoryUpdate,
  season = "spring",
  height = 500,
}: MemoryGardenLiteProps) {
  // Refs
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);
  const [detailPanelVisible, setDetailPanelVisible] = useState<boolean>(false);
  const [tooltipContent, setTooltipContent] = useState<string>("");
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [viewPosition, setViewPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load and process memories
  useEffect(() => {
    try {
      setLoading(true);
      
      // In a real implementation, this would process the memories data
      // For now, we'll just simulate the loading process
      setTimeout(() => {
        // Process memories into nodes with positions
        const processedNodes = processMemories(memories);
        setNodes(processedNodes);
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error("Failed to load memories:", err);
      setError("Failed to load memory garden");
      setLoading(false);
    }
  }, [memories]);

  // Process memories into nodes with positions
  const processMemories = (memories: MemoryNode[]): MemoryNode[] => {
    // In a real implementation, this would calculate positions based on relationships
    // For now, we'll just assign random positions
    return memories.map((memory, index) => {
      // If position is already set, use it
      if (memory.position) {
        return memory;
      }
      
      // Otherwise, calculate a position
      // This is a simple circular layout for demonstration
      const angle = (index / memories.length) * Math.PI * 2;
      const radius = 150;
      const x = Math.cos(angle) * radius + 250;
      const y = Math.sin(angle) * radius + 250;
      
      return {
        ...memory,
        position: { x, y }
      };
    });
  };

  // Handle node selection
  const handleNodeClick = (node: MemoryNode) => {
    setSelectedNode(node);
    setDetailPanelVisible(true);
    
    if (onMemorySelect) {
      onMemorySelect(node);
    }
  };

  // Handle node hover
  const handleNodeMouseEnter = (node: MemoryNode, event: React.MouseEvent) => {
    setTooltipContent(node.title);
    setTooltipPosition({ 
      x: event.clientX, 
      y: event.clientY - 40 
    });
    setTooltipVisible(true);
  };

  // Handle node hover end
  const handleNodeMouseLeave = () => {
    setTooltipVisible(false);
  };

  // Handle filter change
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  // Handle zoom in
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  // Handle reset view
  const handleResetView = () => {
    setZoomLevel(1);
    setViewPosition({ x: 0, y: 0 });
  };

  // Handle mouse down for dragging
  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  // Handle mouse move for dragging
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging) return;
    
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    
    setViewPosition(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  // Handle mouse up for dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle mouse leave for dragging
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Handle retry when error occurs
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    
    // Attempt to reload
    setTimeout(() => {
      const processedNodes = processMemories(memories);
      setNodes(processedNodes);
      setLoading(false);
    }, 1000);
  };

  // Filter nodes based on active filter
  const filteredNodes = nodes.filter(node => {
    if (activeFilter === "all") return true;
    return node.type === activeFilter;
  });

  // Render node based on type
  const renderNode = (node: MemoryNode) => {
    const { x, y } = node.position || { x: 0, y: 0 };
    const isSelected = selectedNode?.id === node.id;
    
    switch (node.type) {
      case "memory":
        return (
          <g 
            className={cn("memory-node node-memory", isSelected && "selected")}
            transform={`translate(${x}, ${y})`}
            onClick={() => handleNodeClick(node)}
            onMouseEnter={(e) => handleNodeMouseEnter(node, e)}
            onMouseLeave={handleNodeMouseLeave}
          >
            <circle r={10 + node.importance} />
            <text dy=".3em">{node.title.substring(0, 1)}</text>
          </g>
        );
      case "task":
        return (
          <g 
            className={cn("memory-node node-task", isSelected && "selected")}
            transform={`translate(${x}, ${y})`}
            onClick={() => handleNodeClick(node)}
            onMouseEnter={(e) => handleNodeMouseEnter(node, e)}
            onMouseLeave={handleNodeMouseLeave}
          >
            <rect 
              x={-(10 + node.importance)} 
              y={-(10 + node.importance)} 
              width={(10 + node.importance) * 2} 
              height={(10 + node.importance) * 2} 
            />
            <text dy=".3em">{node.title.substring(0, 1)}</text>
          </g>
        );
      case "milestone":
        return (
          <g 
            className={cn("memory-node node-milestone", isSelected && "selected")}
            transform={`translate(${x}, ${y})`}
            onClick={() => handleNodeClick(node)}
            onMouseEnter={(e) => handleNodeMouseEnter(node, e)}
            onMouseLeave={handleNodeMouseLeave}
          >
            <polygon 
              points={`0,${-(15 + node.importance)} ${15 + node.importance},0 0,${15 + node.importance} ${-(15 + node.importance)},0`} 
            />
            <text dy=".3em">{node.title.substring(0, 1)}</text>
          </g>
        );
      case "ritual":
        return (
          <g 
            className={cn("memory-node node-ritual", isSelected && "selected")}
            transform={`translate(${x}, ${y})`}
            onClick={() => handleNodeClick(node)}
            onMouseEnter={(e) => handleNodeMouseEnter(node, e)}
            onMouseLeave={handleNodeMouseLeave}
          >
            <polygon 
              points={`0,${-(12 + node.importance)} ${12 + node.importance},${-(12 + node.importance)} ${12 + node.importance},${12 + node.importance} 0,${12 + node.importance} ${-(12 + node.importance)},0`} 
            />
            <text dy=".3em">{node.title.substring(0, 1)}</text>
          </g>
        );
      default:
        return null;
    }
  };

  // Render connections between nodes
  const renderConnections = () => {
    const connections: JSX.Element[] = [];
    
    nodes.forEach(node => {
      if (!node.connections || !node.position) return;
      
      node.connections.forEach(targetId => {
        const targetNode = nodes.find(n => n.id === targetId);
        if (!targetNode || !targetNode.position) return;
        
        const isHighlighted = selectedNode?.id === node.id || selectedNode?.id === targetId;
        const isStrong = node.importance > 5 || (targetNode.importance > 5);
        
        connections.push(
          <line 
            key={`${node.id}-${targetId}`}
            x1={node.position.x}
            y1={node.position.y}
            x2={targetNode.position.x}
            y2={targetNode.position.y}
            className={cn(
              "node-connection", 
              isStrong && "strong",
              isHighlighted && "highlighted"
            )}
          />
        );
      });
    });
    
    return connections;
  };

  // Render garden elements (trees, flowers, etc.)
  const renderGardenElements = () => {
    // In a real implementation, this would render SVG elements based on the garden state
    // For now, we'll just render some placeholder elements
    return (
      <>
        <g className="garden-element garden-tree" transform="translate(50, 100)">
          <path d="M0,0 C10,-20 20,-20 30,0 C40,-30 50,-30 60,0 C70,-40 80,-40 90,0 L90,20 L0,20 Z" />
          <path d="M40,20 L40,60 L50,60 L50,20 Z" />
        </g>
        <g className="garden-element garden-flower" transform="translate(400, 80)">
          <path d="M10,10 C0,0 0,20 10,10 C20,0 20,20 10,10" />
          <path d="M10,10 L10,30" />
        </g>
        <g className="garden-element garden-rock" transform="translate(150, 400)">
          <path d="M0,10 C10,0 30,0 40,10 C50,20 50,30 40,40 C30,50 10,50 0,40 C-10,30 -10,20 0,10" />
        </g>
        <g className="garden-element garden-water" transform="translate(350, 350)">
          <path d="M0,20 C20,0 40,0 60,20 C80,40 80,60 60,80 C40,100 20,100 0,80 C-20,60 -20,40 0,20" />
        </g>
      </>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div 
        className={cn("memory-garden-lite", className)}
        style={{ height }}
      >
        <div className="garden-loading">
          <div className="garden-loading-spinner"></div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div 
        className={cn("memory-garden-lite", className)}
        style={{ height }}
      >
        <div className="garden-error">
          <div className="garden-error-icon">⚠️</div>
          <p className="garden-error-message">{error}</p>
          <button className="garden-retry-button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn("memory-garden-lite", `season-${season}`, className)}
      style={{ height }}
      ref={containerRef}
    >
      {/* SVG Canvas */}
      <div 
        className="garden-canvas-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <svg 
          ref={svgRef}
          className="garden-svg"
          viewBox="0 0 500 500"
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `scale(${zoomLevel}) translate(${viewPosition.x}px, ${viewPosition.y}px)`,
            transformOrigin: "center"
          }}
        >
          {/* Garden elements */}
          {renderGardenElements()}
          
          {/* Connections between nodes */}
          {renderConnections()}
          
          {/* Memory nodes */}
          {filteredNodes.map(node => (
            <React.Fragment key={node.id}>
              {renderNode(node)}
            </React.Fragment>
          ))}
        </svg>
      </div>
      
      {/* Filter controls */}
      <div className="garden-filters">
        <button 
          className={cn("garden-filter", activeFilter === "all" && "active")}
          onClick={() => handleFilterChange("all")}
        >
          All
        </button>
        <button 
          className={cn("garden-filter", activeFilter === "memory" && "active")}
          onClick={() => handleFilterChange("memory")}
        >
          Memories
        </button>
        <button 
          className={cn("garden-filter", activeFilter === "task" && "active")}
          onClick={() => handleFilterChange("task")}
        >
          Tasks
        </button>
        <button 
          className={cn("garden-filter", activeFilter === "milestone" && "active")}
          onClick={() => handleFilterChange("milestone")}
        >
          Milestones
        </button>
        <button 
          className={cn("garden-filter", activeFilter === "ritual" && "active")}
          onClick={() => handleFilterChange("ritual")}
        >
          Rituals
        </button>
      </div>
      
      {/* Controls */}
      <div className="garden-controls">
        <button 
          className="garden-control-button"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          +
        </button>
        <button 
          className="garden-control-button"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          -
        </button>
        <button 
          className="garden-control-button"
          onClick={handleResetView}
          title="Reset View"
        >
          ↺
        </button>
      </div>
      
      {/* Legend */}
      <div className="garden-legend">
        <div className="legend-item">
          <div className="legend-color legend-memory"></div>
          <span>Memory</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-task"></div>
          <span>Task</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-milestone"></div>
          <span>Milestone</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-ritual"></div>
          <span>Ritual</span>
        </div>
      </div>
      
      {/* Detail panel */}
      {selectedNode && (
        <div className={cn("memory-detail-panel", detailPanelVisible && "visible")}>
          <div className="detail-panel-header">
            <h3 className="detail-panel-title">{selectedNode.title}</h3>
            <button 
              className="detail-panel-close"
              onClick={() => setDetailPanelVisible(false)}
            >
              ×
            </button>
          </div>
          <div className="detail-panel-content">
            <p>{selectedNode.description}</p>
            
            <div className="detail-panel-metadata">
              <div>Type: {selectedNode.type}</div>
              <div>Date: {selectedNode.date}</div>
              <div>Tags: {selectedNode.tags.join(", ")}</div>
              <div>Importance: {selectedNode.importance}/10</div>
            </div>
            
            <div className="detail-panel-actions">
              <button className="detail-panel-button">View Details</button>
              <button className="detail-panel-button primary">Open</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Tooltip */}
      <div 
        className={cn("garden-tooltip", tooltipVisible && "visible")}
        style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y
        }}
      >
        {tooltipContent}
      </div>
    </div>
  );
}

// Export a function to add a new memory to the garden
export function addMemoryToGarden(memory: Omit<MemoryNode, "id">): MemoryNode {
  // This would be implemented in a real application to allow other components
  // to add memories to the garden without direct access to the component instance
  const id = `memory-${Date.now()}`;
  const newMemory = { ...memory, id };
  console.log("Adding memory to garden:", newMemory);
  // In a real implementation, this would use a pub/sub system or context
  return newMemory;
}
