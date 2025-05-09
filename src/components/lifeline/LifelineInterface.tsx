import React, { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { cn } from "@/lib/utils";
import { useAgent } from "@/hooks/useAgent";
import { useLearningMemoryRetrieval } from "@/hooks/useLearningMemoryRetrieval";
import { useCrossDeviceSession } from "@/hooks/useCrossDeviceSession";
import useTheme from "@/hooks/useTheme";


// Types for timeline data
export interface TimelineNode {
  id: string;
  type: "memory" | "task" | "milestone" | "ritual";
  title: string;
  content: string;
  timestamp: Date;
  tags?: string[];
  emotionalTone?: "joy" | "sadness" | "anger" | "fear" | "surprise" | "neutral";
  importance?: number; // 1-5 scale
  completed?: boolean; // For tasks
  isPredicted?: boolean; // For future events
  x?: number; // Position on the x-axis (added for D3 visualization)
  y?: number; // Position on the y-axis (added for D3 visualization)
}

export interface TimelineConnection {
  source: string; // Node ID
  target: string; // Node ID
  strength: number; // 1-5 scale
  label?: string;
  isPredicted?: boolean; // For future connections
}

export interface TimelineData {
  nodes: TimelineNode[];
  connections: TimelineConnection[];
}

// View options for the timeline
type TimelineView = "chronological" | "narrative" | "emotional" | "milestone";

// Filter options for the timeline
interface TimelineFilters {
  types: {
    memory: boolean;
    task: boolean;
    milestone: boolean;
    ritual: boolean;
  };
  timeRange: {
    start: Date | null;
    end: Date | null;
  };
  emotionalTones: {
    joy: boolean;
    sadness: boolean;
    anger: boolean;
    fear: boolean;
    surprise: boolean;
    neutral: boolean;
  };
  importance: number; // Minimum importance level (1-5)
  tags: string[]; // Selected tags
}

// Props for the Lifeline Interface component
interface LifelineInterfaceProps {
  className?: string;
  initialView?: TimelineView;
  height?: number;
}

/**
 * Lifeline Interface Component
 * 
 * A D3.js-based timeline visualization that combines tasks, memories, and milestones
 * in a meaningful story. Features include contextual zooming, visual storytelling elements,
 * emotional tagging, and predictive visualization.
 */
export function LifelineInterface({
  className,
  initialView = "chronological",
  height = 500,
}: LifelineInterfaceProps) {

  // Hooks
  const agent = useAgent();
  const { retrieveMemories } = useLearningMemoryRetrieval();
  const { currentDevice } = useCrossDeviceSession();
  
  // Apply dark theme
  useEffect(() => {
    const html = document.querySelector("html");
    html?.classList.add("dark");
    return () => {
      html?.classList.remove("dark");
    };
  }, []);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();

  // State
  const [timelineData, setTimelineData] = useState<TimelineData>({ nodes: [], connections: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<TimelineView>(initialView);
  const [selectedNode, setSelectedNode] = useState<TimelineNode | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState<boolean>(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<TimelineFilters>({
    types: {
      memory: true,
      task: true,
      milestone: true,
      ritual: true,
    },
    timeRange: {
      start: null,
      end: null,
    },
    emotionalTones: {
      joy: true,
      sadness: true,
      anger: true,
      fear: true,
      surprise: true,
      neutral: true,
    },
    importance: 1,
    tags: [],
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [snapshotModalOpen, setSnapshotModalOpen] = useState<boolean>(false);

  // Fetch timeline data
  useEffect(() => {
    const fetchTimelineData = async () => {
      if (!agent) return;

      try {
        setLoading(true);
        setError(null);

        // In a real implementation, this would fetch data from the agent
        // For now, we'll use mock data
        const mockData = generateMockTimelineData();
        setTimelineData(mockData);

        // Extract all unique tags
        const allTags = mockData.nodes
          .flatMap(node => node.tags || [])
          .filter((tag, index, self) => self.indexOf(tag) === index);
        setAvailableTags(allTags);
      } catch (err) {
        console.error("Failed to fetch timeline data:", err);
        setError("Failed to load your lifeline. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTimelineData();
  }, [agent]);

  // Apply filters to timeline data
  const filteredData = useCallback(function(): TimelineData {
    const { nodes, connections } = timelineData;

    // Filter nodes based on current filters
    const filteredNodes = nodes.filter(node => {
      // Filter by type
      if (!filters.types[node.type]) return false;

      // Filter by time range
      if (filters.timeRange.start && node.timestamp < filters.timeRange.start) return false;
      if (filters.timeRange.end && node.timestamp > filters.timeRange.end) return false;

      // Filter by emotional tone
      if (node.emotionalTone && !filters.emotionalTones[node.emotionalTone]) return false;

      // Filter by importance
      if (node.importance && node.importance < filters.importance) return false;

      // Filter by tags
      if (filters.tags.length > 0 && (!node.tags || !node.tags.some(tag => filters.tags.includes(tag)))) return false;

      return true;
    });

    // Get IDs of filtered nodes
    const filteredNodeIds = filteredNodes.map(node => node.id);

    // Filter connections to only include those between filtered nodes
    const filteredConnections = connections.filter(
      conn => filteredNodeIds.includes(conn.source) && filteredNodeIds.includes(conn.target)
    );

    return { nodes: filteredNodes, connections: filteredConnections };
  }, [timelineData, filters]);

  // Render timeline visualization using D3
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || loading || timelineData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const { width } = container.getBoundingClientRect();
    const { nodes, connections } = filteredData();

    // Clear previous visualization
    svg.selectAll("*").remove();

    // Create a group for the visualization that will be transformed by zoom
    const g = svg.append("g").attr("class", "visualization-group");

    // Set up scales based on the current view
    let xScale: d3.ScaleTime<number, number>;
    let yScale: d3.ScaleLinear<number, number>;

    // Different layout strategies based on the current view
    switch (currentView) {
      case "chronological":
        // Simple chronological layout
        xScale = d3.scaleTime()
          .domain(d3.extent(nodes, d => d.timestamp) as [Date, Date])
          .range([100, width - 100]);

        yScale = d3.scaleLinear()
          .domain([0, 1])
          .range([50, height - 50]);

        // Position nodes along the timeline
        nodes.forEach(node => {
          node.x = xScale(node.timestamp);
          node.y = yScale(0.5 + (Math.random() * 0.3 - 0.15)); // Add some vertical jitter
        });
        break;

      case "narrative":
        // Narrative layout - group related nodes together
        xScale = d3.scaleTime()
          .domain(d3.extent(nodes, d => d.timestamp) as [Date, Date])
          .range([100, width - 100]);

        yScale = d3.scaleLinear()
          .domain([0, 1])
          .range([50, height - 50]);

        // Group nodes by tags and position them
        const tagGroups: Record<string, TimelineNode[]> = {};
        nodes.forEach(node => {
          const primaryTag = node.tags && node.tags.length > 0 ? node.tags[0] : "untagged";
          if (!tagGroups[primaryTag]) tagGroups[primaryTag] = [];
          tagGroups[primaryTag].push(node);
        });

        // Position nodes by group
        let groupIndex = 0;
        const groupCount = Object.keys(tagGroups).length;
        for (const tag in tagGroups) {
          const groupNodes = tagGroups[tag];
          groupNodes.forEach(node => {
            node.x = xScale(node.timestamp);
            node.y = yScale((groupIndex + 0.5) / groupCount);
          });
          groupIndex++;
        }
        break;

      case "emotional":
        // Emotional layout - organize by emotional tone
        xScale = d3.scaleTime()
          .domain(d3.extent(nodes, d => d.timestamp) as [Date, Date])
          .range([100, width - 100]);

        // Map emotional tones to y-positions
        const emotionMap: Record<string, number> = {
          joy: 0.2,
          surprise: 0.35,
          neutral: 0.5,
          fear: 0.65,
          sadness: 0.8,
          anger: 0.9
        };

        yScale = d3.scaleLinear()
          .domain([0, 1])
          .range([50, height - 50]);

        // Position nodes by emotional tone
        nodes.forEach(node => {
          node.x = xScale(node.timestamp);
          node.y = yScale(emotionMap[node.emotionalTone || "neutral"]);
        });
        break;

      case "milestone":
        // Milestone-focused layout
        xScale = d3.scaleTime()
          .domain(d3.extent(nodes, d => d.timestamp) as [Date, Date])
          .range([100, width - 100]);

        yScale = d3.scaleLinear()
          .domain([0, 1])
          .range([50, height - 50]);

        // Highlight milestones by positioning them prominently
        nodes.forEach(node => {
          node.x = xScale(node.timestamp);
          if (node.type === "milestone") {
            node.y = yScale(0.3);
          } else if (node.type === "ritual") {
            node.y = yScale(0.7);
          } else {
            node.y = yScale(0.5 + (Math.random() * 0.2 - 0.1));
          }
        });
        break;
    }

    // Draw timeline axis
    const timelineAxis = g.append("g")
      .attr("class", "timeline-axis")
      .attr("transform", `translate(0, ${height / 2})`);

    timelineAxis.append("line")
      .attr("class", "timeline-line")
      .attr("x1", 50)
      .attr("y1", 0)
      .attr("x2", width - 50)
      .attr("y2", 0);

    // Create axis with ticks
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickSize(10)
      .tickPadding(5);

    timelineAxis.call(xAxis);

    // Draw connections between nodes
    g.selectAll(".timeline-connection")
      .data(connections)
      .enter()
      .append("path")
      .attr("class", d => `timeline-connection ${d.strength > 3 ? "strong" : ""} ${d.isPredicted ? "future" : ""} relationship-${d.strength}`)
      .attr("d", d => {
        const source = nodes.find(node => node.id === d.source);
        const target = nodes.find(node => node.id === d.target);
        if (!source || !target || source.x === undefined || source.y === undefined || 
            target.x === undefined || target.y === undefined) return "";

        // Create a curved path between nodes
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2 - 20; // Curve upward
        return `M${source.x},${source.y} Q${midX},${midY} ${target.x},${target.y}`;
      });

    // Draw nodes
    const nodeGroups = g.selectAll(".timeline-node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", d => `timeline-node ${d.isPredicted ? "future" : ""}`)
      .attr("transform", d => `translate(${d.x}, ${d.y})`)
      .on("click", (event, d) => {
        setSelectedNode(d);
        setDetailPanelOpen(true);
      })
      .on("mouseover", (event, d) => {
        // Show tooltip
        const tooltip = d3.select(tooltipRef.current);
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY + 10}px`)
          .classed("visible", true);

        tooltip.select(".tooltip-title").text(d.title);
        tooltip.select(".tooltip-content").text(d.content);
        tooltip.select(".tooltip-date").text(d.timestamp.toLocaleDateString());
        tooltip.select(".tooltip-type").text(d.type.charAt(0).toUpperCase() + d.type.slice(1));
      })
      .on("mouseout", () => {
        // Hide tooltip
        d3.select(tooltipRef.current).classed("visible", false);
      });

    // Add circles for nodes
    nodeGroups.append("circle")
      .attr("class", d => `timeline-node-circle ${d.type} ${d.isPredicted ? "future" : ""}`)
      .attr("r", d => {
        // Size based on importance
        const baseSize = 6;
        return baseSize + (d.importance || 1);
      });

    // Add icons for different node types
    nodeGroups.append("text")
      .attr("class", "timeline-node-icon")
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .text(d => {
        switch (d.type) {
          case "memory": return "M";
          case "task": return "T";
          case "milestone": return "★";
          case "ritual": return "R";
          default: return "";
        }
      });

    // Add labels for important nodes
    nodeGroups
      .filter(d => (d.importance || 1) >= 4 || d.type === "milestone")
      .append("text")
      .attr("class", d => `timeline-label ${d.isPredicted ? "future" : ""}`)
      .attr("text-anchor", "middle")
      .attr("dy", -12)
      .text(d => d.title);

    // Set up zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Reset zoom to initial state
    svg.call(zoom.transform, d3.zoomIdentity);

  }, [timelineData, filteredData, currentView, loading, height]);

  // Handle zoom controls
  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      zoomRef.current.scaleBy(svg.transition().duration(300), 1.2);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      zoomRef.current.scaleBy(svg.transition().duration(300), 0.8);
    }
  };

  const handleZoomReset = () => {
    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition().duration(300).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<TimelineFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Handle type filter toggle
  const toggleTypeFilter = (type: keyof TimelineFilters["types"]) => {
    setFilters(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: !prev.types[type]
      }
    }));
  };

  // Handle emotional tone filter toggle
  const toggleEmotionalToneFilter = (tone: keyof TimelineFilters["emotionalTones"]) => {
    setFilters(prev => ({
      ...prev,
      emotionalTones: {
        ...prev.emotionalTones,
        [tone]: !prev.emotionalTones[tone]
      }
    }));
  };

  // Handle tag filter toggle
  const toggleTagFilter = (tag: string) => {
    setFilters(prev => {
      const newTags = prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag];
      return { ...prev, tags: newTags };
    });
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      types: {
        memory: true,
        task: true,
        milestone: true,
        ritual: true,
      },
      timeRange: {
        start: null,
        end: null,
      },
      emotionalTones: {
        joy: true,
        sadness: true,
        anger: true,
        fear: true,
        surprise: true,
        neutral: true,
      },
      importance: 1,
      tags: [],
    });
  };

  // Create a snapshot of the current view
  const createSnapshot = () => {
    // In a real implementation, this would capture the SVG and convert it to an image
    setSnapshotModalOpen(true);
  };

  // Download snapshot
  const downloadSnapshot = () => {
    // In a real implementation, this would download the snapshot image
    setSnapshotModalOpen(false);
  };

  // Share snapshot
  const shareSnapshot = () => {
    // In a real implementation, this would share the snapshot
    setSnapshotModalOpen(false);
  };

  // Generate mock timeline data for development
  const generateMockTimelineData = (): TimelineData => {
    const now = new Date();
    const nodes: TimelineNode[] = [
      {
        id: "1",
        type: "milestone",
        title: "Started ImpossibleAgent Project",
        content: "Began work on the ImpossibleAgent project with a focus on creating an emotionally engaging experience.",
        timestamp: new Date(now.getFullYear(), now.getMonth() - 3, 15),
        tags: ["project", "beginning"],
        emotionalTone: "joy",
        importance: 5
      },
      {
        id: "2",
        type: "memory",
        title: "First Successful Conversation",
        content: "Had the first successful conversation with the agent, establishing a connection.",
        timestamp: new Date(now.getFullYear(), now.getMonth() - 2, 5),
        tags: ["conversation", "milestone"],
        emotionalTone: "surprise",
        importance: 4
      },
      {
        id: "3",
        type: "task",
        title: "Implement Memory System",
        content: "Implemented the core memory system for the agent to remember past interactions.",
        timestamp: new Date(now.getFullYear(), now.getMonth() - 2, 20),
        tags: ["development", "memory"],
        emotionalTone: "neutral",
        importance: 3,
        completed: true
      },
      {
        id: "4",
        type: "ritual",
        title: "Weekly Planning Session",
        content: "Conducted the first weekly planning session with the agent to set goals and priorities.",
        timestamp: new Date(now.getFullYear(), now.getMonth() - 1, 10),
        tags: ["ritual", "planning"],
        emotionalTone: "neutral",
        importance: 3
      },
      {
        id: "5",
        type: "memory",
        title: "Breakthrough in Understanding",
        content: "The agent demonstrated a deep understanding of my work patterns and preferences.",
        timestamp: new Date(now.getFullYear(), now.getMonth() - 1, 15),
        tags: ["learning", "breakthrough"],
        emotionalTone: "joy",
        importance: 4
      },
      {
        id: "6",
        type: "task",
        title: "Design UI Architecture",
        content: "Created a comprehensive UI architecture for the ImpossibleAgent with a focus on emotional engagement.",
        timestamp: new Date(now.getFullYear(), now.getMonth(), 5),
        tags: ["design", "ui"],
        emotionalTone: "neutral",
        importance: 4,
        completed: true
      },
      {
        id: "7",
        type: "milestone",
        title: "UI Architecture Completed",
        content: "Completed the UI architecture document with detailed component specifications and implementation roadmap.",
        timestamp: new Date(now.getFullYear(), now.getMonth(), 8),
        tags: ["milestone", "ui"],
        emotionalTone: "joy",
        importance: 5
      },
      {
        id: "8",
        type: "task",
        title: "Implement Lifeline Interface",
        content: "Started implementing the Lifeline Interface component for visualizing the agent's memory and user interactions.",
        timestamp: new Date(),
        tags: ["development", "ui"],
        emotionalTone: "neutral",
        importance: 4,
        completed: false
      },
      {
        id: "9",
        type: "task",
        title: "Develop Companion Avatar",
        content: "Implement the Companion Avatar with reactive, mood-based animations.",
        timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15),
        tags: ["development", "ui"],
        emotionalTone: "neutral",
        importance: 4,
        completed: false,
        isPredicted: true
      },
      {
        id: "10",
        type: "milestone",
        title: "First Release",
        content: "Release the first version of the ImpossibleAgent with core emotional engagement features.",
        timestamp: new Date(now.getFullYear(), now.getMonth() + 2, 1),
        tags: ["milestone", "release"],
        emotionalTone: "joy",
        importance: 5,
        isPredicted: true
      }
    ];

    const connections: TimelineConnection[] = [
      {
        source: "1",
        target: "2",
        strength: 3,
        label: "Led to"
      },
      {
        source: "2",
        target: "3",
        strength: 4,
        label: "Inspired"
      },
      {
        source: "3",
        target: "5",
        strength: 5,
        label: "Enabled"
      },
      {
        source: "1",
        target: "6",
        strength: 3,
        label: "Required"
      },
      {
        source: "6",
        target: "7",
        strength: 5,
        label: "Completed"
      },
      {
        source: "7",
        target: "8",
        strength: 5,
        label: "Next step"
      },
      {
        source: "8",
        target: "9",
        strength: 4,
        label: "Followed by",
        isPredicted: true
      },
      {
        source: "9",
        target: "10",
        strength: 3,
        label: "Leads to",
        isPredicted: true
      },
      {
        source: "4",
        target: "6",
        strength: 2,
        label: "Influenced"
      }
    ];

    return { nodes, connections };
  };

  // Render empty state if no data
  if (!loading && timelineData.nodes.length === 0) {
    return (
      <div className={cn("lifeline-interface", className)} style={{ height }}>
        <div className="lifeline-empty-state">
          <div className="empty-state-icon">📊</div>
          <h3 className="empty-state-title">Your Lifeline is Empty</h3>
          <p className="empty-state-description">
            As you interact with your agent, memories, tasks, and milestones will appear here,
            creating a visual story of your journey together.
          </p>
          <button className="empty-state-button">Create Your First Memory</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("lifeline-interface", className)} style={{ height }}>
      {/* Header with controls */}
      <div className="lifeline-header">
        <h2 className="lifeline-title">Your Lifeline</h2>
        <div className="lifeline-controls">
          {/* View selector */}
          <div className="lifeline-view-selector">
            <button
              className={cn("view-option", currentView === "chronological" && "active")}
              onClick={() => setCurrentView("chronological")}
            >
              Timeline
            </button>
            <button
              className={cn("view-option", currentView === "narrative" && "active")}
              onClick={() => setCurrentView("narrative")}
            >
              Narrative
            </button>
            <button
              className={cn("view-option", currentView === "emotional" && "active")}
              onClick={() => setCurrentView("emotional")}
            >
              Emotional
            </button>
            <button
              className={cn("view-option", currentView === "milestone" && "active")}
              onClick={() => setCurrentView("milestone")}
            >
              Milestones
            </button>
          </div>

          {/* Zoom controls */}
          <div className="lifeline-zoom-controls">
            <button className="zoom-button" onClick={handleZoomOut} title="Zoom Out">
              -
            </button>
            <button className="zoom-button" onClick={handleZoomReset} title="Reset Zoom">
              ↻
            </button>
            <button className="zoom-button" onClick={handleZoomIn} title="Zoom In">
              +
            </button>
          </div>

          {/* Filter button */}
          <button
            className="lifeline-filter-button"
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
          >
            <span>Filter</span>
            {filters.tags.length > 0 && (
              <span className="filter-count">{filters.tags.length}</span>
            )}
          </button>

          {/* Snapshot button */}
          <button className="snapshot-button" onClick={createSnapshot}>
            <span>Snapshot</span>
          </button>
        </div>
      </div>

      {/* Main visualization area */}
      <div className="lifeline-visualization" ref={containerRef}>
        {loading ? (
          <div className="loading-indicator">Loading your lifeline...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <>
            <svg ref={svgRef} className="lifeline-svg" height={height}></svg>
            
            {/* Tooltip */}
            <div className="timeline-tooltip" ref={tooltipRef}>
              <h4 className="tooltip-title"></h4>
              <div className="tooltip-content"></div>
              <div className="tooltip-meta">
                <span className="tooltip-date"></span>
                <span className="tooltip-type"></span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail panel */}
      <div className={cn("lifeline-detail-panel", detailPanelOpen && "open")}>
        <div className="detail-panel-header">
          <h3 className="detail-panel-title">
            {selectedNode ? `${selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)} Details` : 'Details'}
          </h3>
          <button
            className="detail-panel-close"
            onClick={() => setDetailPanelOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="detail-panel-content">
          {selectedNode && (
            <>
              <div className="detail-item">
                <h4 className="detail-item-title">Title</h4>
                <div className="detail-item-content">{selectedNode.title}</div>
              </div>
              <div className="detail-item">
                <h4 className="detail-item-title">Date</h4>
                <div className="detail-item-content">
                  {selectedNode.timestamp.toLocaleDateString()} at{" "}
                  {selectedNode.timestamp.toLocaleTimeString()}
                </div>
              </div>
              <div className="detail-item">
                <h4 className="detail-item-title">Description</h4>
                <div className="detail-item-content">{selectedNode.content}</div>
              </div>
              {selectedNode.emotionalTone && (
                <div className="detail-item">
                  <h4 className="detail-item-title">Emotional Tone</h4>
                  <div className="detail-item-content">
                    <span className={`emotional-tag ${selectedNode.emotionalTone}`}></span>
                    {selectedNode.emotionalTone.charAt(0).toUpperCase() + selectedNode.emotionalTone.slice(1)}
                  </div>
                </div>
              )}
              {selectedNode.tags && selectedNode.tags.length > 0 && (
                <div className="detail-item">
                  <h4 className="detail-item-title">Tags</h4>
                  <div className="detail-item-meta">
                    {selectedNode.tags.map(tag => (
                      <span key={tag} className="detail-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="detail-actions">
                {selectedNode.type === "task" && !selectedNode.completed && (
                  <button className="detail-action-button primary">
                    Mark as Complete
                  </button>
                )}
                <button className="detail-action-button">
                  Add to Collection
                </button>
                <button className="detail-action-button">
                  Share
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter panel */}
      <div className={cn("lifeline-filter-panel", filterPanelOpen && "open")}>
        <div className="filter-panel-header">
          <h3 className="filter-panel-title">Filter Timeline</h3>
          <button
            className="filter-panel-close"
            onClick={() => setFilterPanelOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="filter-panel-content">
          {/* Type filters */}
          <div className="filter-group">
            <h4 className="filter-group-title">Types</h4>
            <div className="filter-options">
              <div className="filter-option">
                <div
                  className={cn("filter-checkbox", filters.types.memory && "checked")}
                  onClick={() => toggleTypeFilter("memory")}
                ></div>
                <span className="filter-label">Memories</span>
              </div>
              <div className="filter-option">
                <div
                  className={cn("filter-checkbox", filters.types.task && "checked")}
                  onClick={() => toggleTypeFilter("task")}
                ></div>
                <span className="filter-label">Tasks</span>
              </div>
              <div className="filter-option">
                <div
                  className={cn("filter-checkbox", filters.types.milestone && "checked")}
                  onClick={() => toggleTypeFilter("milestone")}
                ></div>
                <span className="filter-label">Milestones</span>
              </div>
              <div className="filter-option">
                <div
                  className={cn("filter-checkbox", filters.types.ritual && "checked")}
                  onClick={() => toggleTypeFilter("ritual")}
                ></div>
                <span className="filter-label">Rituals</span>
              </div>
            </div>
          </div>

          {/* Emotional tone filters */}
          <div className="filter-group">
            <h4 className="filter-group-title">Emotional Tones</h4>
            <div className="filter-options">
              {Object.keys(filters.emotionalTones).map(tone => (
                <div className="filter-option" key={tone}>
                  <div
                    className={cn(
                      "filter-checkbox",
                      filters.emotionalTones[tone as keyof TimelineFilters["emotionalTones"]] && "checked"
                    )}
                    onClick={() => toggleEmotionalToneFilter(tone as keyof TimelineFilters["emotionalTones"])}
                  ></div>
                  <span className="filter-label">
                    <span className={`emotional-tag ${tone}`}></span>
                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Importance filter */}
          <div className="filter-group">
            <h4 className="filter-group-title">Minimum Importance</h4>
            <div className="filter-options">
              <input
                type="range"
                min="1"
                max="5"
                value={filters.importance}
                onChange={e => handleFilterChange({ importance: parseInt(e.target.value) })}
              />
              <span>{filters.importance}</span>
            </div>
          </div>

          {/* Tag filters */}
          {availableTags.length > 0 && (
            <div className="filter-group">
              <h4 className="filter-group-title">Tags</h4>
              <div className="filter-options">
                {availableTags.map(tag => (
                  <div className="filter-option" key={tag}>
                    <div
                      className={cn("filter-checkbox", filters.tags.includes(tag) && "checked")}
                      onClick={() => toggleTagFilter(tag)}
                    ></div>
                    <span className="filter-label">{tag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="filter-actions">
            <button className="filter-action-button reset" onClick={resetFilters}>
              Reset
            </button>
            <button
              className="filter-action-button apply"
              onClick={() => setFilterPanelOpen(false)}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Snapshot modal */}
      {snapshotModalOpen && (
        <div className="snapshot-modal">
          <div className="snapshot-modal-content">
            <div className="snapshot-header">
              <h3 className="snapshot-title">Timeline Snapshot</h3>
              <button
                className="snapshot-close"
                onClick={() => setSnapshotModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="snapshot-preview">
              <p>Your timeline snapshot is ready!</p>
              <div className="snapshot-image">
                {/* In a real implementation, this would be an actual image */}
                <svg width="600" height="300" style={{ border: "1px solid #ccc" }}>
                  <text x="300" y="150" textAnchor="middle">Timeline Snapshot Preview</text>
                </svg>
              </div>
            </div>
            <div className="snapshot-actions">
              <button
                className="snapshot-action-button secondary"
                onClick={() => setSnapshotModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="snapshot-action-button secondary"
                onClick={shareSnapshot}
              >
                Share
              </button>
              <button
                className="snapshot-action-button primary"
                onClick={downloadSnapshot}
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
