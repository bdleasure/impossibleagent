import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, useTexture, Environment, Sky, Stars } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";

// Types for memory nodes (same as MemoryGardenLite for consistency)
export interface MemoryNode {
  id: string;
  type: "memory" | "task" | "milestone" | "ritual";
  title: string;
  description: string;
  date: string;
  tags: string[];
  importance: number; // 1-10
  connections: string[]; // IDs of connected nodes
  position?: { x: number; y: number; z?: number }; // Optional position for layout
  metadata?: Record<string, any>; // Additional metadata
}

// Props for the Memory Garden component
interface MemoryGardenProps {
  className?: string;
  memories?: MemoryNode[];
  onMemorySelect?: (memory: MemoryNode) => void;
  onMemoryUpdate?: (memory: MemoryNode) => void;
  season?: "spring" | "summer" | "autumn" | "winter";
  height?: number;
  environmentType?: "forest" | "meadow" | "beach" | "mountain";
  timeOfDay?: "dawn" | "day" | "dusk" | "night";
}

// Type for season colors
interface SeasonColors {
  spring: {
    ground: string;
    fog: string;
  };
  summer: {
    ground: string;
    fog: string;
  };
  autumn: {
    ground: string;
    fog: string;
  };
  winter: {
    ground: string;
    fog: string;
  };
}

// Type for time of day colors
interface TimeOfDayColors {
  dawn: string;
  day: string;
  dusk: string;
  night: string;
}

// Type for time of day intensities
interface TimeOfDayIntensities {
  dawn: number;
  day: number;
  dusk: number;
  night: number;
}

/**
 * Memory Garden Component (3D)
 * 
 * A Three.js-based 3D environment for immersive memory and task exploration.
 * Features include organic growth algorithms, 3D models, immersive navigation,
 * visual connections, and special effects for important memories.
 */
