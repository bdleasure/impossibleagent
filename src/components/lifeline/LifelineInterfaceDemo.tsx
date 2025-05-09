import React from 'react';
import { LifelineInterface } from './LifelineInterface';

/**
 * LifelineInterfaceDemo Component
 * 
 * Demo component for showcasing the Lifeline Interface with descriptive information.
 */
export const LifelineInterfaceDemo: React.FC = () => {
  return (
    <div className="demo-container">
      <div className="demo-header">
        <h1>Lifeline Interface Demo</h1>
        <p className="demo-description">
          The Lifeline Interface provides a narrative timeline that connects tasks, memories, and milestones 
          in a meaningful story. It uses D3.js for visualization with interactive nodes and contextual zooming.
        </p>
      </div>
      
      <div className="demo-features">
        <h2>Key Features</h2>
        <ul>
          <li>
            <strong>Narrative Timeline:</strong> Visualizes past, present, and future events in a continuous narrative
          </li>
          <li>
            <strong>Multiple View Modes:</strong> Chronological, Narrative, Emotional, and Milestone views
          </li>
          <li>
            <strong>Interactive Nodes:</strong> Different node types for memories, tasks, milestones, and rituals
          </li>
          <li>
            <strong>Contextual Zooming:</strong> Different levels of detail based on zoom level
          </li>
          <li>
            <strong>Detail Panel:</strong> Shows detailed information about selected items
          </li>
        </ul>
      </div>
      
      <div className="demo-component">
        <LifelineInterface />
      </div>
      
      <div className="demo-instructions">
        <h2>How to Use</h2>
        <ol>
          <li>Click on different view mode buttons to change the timeline perspective</li>
          <li>Use the zoom controls to adjust the level of detail</li>
          <li>Click on timeline nodes to view detailed information in the detail panel</li>
          <li>Hover over nodes to see a preview of the content</li>
        </ol>
      </div>
      
      <div className="demo-footer">
        <a href="/showcase" className="demo-back-button">Back to Showcase</a>
      </div>
    </div>
  );
};

export default LifelineInterfaceDemo;
