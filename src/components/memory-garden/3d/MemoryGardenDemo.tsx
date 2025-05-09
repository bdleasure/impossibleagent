import React, { useState } from "react";
import { MemoryGarden } from "./MemoryGarden";
import type { MemoryNode } from "./MemoryGarden";

/**
 * Memory Garden Demo Component (3D)
 * 
 * A demonstration component for the 3D Memory Garden with sample data
 * and controls to showcase its features and capabilities.
 */
export function MemoryGardenDemo() {
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

  // State
  const [memories, setMemories] = useState<MemoryNode[]>(sampleMemories);
  const [selectedMemory, setSelectedMemory] = useState<MemoryNode | null>(null);
  const [season, setSeason] = useState<"spring" | "summer" | "autumn" | "winter">("spring");
  const [environmentType, setEnvironmentType] = useState<"forest" | "meadow" | "beach" | "mountain">("forest");
  const [timeOfDay, setTimeOfDay] = useState<"dawn" | "day" | "dusk" | "night">("day");
  const [height, setHeight] = useState<number>(600);

  // Handle memory selection
  const handleMemorySelect = (memory: MemoryNode) => {
    setSelectedMemory(memory);
    console.log("Selected memory:", memory);
  };

  // Handle season change
  const handleSeasonChange = (newSeason: "spring" | "summer" | "autumn" | "winter") => {
    setSeason(newSeason);
  };

  // Handle environment type change
  const handleEnvironmentTypeChange = (newType: "forest" | "meadow" | "beach" | "mountain") => {
    setEnvironmentType(newType);
  };

  // Handle time of day change
  const handleTimeOfDayChange = (newTime: "dawn" | "day" | "dusk" | "night") => {
    setTimeOfDay(newTime);
  };

  // Handle height change
  const handleHeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHeight(parseInt(event.target.value, 10));
  };

  return (
    <div className="memory-garden-demo">
      <h2 className="text-2xl font-bold mb-6">Memory Garden (3D)</h2>
      
      <div className="demo-controls grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Demo Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block mb-2">Season</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="season" 
                    value="spring" 
                    checked={season === "spring"} 
                    onChange={() => handleSeasonChange("spring")}
                    className="mr-1"
                  />
                  Spring
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="season" 
                    value="summer" 
                    checked={season === "summer"} 
                    onChange={() => handleSeasonChange("summer")}
                    className="mr-1"
                  />
                  Summer
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="season" 
                    value="autumn" 
                    checked={season === "autumn"} 
                    onChange={() => handleSeasonChange("autumn")}
                    className="mr-1"
                  />
                  Autumn
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="season" 
                    value="winter" 
                    checked={season === "winter"} 
                    onChange={() => handleSeasonChange("winter")}
                    className="mr-1"
                  />
                  Winter
                </label>
              </div>
            </div>
            
            <div>
              <label className="block mb-2">Environment Type</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="environmentType" 
                    value="forest" 
                    checked={environmentType === "forest"} 
                    onChange={() => handleEnvironmentTypeChange("forest")}
                    className="mr-1"
                  />
                  Forest
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="environmentType" 
                    value="meadow" 
                    checked={environmentType === "meadow"} 
                    onChange={() => handleEnvironmentTypeChange("meadow")}
                    className="mr-1"
                  />
                  Meadow
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="environmentType" 
                    value="beach" 
                    checked={environmentType === "beach"} 
                    onChange={() => handleEnvironmentTypeChange("beach")}
                    className="mr-1"
                  />
                  Beach
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="environmentType" 
                    value="mountain" 
                    checked={environmentType === "mountain"} 
                    onChange={() => handleEnvironmentTypeChange("mountain")}
                    className="mr-1"
                  />
                  Mountain
                </label>
              </div>
            </div>
            
            <div>
              <label className="block mb-2">Time of Day</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="timeOfDay" 
                    value="dawn" 
                    checked={timeOfDay === "dawn"} 
                    onChange={() => handleTimeOfDayChange("dawn")}
                    className="mr-1"
                  />
                  Dawn
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="timeOfDay" 
                    value="day" 
                    checked={timeOfDay === "day"} 
                    onChange={() => handleTimeOfDayChange("day")}
                    className="mr-1"
                  />
                  Day
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="timeOfDay" 
                    value="dusk" 
                    checked={timeOfDay === "dusk"} 
                    onChange={() => handleTimeOfDayChange("dusk")}
                    className="mr-1"
                  />
                  Dusk
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="timeOfDay" 
                    value="night" 
                    checked={timeOfDay === "night"} 
                    onChange={() => handleTimeOfDayChange("night")}
                    className="mr-1"
                  />
                  Night
                </label>
              </div>
            </div>
            
            <div>
              <label className="block mb-2">Garden Height</label>
              <input 
                type="range" 
                min="300" 
                max="800" 
                step="50" 
                value={height} 
                onChange={handleHeightChange}
                className="w-full"
              />
              <div className="text-sm text-gray-500 mt-1">{height}px</div>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-3">Selected Memory</h3>
          
          {selectedMemory ? (
            <div className="space-y-2">
              <div>
                <span className="font-medium">Title:</span> {selectedMemory.title}
              </div>
              <div>
                <span className="font-medium">Type:</span> {selectedMemory.type}
              </div>
              <div>
                <span className="font-medium">Date:</span> {selectedMemory.date}
              </div>
              <div>
                <span className="font-medium">Importance:</span> {selectedMemory.importance}/10
              </div>
              <div>
                <span className="font-medium">Description:</span> {selectedMemory.description}
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No memory selected. Click on a node in the garden.</div>
          )}
        </div>
      </div>
      
      <MemoryGarden 
        memories={memories}
        onMemorySelect={handleMemorySelect}
        season={season}
        environmentType={environmentType}
        timeOfDay={timeOfDay}
        height={height}
      />
      
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">About Memory Garden (3D)</h3>
        <p className="mb-2">
          Memory Garden (3D) is an immersive Three.js-based visualization of memories and tasks.
          It provides an intuitive way to explore and interact with your memories and tasks in a 3D environment.
        </p>
        <p>
          Features include organic growth algorithms, 3D models, immersive navigation,
          visual connections between related memories, and special effects for important memories.
        </p>
      </div>
    </div>
  );
}