export function MemoryGarden({
  className,
  memories = [],
  onMemorySelect,
  onMemoryUpdate,
  season = "spring",
  height = 600,
  environmentType = "forest",
  timeOfDay = "day",
}: MemoryGardenProps) {
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);
  const [detailPanelVisible, setDetailPanelVisible] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 10, 20]);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([0, 0, 0]);
  const [environmentSettings, setEnvironmentSettings] = useState({
    groundColor: getSeasonColor(season as keyof SeasonColors, "ground"),
    fogColor: getSeasonColor(season as keyof SeasonColors, "fog"),
    fogDensity: 0.02,
    skyColor: getTimeOfDayColor(timeOfDay as keyof TimeOfDayColors),
    lightIntensity: getTimeOfDayLightIntensity(timeOfDay as keyof TimeOfDayIntensities),
  });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Load and process memories
  useEffect(() => {
    try {
      setLoading(true);
      
      // Process memories into nodes with 3D positions
      const processedNodes = processMemories(memories);
      setNodes(processedNodes);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load memories:", err);
      setError("Failed to load memory garden");
      setLoading(false);
    }
  }, [memories]);

  // Update environment settings when season or time of day changes
  useEffect(() => {
    setEnvironmentSettings({
      groundColor: getSeasonColor(season as keyof SeasonColors, "ground"),
      fogColor: getSeasonColor(season as keyof SeasonColors, "fog"),
      fogDensity: 0.02,
      skyColor: getTimeOfDayColor(timeOfDay as keyof TimeOfDayColors),
      lightIntensity: getTimeOfDayLightIntensity(timeOfDay as keyof TimeOfDayIntensities),
    });
  }, [season, timeOfDay]);

  // Process memories into nodes with 3D positions
  const processMemories = (memories: MemoryNode[]): MemoryNode[] => {
    // In a real implementation, this would calculate positions based on relationships
    // For now, we'll use a simple algorithm to position nodes in 3D space
    return memories.map((memory, index) => {
      // If position with z is already set, use it
      if (memory.position && memory.position.z !== undefined) {
        return memory;
      }
      
      // Otherwise, calculate a position
      // This is a simple spiral layout for demonstration
      const angle = (index / Math.max(memories.length, 1)) * Math.PI * 4;
      const radius = 10 + (index % 5) * 2;
      const height = Math.sin(angle) * 3;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = height;
      
      return {
        ...memory,
        position: { x, y, z }
      };
    });
  };

  // Handle node selection
  const handleNodeClick = (node: MemoryNode) => {
    setSelectedNode(node);
    setDetailPanelVisible(true);
    
    // Animate camera to focus on the selected node
    if (node.position) {
      const { x, y, z } = node.position;
      setCameraTarget([x, y || 0, z || 0]);
      setCameraPosition([x + 5, (y || 0) + 5, (z || 0) + 5]);
    }
    
    if (onMemorySelect) {
      onMemorySelect(node);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  // Handle reset view
  const handleResetView = () => {
    setCameraPosition([0, 10, 20]);
    setCameraTarget([0, 0, 0]);
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

  // Helper function to get season-specific colors
  function getSeasonColor(season: keyof SeasonColors, element: "ground" | "fog"): string {
    const colors: SeasonColors = {
      spring: {
        ground: "#88c172",
        fog: "#e0f7fa",
      },
      summer: {
        ground: "#8bc34a",
        fog: "#e3f2fd",
      },
      autumn: {
        ground: "#d7a35e",
        fog: "#fff3e0",
      },
      winter: {
        ground: "#eceff1",
        fog: "#e0f7fa",
      },
    };
    
    return colors[season][element];
  }

  // Helper function to get time-of-day-specific colors
  function getTimeOfDayColor(timeOfDay: keyof TimeOfDayColors): string {
    const colors: TimeOfDayColors = {
      dawn: "#ffcdd2",
      day: "#bbdefb",
      dusk: "#ffccbc",
      night: "#263238",
    };
    
    return colors[timeOfDay];
  }

  // Helper function to get time-of-day-specific light intensity
  function getTimeOfDayLightIntensity(timeOfDay: keyof TimeOfDayIntensities): number {
    const intensities: TimeOfDayIntensities = {
      dawn: 0.8,
      day: 1.0,
      dusk: 0.7,
      night: 0.3,
    };
    
    return intensities[timeOfDay];
  }

  // Render loading state
  if (loading) {
    return (
      <div 
        className={cn("memory-garden", className)}
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
        className={cn("memory-garden", className)}
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
      className={cn("memory-garden", `season-${season}`, className)}
      style={{ height }}
      ref={containerRef}
    >
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: cameraPosition, fov: 75 }}
        shadows
        className="garden-canvas"
      >
        {/* Environment */}
        <GardenEnvironment 
          season={season} 
          environmentType={environmentType}
          timeOfDay={timeOfDay}
          settings={environmentSettings}
        />
        
        {/* Lighting */}
        <ambientLight intensity={environmentSettings.lightIntensity * 0.5} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={environmentSettings.lightIntensity} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
        />
        
        {/* Ground */}
        <Ground color={environmentSettings.groundColor} />
        
        {/* Memory nodes */}
        {filteredNodes.map(node => (
          <MemoryNodeObject 
            key={node.id}
            node={node}
            onClick={() => handleNodeClick(node)}
            isSelected={selectedNode?.id === node.id}
          />
        ))}
        
        {/* Connections between nodes */}
        <Connections nodes={filteredNodes} selectedNodeId={selectedNode?.id} />
        
        {/* Garden elements based on environment type */}
        <GardenElements 
          environmentType={environmentType} 
          season={season} 
          nodes={filteredNodes}
        />
        
        {/* Camera controls */}
        <OrbitControls
          target={new THREE.Vector3(...cameraTarget)}
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2}
          minDistance={2}
          maxDistance={50}
        />
        
        {/* Sky */}
        {timeOfDay === "night" ? (
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
        ) : (
          <Sky 
            distance={450000} 
            sunPosition={getSunPosition(timeOfDay as keyof TimeOfDayColors)} 
            inclination={0.6} 
            azimuth={0.25} 
          />
        )}
      </Canvas>
      
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
    </div>
  );
}

// Helper function to get sun position based on time of day
function getSunPosition(timeOfDay: keyof TimeOfDayColors): [number, number, number] {
  switch (timeOfDay) {
    case "dawn":
      return [1, 0.2, 1];
    case "day":
      return [1, 1, 1];
    case "dusk":
      return [-1, 0.2, -1];
    case "night":
      return [0, -1, 0];
    default:
      return [1, 1, 1];
  }
}

