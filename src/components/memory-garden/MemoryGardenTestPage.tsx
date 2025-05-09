import React from "react";
import { MemoryGardenShowcase } from "./MemoryGardenShowcase";

/**
 * Memory Garden Test Page
 * 
 * A simple page that demonstrates the Memory Garden components.
 * This page can be used to test the components and see them in action.
 */
export function MemoryGardenTestPage() {
  return (
    <div className="memory-garden-test-page">
      <header className="test-page-header">
        <h1>Memory Garden Components</h1>
        <p className="test-page-description">
          This page demonstrates the Memory Garden components, including both 3D and Lite versions,
          as well as the responsive container that can switch between them.
        </p>
      </header>
      
      <main className="test-page-content">
        <MemoryGardenShowcase />
      </main>
      
      <footer className="test-page-footer">
        <p>
          Memory Garden is part of the ImpossibleAgent project, designed to create an emotionally engaging
          experience for users. The garden metaphor represents the growth and nurturing of memories and tasks
          over time, creating a visual narrative of the user's journey.
        </p>
        <p>
          <strong>Implementation:</strong> The 3D version uses Three.js for immersive visualization,
          while the Lite version uses SVG and Canvas for optimal performance on mobile devices.
          The responsive container automatically selects the appropriate version based on device capabilities.
        </p>
      </footer>
    </div>
  );
}
