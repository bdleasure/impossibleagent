import React, { useState } from "react";
import { MemoryGardenDemo } from "./3d/MemoryGardenDemo";
import { MemoryGardenLiteDemo } from "./lite/MemoryGardenLiteDemo";
import { MemoryGardenContainer } from "./MemoryGardenContainer";
import type { MemoryNode } from "./3d/MemoryGarden";

/**
 * Memory Garden Showcase
 * 
 * A showcase component that displays both the 3D and Lite versions of the Memory Garden,
 * as well as the responsive container that can switch between them.
 */
export function MemoryGardenShowcase() {
  // Sample memory data
  const sampleMemories: MemoryNode[] = [
    {
      id: "memory-1",
      type: "memory",
      title: "First Conversation",
      description: "Our first meaningful conversation about life goals and aspirations.",
      date: "2025-01-15",
      tags: ["conversation", "goals", "milestone"],
      importance: 8,
      connections: ["memory-2", "memory-4"]
    },
    {
      id: "memory-2",
      type: "task",
      title: "Create Project Plan",
      description: "Develop a comprehensive project plan for the new initiative.",
      date: "2025-02-01",
      tags: ["project", "planning", "work"],
      importance: 6,
      connections: ["memory-3"]
    },
    {
      id: "memory-3",
      type: "milestone",
      title: "Project Launch",
      description: "Successfully launched the new project with positive feedback.",
      date: "2025-03-10",
      tags: ["project", "achievement", "milestone"],
      importance: 9,
      connections: ["memory-5"]
    },
    {
      id: "memory-4",
      type: "memory",
      title: "Family Reunion",
      description: "Annual family reunion at the lake house with extended family.",
      date: "2025-04-05",
      tags: ["family", "personal", "annual"],
      importance: 7,
      connections: ["memory-6"]
    },
    {
      id: "memory-5",
      type: "task",
      title: "Learn New Skill",
      description: "Begin learning a new programming language for upcoming projects.",
      date: "2025-04-20",
      tags: ["learning", "skill", "professional development"],
      importance: 5,
      connections: []
    },
    {
      id: "memory-6",
      type: "ritual",
      title: "Morning Reflection",
      description: "Daily morning reflection and journaling practice.",
      date: "2025-05-01",
      tags: ["ritual", "reflection", "daily"],
      importance: 6,
      connections: ["memory-7"]
    },
    {
      id: "memory-7",
      type: "memory",
      title: "Breakthrough Insight",
      description: "Had a significant breakthrough insight about the project architecture.",
      date: "2025-05-08",
      tags: ["insight", "project", "breakthrough"],
      importance: 8,
      connections: []
    }
  ];

  // State for selected memory
  const [selectedMemory, setSelectedMemory] = useState<MemoryNode | null>(null);
  
  // State for season
  const [season, setSeason] = useState<"spring" | "summer" | "autumn" | "winter">("spring");
  
  // State for environment type
  const [environmentType, setEnvironmentType] = useState<"forest" | "meadow" | "beach" | "mountain">("forest");
  
  // State for time of day
  const [timeOfDay, setTimeOfDay] = useState<"dawn" | "day" | "dusk" | "night">("day");
  
  // State for height
  const [height, setHeight] = useState<number>(400);

  // Handle memory selection
  const handleMemorySelect = (memory: MemoryNode) => {
    setSelectedMemory(memory);
  };

  return (
    <div className="memory-garden-showcase">
      <h1 className="text-3xl font-bold mb-8 text-center">Memory Garden Showcase</h1>
      
      <div className="showcase-controls p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Garden Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block mb-2 font-medium">Season</label>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="season" 
                  value="spring" 
                  checked={season === "spring"} 
                  onChange={() => setSeason("spring")}
                  className="mr-1"
                />
                Spring
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="season" 
                  value="summer" 
                  checked={season === "summer"} 
                  onChange={() => setSeason("summer")}
                  className="mr-1"
                />
                Summer
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="season" 
                  value="autumn" 
                  checked={season === "autumn"} 
                  onChange={() => setSeason("autumn")}
                  className="mr-1"
                />
                Autumn
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="season" 
                  value="winter" 
                  checked={season === "winter"} 
                  onChange={() => setSeason("winter")}
                  className="mr-1"
                />
                Winter
              </label>
            </div>
          </div>
          
          <div>
            <label className="block mb-2 font-medium">Environment Type</label>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="environmentType" 
                  value="forest" 
                  checked={environmentType === "forest"} 
                  onChange={() => setEnvironmentType("forest")}
                  className="mr-1"
                />
                Forest
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="environmentType" 
                  value="meadow" 
                  checked={environmentType === "meadow"} 
                  onChange={() => setEnvironmentType("meadow")}
                  className="mr-1"
                />
                Meadow
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="environmentType" 
                  value="beach" 
                  checked={environmentType === "beach"} 
                  onChange={() => setEnvironmentType("beach")}
                  className="mr-1"
                />
                Beach
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="environmentType" 
                  value="mountain" 
                  checked={environmentType === "mountain"} 
                  onChange={() => setEnvironmentType("mountain")}
                  className="mr-1"
                />
                Mountain
              </label>
            </div>
          </div>
          
          <div>
            <label className="block mb-2 font-medium">Time of Day</label>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="timeOfDay" 
                  value="dawn" 
                  checked={timeOfDay === "dawn"} 
                  onChange={() => setTimeOfDay("dawn")}
                  className="mr-1"
                />
                Dawn
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="timeOfDay" 
                  value="day" 
                  checked={timeOfDay === "day"} 
                  onChange={() => setTimeOfDay("day")}
                  className="mr-1"
                />
                Day
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="timeOfDay" 
                  value="dusk" 
                  checked={timeOfDay === "dusk"} 
                  onChange={() => setTimeOfDay("dusk")}
                  className="mr-1"
                />
                Dusk
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  name="timeOfDay" 
                  value="night" 
                  checked={timeOfDay === "night"} 
                  onChange={() => setTimeOfDay("night")}
                  className="mr-1"
                />
                Night
              </label>
            </div>
          </div>
          
          <div>
            <label className="block mb-2 font-medium">Garden Height</label>
            <input 
              type="range" 
              min="300" 
              max="600" 
              step="50" 
              value={height} 
              onChange={(e) => setHeight(parseInt(e.target.value, 10))}
              className="w-full"
            />
            <div className="text-sm text-gray-500 mt-1">{height}px</div>
          </div>
        </div>
      </div>
      
      <div className="showcase-selected-memory p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Selected Memory</h2>
        
        {selectedMemory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-medium mb-2">{selectedMemory.title}</h3>
              <p className="mb-2">{selectedMemory.description}</p>
              <p className="text-sm text-gray-500">Date: {selectedMemory.date}</p>
            </div>
            <div>
              <p className="mb-1"><span className="font-medium">Type:</span> {selectedMemory.type}</p>
              <p className="mb-1"><span className="font-medium">Importance:</span> {selectedMemory.importance}/10</p>
              <p className="mb-1">
                <span className="font-medium">Tags:</span> {selectedMemory.tags.join(", ")}
              </p>
              <p>
                <span className="font-medium">Connections:</span> {selectedMemory.connections.length} 
                {selectedMemory.connections.length > 0 ? ` (${selectedMemory.connections.join(", ")})` : ""}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No memory selected. Click on a node in any of the gardens below.</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div>
          <h2 className="text-2xl font-bold mb-4">Memory Garden (3D)</h2>
          <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg">
            <div className="p-4 bg-gray-100 dark:bg-gray-800">
              <p className="text-sm">
                Full 3D visualization with immersive environment, lighting effects, and organic growth algorithms.
                Best for desktop and high-performance devices.
              </p>
            </div>
            <div className="memory-garden-demo-container">
              <MemoryGardenDemo />
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold mb-4">Memory Garden Lite (2D)</h2>
          <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg">
            <div className="p-4 bg-gray-100 dark:bg-gray-800">
              <p className="text-sm">
                Lightweight 2D visualization using SVG and Canvas. Optimized for mobile devices
                and browsers without WebGL support.
              </p>
            </div>
            <div className="memory-garden-demo-container">
              <MemoryGardenLiteDemo />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Responsive Memory Garden Container</h2>
        <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-lg">
          <div className="p-4 bg-gray-100 dark:bg-gray-800">
            <p className="mb-2">
              This container automatically selects the appropriate version (3D or Lite) based on:
            </p>
            <ul className="list-disc list-inside text-sm ml-4 space-y-1">
              <li>Device capabilities (WebGL support)</li>
              <li>Device performance (hardware concurrency, memory)</li>
              <li>User preferences (saved in localStorage)</li>
            </ul>
            <p className="mt-2 text-sm">
              Users can manually toggle between versions using the button in the corner.
            </p>
          </div>
          <div className="p-6">
            <MemoryGardenContainer 
              memories={sampleMemories}
              onMemorySelect={handleMemorySelect}
              season={season}
              environmentType={environmentType}
              timeOfDay={timeOfDay}
              height={height}
            />
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Implementation Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-3">3D Version</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Built with Three.js for immersive 3D visualization</li>
              <li>Features organic growth algorithms for natural-looking memory nodes</li>
              <li>Includes dynamic lighting based on time of day</li>
              <li>Supports different environments (forest, meadow, beach, mountain)</li>
              <li>Seasonal variations affect colors, lighting, and particle effects</li>
              <li>Interactive camera controls for exploring the garden</li>
              <li>Visual connections between related memories</li>
              <li>Special effects for important memories</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-3">Lite Version</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Built with SVG and Canvas for optimal performance</li>
              <li>Simplified visualization optimized for mobile devices</li>
              <li>Maintains core metaphor of garden with seasonal themes</li>
              <li>Uses CSS animations for subtle movement effects</li>
              <li>Responsive design adapts to different screen sizes</li>
              <li>Maintains accessibility with keyboard navigation</li>
              <li>Reduced memory and CPU usage</li>
              <li>Works in browsers without WebGL support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
