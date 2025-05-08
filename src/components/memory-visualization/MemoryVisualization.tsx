import React, { useState, useEffect } from 'react';
import { useAgent } from 'agents/react';
import { MemoryManager } from '../../memory/MemoryManager';
import { EmbeddingManager } from '../../memory/EmbeddingManager';

interface MemoryVisualizationProps {
  agentId: string;
  maxMemories?: number;
  height?: number;
  width?: number;
  onMemorySelect?: (memoryId: string) => void;
}

interface MemoryNode {
  id: string;
  content: string;
  importance: number;
  timestamp: number;
  category?: string;
  x: number;
  y: number;
  radius: number;
}

interface MemoryConnection {
  source: string;
  target: string;
  strength: number;
}

/**
 * MemoryVisualization component displays a visual representation of the agent's memories
 * and their relationships, using a force-directed graph layout.
 */
export const MemoryVisualization: React.FC<MemoryVisualizationProps> = ({
  agentId,
  maxMemories = 50,
  height = 500,
  width = 800,
  onMemorySelect
}) => {
  const agent = useAgent({ agent: agentId });
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [connections, setConnections] = useState<MemoryConnection[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [simulationRunning, setSimulationRunning] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeRange, setTimeRange] = useState<{ start: number; end: number } | null>(null);

  // Fetch memories and connections from the agent
  useEffect(() => {
    const fetchMemories = async () => {
      if (!agent) return;
      
      try {
        setLoading(true);
        
        // Call the agent's memory manager to get memories
        const memoryManager = new MemoryManager(agent);
        
        // Get recent memories
        const recentMemories = await agent.call('getRecentMemories', { 
          limit: maxMemories,
          searchQuery: searchQuery || undefined,
          startTime: timeRange?.start,
          endTime: timeRange?.end
        });
        
        // Get memory connections
        const memoryConnections = await agent.call('getMemoryConnections', {
          memoryIds: recentMemories.map((m: any) => m.id)
        });
        
        // Transform memories into nodes with positions
        const nodes = recentMemories.map((memory: any, index: number) => {
          // Calculate initial positions in a circle
          const angle = (index / recentMemories.length) * 2 * Math.PI;
          const radius = Math.min(width, height) * 0.4;
          
          return {
            id: memory.id,
            content: memory.content,
            importance: memory.importance || 5,
            timestamp: memory.timestamp,
            category: memory.metadata?.category,
            x: width / 2 + radius * Math.cos(angle),
            y: height / 2 + radius * Math.sin(angle),
            radius: 10 + (memory.importance || 5) * 2 // Size based on importance
          };
        });
        
        // Transform connections
        const links = memoryConnections.map((connection: any) => ({
          source: connection.source_id,
          target: connection.target_id,
          strength: connection.strength || 0.5
        }));
        
        setMemories(nodes);
        setConnections(links);
        setError(null);
      } catch (err) {
        console.error('Error fetching memories:', err);
        setError('Failed to load memories. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMemories();
  }, [agent, maxMemories, searchQuery, timeRange]);

  // Start force simulation when memories or connections change
  useEffect(() => {
    if (memories.length === 0 || simulationRunning) return;
    
    setSimulationRunning(true);
    
    // Simple force-directed layout simulation
    const simulation = () => {
      // Create a copy of the current memories
      const newMemories = [...memories];
      let moved = false;
      
      // Apply forces
      for (let i = 0; i < newMemories.length; i++) {
        const node = newMemories[i];
        
        // Repulsive force between nodes
        for (let j = 0; j < newMemories.length; j++) {
          if (i === j) continue;
          
          const otherNode = newMemories[j];
          const dx = node.x - otherNode.x;
          const dy = node.y - otherNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            const force = 1 / Math.max(distance, 1);
            node.x += dx * force;
            node.y += dy * force;
            moved = true;
          }
        }
        
        // Attractive force for connected nodes
        for (const connection of connections) {
          if (connection.source === node.id) {
            const target = newMemories.find(n => n.id === connection.target);
            if (target) {
              const dx = target.x - node.x;
              const dy = target.y - node.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance > 150) {
                const force = connection.strength * 0.05;
                node.x += dx * force;
                node.y += dy * force;
                moved = true;
              }
            }
          }
        }
        
        // Center gravity
        const centerDx = width / 2 - node.x;
        const centerDy = height / 2 - node.y;
        node.x += centerDx * 0.01;
        node.y += centerDy * 0.01;
        
        // Boundary constraints
        node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
        node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
      }
      
      setMemories(newMemories);
      
      // Continue simulation if nodes are still moving
      if (moved) {
        requestAnimationFrame(simulation);
      } else {
        setSimulationRunning(false);
      }
    };
    
    requestAnimationFrame(simulation);
    
    return () => {
      setSimulationRunning(false);
    };
  }, [memories, connections, width, height, simulationRunning]);

  // Handle memory selection
  const handleMemoryClick = (memoryId: string) => {
    setSelectedMemory(memoryId);
    if (onMemorySelect) {
      onMemorySelect(memoryId);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The search query state is already set, just trigger a re-fetch
    setLoading(true);
  };

  // Handle time range selection
  const handleTimeRangeChange = (range: string) => {
    const now = Date.now();
    let start = 0;
    
    switch (range) {
      case 'day':
        start = now - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        start = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        start = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'all':
      default:
        setTimeRange(null);
        return;
    }
    
    setTimeRange({ start, end: now });
  };

  // Get the selected memory details
  const selectedMemoryDetails = selectedMemory 
    ? memories.find(m => m.id === selectedMemory) 
    : null;

  return (
    <div className="memory-visualization-container">
      <div className="memory-visualization-controls">
        <form onSubmit={handleSearch} className="memory-search-form">
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="memory-search-input"
          />
          <button type="submit" className="memory-search-button">
            Search
          </button>
        </form>
        
        <div className="memory-time-filter">
          <span>Time range: </span>
          <select 
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="memory-time-select"
          >
            <option value="all">All time</option>
            <option value="day">Last 24 hours</option>
            <option value="week">Last week</option>
            <option value="month">Last month</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="memory-visualization-loading">
          <div className="spinner"></div>
          <p>Loading memories...</p>
        </div>
      ) : error ? (
        <div className="memory-visualization-error">
          <p>{error}</p>
          <button onClick={() => setLoading(true)}>Retry</button>
        </div>
      ) : (
        <div className="memory-visualization-content">
          <svg 
            width={width} 
            height={height} 
            className="memory-visualization-svg"
          >
            {/* Draw connections */}
            {connections.map((connection, index) => {
              const source = memories.find(m => m.id === connection.source);
              const target = memories.find(m => m.id === connection.target);
              
              if (!source || !target) return null;
              
              return (
                <line
                  key={`connection-${index}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={`rgba(150, 150, 150, ${connection.strength})`}
                  strokeWidth={connection.strength * 3}
                />
              );
            })}
            
            {/* Draw memory nodes */}
            {memories.map((memory) => {
              const isSelected = memory.id === selectedMemory;
              const timeAgo = Math.floor((Date.now() - memory.timestamp) / (24 * 60 * 60 * 1000));
              
              // Color based on category or recency
              let fill = '#6495ED'; // Default blue
              if (memory.category === 'personal') fill = '#9370DB'; // Purple
              if (memory.category === 'work') fill = '#20B2AA'; // Teal
              if (memory.category === 'important') fill = '#FF6347'; // Tomato
              
              // Fade color based on age
              const opacity = Math.max(0.3, 1 - timeAgo / 30);
              
              return (
                <g 
                  key={memory.id}
                  onClick={() => handleMemoryClick(memory.id)}
                  className="memory-node"
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={memory.x}
                    cy={memory.y}
                    r={memory.radius}
                    fill={fill}
                    fillOpacity={opacity}
                    stroke={isSelected ? '#FF4500' : '#FFFFFF'}
                    strokeWidth={isSelected ? 3 : 1}
                  />
                  {/* Show abbreviated content for larger nodes */}
                  {memory.radius > 15 && (
                    <text
                      x={memory.x}
                      y={memory.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#FFFFFF"
                      fontSize={Math.min(memory.radius * 0.8, 12)}
                      style={{ pointerEvents: 'none' }}
                    >
                      {memory.content.substring(0, 10)}...
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          
          {/* Memory details panel */}
          {selectedMemoryDetails && (
            <div className="memory-details-panel">
              <h3>Memory Details</h3>
              <p className="memory-content">{selectedMemoryDetails.content}</p>
              <div className="memory-metadata">
                <p>
                  <strong>Created:</strong> {new Date(selectedMemoryDetails.timestamp).toLocaleString()}
                </p>
                <p>
                  <strong>Importance:</strong> {selectedMemoryDetails.importance}/10
                </p>
                {selectedMemoryDetails.category && (
                  <p>
                    <strong>Category:</strong> {selectedMemoryDetails.category}
                  </p>
                )}
              </div>
              <button 
                className="memory-close-button"
                onClick={() => setSelectedMemory(null)}
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="memory-visualization-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#6495ED' }}></div>
          <span>General</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#9370DB' }}></div>
          <span>Personal</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#20B2AA' }}></div>
          <span>Work</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FF6347' }}></div>
          <span>Important</span>
        </div>
      </div>
      
      <style jsx>{`
        .memory-visualization-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .memory-visualization-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .memory-search-form {
          display: flex;
          gap: 8px;
        }
        
        .memory-search-input {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          min-width: 250px;
        }
        
        .memory-search-button {
          padding: 8px 16px;
          background-color: #4a90e2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .memory-time-filter {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .memory-time-select {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        
        .memory-visualization-content {
          position: relative;
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          background-color: #f9f9f9;
        }
        
        .memory-visualization-svg {
          display: block;
        }
        
        .memory-details-panel {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 300px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          padding: 16px;
          max-height: calc(100% - 32px);
          overflow-y: auto;
        }
        
        .memory-content {
          margin-bottom: 16px;
          line-height: 1.5;
        }
        
        .memory-metadata {
          font-size: 0.9em;
          color: #666;
        }
        
        .memory-close-button {
          margin-top: 16px;
          padding: 8px 16px;
          background-color: #f0f0f0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .memory-visualization-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: ${height}px;
        }
        
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-left-color: #4a90e2;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .memory-visualization-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: ${height}px;
          color: #d32f2f;
        }
        
        .memory-visualization-legend {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-top: 16px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
};

export default MemoryVisualization;