// Ground component
function Ground({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// Memory Node 3D Object
function MemoryNodeObject({ 
  node, 
  onClick, 
  isSelected 
}: { 
  node: MemoryNode; 
  onClick: () => void; 
  isSelected: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Animation
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Gentle floating animation
    meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 0.5 + parseInt(node.id.replace(/\D/g, '1'), 36)) * 0.002;
    
    // Rotation for selected or hovered nodes
    if (isSelected || hovered) {
      meshRef.current.rotation.y += 0.01;
    }
  });
  
  // Get node color based on type
  const getNodeColor = (type: string): string => {
    switch (type) {
      case "memory":
        return "#89b4fa";
      case "task":
        return "#f38ba8";
      case "milestone":
        return "#f9e2af";
      case "ritual":
        return "#a6e3a1";
      default:
        return "#89b4fa";
    }
  };
  
  // Get node geometry based on type
  const getNodeGeometry = (type: string) => {
    const size = 0.5 + (node.importance * 0.1);
    
    switch (type) {
      case "memory":
        return <sphereGeometry args={[size, 32, 32]} />;
      case "task":
        return <boxGeometry args={[size, size, size]} />;
      case "milestone":
        return <octahedronGeometry args={[size, 0]} />;
      case "ritual":
        return <dodecahedronGeometry args={[size, 0]} />;
      default:
        return <sphereGeometry args={[size, 32, 32]} />;
    }
  };
  
  // Position from node
  const position: [number, number, number] = [
    node.position?.x ?? 0,
    node.position?.y ?? 0,
    node.position?.z ?? 0
  ];
  
  return (
    <group position={position}>
      {/* Node object */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        {getNodeGeometry(node.type)}
        <meshStandardMaterial 
          color={getNodeColor(node.type)} 
          emissive={isSelected || hovered ? getNodeColor(node.type) : "#000000"}
          emissiveIntensity={isSelected ? 0.5 : hovered ? 0.3 : 0}
          metalness={0.2}
          roughness={0.7}
        />
      </mesh>
      
      {/* Node label */}
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
        visible={isSelected || hovered}
      >
        {node.title}
      </Text>
      
      {/* Importance indicator (glow effect for important nodes) */}
      {node.importance > 7 && (
        <pointLight
          position={[0, 0, 0]}
          distance={3}
          intensity={0.5}
          color={getNodeColor(node.type)}
        />
      )}
    </group>
  );
}

// Connections between nodes
function Connections({ 
  nodes, 
  selectedNodeId 
}: { 
  nodes: MemoryNode[]; 
  selectedNodeId?: string;
}) {
  const connections: React.ReactNode[] = [];
  
  nodes.forEach(node => {
    if (!node.connections || !node.position) return;
    
    node.connections.forEach(targetId => {
      const targetNode = nodes.find(n => n.id === targetId);
      if (!targetNode || !targetNode.position) return;
      
      const isHighlighted = selectedNodeId === node.id || selectedNodeId === targetId;
      const isStrong = node.importance > 5 || (targetNode.importance > 5);
      
      // Start and end positions
      const start: [number, number, number] = [
        node.position?.x ?? 0,
        node.position?.y ?? 0,
        node.position?.z ?? 0
      ];
      
      const end: [number, number, number] = [
        targetNode.position?.x ?? 0,
        targetNode.position?.y ?? 0,
        targetNode.position?.z ?? 0
      ];
      
      // Create a curved line between nodes
      connections.push(
        <ConnectionLine 
          key={`${node.id}-${targetId}`}
          start={start}
          end={end}
          isHighlighted={isHighlighted}
          isStrong={isStrong}
          nodeType={node.type}
        />
      );
    });
  });
  
  return <>{connections}</>;
}

// Connection line between nodes
function ConnectionLine({ 
  start, 
  end, 
  isHighlighted, 
  isStrong,
  nodeType
}: { 
  start: [number, number, number]; 
  end: [number, number, number]; 
  isHighlighted: boolean;
  isStrong: boolean;
  nodeType: string;
}) {
  // Create a curved path between points
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...start),
    new THREE.Vector3(
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2 + 2,
      (start[2] + end[2]) / 2
    ),
    new THREE.Vector3(...end)
  );
  
  // Get points along the curve
  const points = curve.getPoints(20);
  
  // Get color based on node type
  const getConnectionColor = (type: string): string => {
    switch (type) {
      case "memory":
        return "#89b4fa";
      case "task":
        return "#f38ba8";
      case "milestone":
        return "#f9e2af";
      case "ritual":
        return "#a6e3a1";
      default:
        return "#89b4fa";
    }
  };
  
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[
            new Float32Array(points.flatMap(p => [p.x, p.y, p.z])),
            3
          ]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        attach="material"
        color={isHighlighted ? "#ffffff" : getConnectionColor(nodeType)}
        opacity={isHighlighted ? 0.8 : isStrong ? 0.5 : 0.2}
        transparent
        linewidth={isHighlighted ? 2 : isStrong ? 1.5 : 1}
      />
    </line>
  );
}

// Garden environment
function GardenEnvironment({ 
  season, 
  environmentType,
  timeOfDay,
  settings
}: { 
  season: string; 
  environmentType: string;
  timeOfDay: string;
  settings: {
    groundColor: string;
    fogColor: string;
    fogDensity: number;
    skyColor: string;
    lightIntensity: number;
  };
}) {
  const { scene } = useThree();
  
  // Set fog
  useEffect(() => {
    scene.fog = new THREE.FogExp2(settings.fogColor, settings.fogDensity);
    
    return () => {
      scene.fog = null;
    };
  }, [scene, settings.fogColor, settings.fogDensity]);
  
  return null;
}

// Garden elements based on environment type
function GardenElements({ 
  environmentType, 
  season,
  nodes
}: { 
  environmentType: string; 
  season: string;
  nodes: MemoryNode[];
}) {
  // This would be a more complex implementation with different 3D models
  // For now, we'll just add some simple elements based on environment type
  
  const elements: React.ReactNode[] = [];
  
  // Add trees
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const radius = 20;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    elements.push(
      <Tree 
        key={`tree-${i}`}
        position={[x, 0, z]}
        season={season}
        scale={0.5 + Math.random() * 1}
      />
    );
  }
  
  // Add environment-specific elements
  switch (environmentType) {
    case "forest":
      // Add more trees
      for (let i = 0; i < 10; i++) {
        const x = (Math.random() - 0.5) * 30;
        const z = (Math.random() - 0.5) * 30;
        
        elements.push(
          <Tree 
            key={`inner-tree-${i}`}
            position={[x, 0, z]}
            season={season}
            scale={0.3 + Math.random() * 0.7}
          />
        );
      }
      break;
    case "meadow":
      // Add flowers
      for (let i = 0; i < 50; i++) {
        const x = (Math.random() - 0.5) * 40;
        const z = (Math.random() - 0.5) * 40;
        
        elements.push(
          <Flower 
            key={`flower-${i}`}
            position={[x, 0, z]}
            season={season}
            scale={0.2 + Math.random() * 0.3}
          />
        );
      }
      break;
    case "beach":
      // Add water
      elements.push(
        <Water 
          key="water"
          position={[0, -0.5, -20]}
          scale={[40, 1, 20]}
        />
      );
      break;
    case "mountain":
      // Add rocks
      for (let i = 0; i < 15; i++) {
        const x = (Math.random() - 0.5) * 40;
        const z = (Math.random() - 0.5) * 40;
        
        elements.push(
          <Rock 
            key={`rock-${i}`}
            position={[x, 0, z]}
            scale={0.5 + Math.random() * 1.5}
          />
        );
      }
      break;
  }
  
  return <>{elements}</>;
}

// Simple tree component
function Tree({ 
  position, 
  season,
  scale = 1
}: { 
  position: [number, number, number]; 
  season: string;
  scale?: number;
}) {
  // Get tree colors based on season
  const getTrunkColor = () => "#8d6e63";
  
  const getLeavesColor = (season: string): string => {
    switch (season) {
      case "spring":
        return "#a5d6a7";
      case "summer":
        return "#66bb6a";
      case "autumn":
        return "#ffb74d";
      case "winter":
        return "#e0e0e0";
      default:
        return "#a5d6a7";
    }
  };
  
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Trunk */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.4, 4, 8]} />
        <meshStandardMaterial color={getTrunkColor()} />
      </mesh>
      
      {/* Leaves */}
      <mesh position={[0, 5, 0]} castShadow>
        <coneGeometry args={[2, 4, 8]} />
        <meshStandardMaterial color={getLeavesColor(season)} />
      </mesh>
    </group>
  );
}

// Simple flower component
function Flower({ 
  position, 
  season,
  scale = 1
}: { 
  position: [number, number, number]; 
  season: string;
  scale?: number;
}) {
  // Get flower colors based on season
  const getStemColor = () => "#7cb342";
  
  const getPetalColor = (season: string): string => {
    switch (season) {
      case "spring":
        return "#f48fb1";
      case "summer":
        return "#ffeb3b";
      case "autumn":
        return "#ff7043";
      case "winter":
        return "#b3e5fc";
      default:
        return "#f48fb1";
    }
  };
  
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Stem */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
        <meshStandardMaterial color={getStemColor()} />
      </mesh>
      
      {/* Petals */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color={getPetalColor(season)} />
      </mesh>
    </group>
  );
}

// Simple water component
function Water({ 
  position, 
  scale = [10, 1, 10]
}: { 
  position: [number, number, number]; 
  scale?: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Animate water
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Simple wave animation
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
  });
  
  return (
    <mesh 
      ref={meshRef}
      position={position} 
      scale={scale}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[1, 1, 32, 32]} />
      <meshStandardMaterial 
        color="#4fc3f7" 
        transparent 
        opacity={0.8}
        metalness={0.1}
        roughness={0.2}
      />
    </mesh>
  );
}

// Simple rock component
function Rock({ 
  position, 
  scale = 1
}: { 
  position: [number, number, number]; 
  scale?: number;
}) {
  // Random rotation for variety
  const rotation: [number, number, number] = [
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  ];
  
  // Random gray color
  const grayValue = 0.4 + Math.random() * 0.3;
  const color = new THREE.Color(grayValue, grayValue, grayValue);
  
  return (
    <group position={position} scale={[scale, scale, scale]} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}
