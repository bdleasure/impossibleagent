import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/card/Card";
import { Button } from "@/components/button/Button";

/**
 * ComponentShowcase
 * 
 * A showcase page that displays links to all available component demos.
 */
export function ComponentShowcase() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme === "light" ? "dark" : "light");
  };

  return (
    <div className="component-showcase" data-theme={theme}>
      <div className="showcase-header">
        <h1>ImpossibleAgent Component Showcase</h1>
        <Button onClick={toggleTheme}>
          {theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        </Button>
      </div>

      <div className="showcase-description">
        <p>
          This showcase demonstrates the various UI components developed for the ImpossibleAgent project.
          Click on any component card to view its demo.
        </p>
      </div>

      <div className="showcase-grid">
        <Card className="showcase-card">
          <h2>Chat Application</h2>
          <p>
            The main chat interface for interacting with the ImpossibleAgent.
            Try asking questions or using the available tools.
          </p>
          <Link to="/chat">
            <Button>Open Chat</Button>
          </Link>
        </Card>

        <Card className="showcase-card">
          <h2>Memory Garden</h2>
          <p>
            A visualization of memories and tasks in an organic, garden-like environment.
            Available in both 3D and 2D (Lite) versions.
          </p>
          <Link to="/memory-garden">
            <Button>View Demo</Button>
          </Link>
        </Card>

        <Card className="showcase-card">
          <h2>Voice Interaction</h2>
          <p>
            A comprehensive voice interaction system with speech recognition and synthesis,
            real-time audio visualization, and suggested voice commands.
          </p>
          <Link to="/voice-interaction">
            <Button>View Demo</Button>
          </Link>
        </Card>

        <Card className="showcase-card">
          <h2>Ritual Moments</h2>
          <p>
            Immersive, themed environments for meaningful interactions like daily check-ins,
            weekly reviews, milestone celebrations, and anniversaries.
          </p>
          <Link to="/ritual-moments">
            <Button>View Demo</Button>
          </Link>
        </Card>

        <Card className="showcase-card">
          <h2>Lifeline Interface</h2>
          <p>
            A dynamic, narrative timeline visualization for tasks, memories, and milestones
            with multiple view modes and interactive features.
          </p>
          <Link to="/lifeline">
            <Button>View Demo</Button>
          </Link>
        </Card>

        <Card className="showcase-card">
          <h2>Companion Avatar</h2>
          <p>
            A reactive, mood-based avatar that provides visual feedback and emotional
            connection during interactions with the agent.
          </p>
          <Link to="/companion-avatar">
            <Button>View Demo</Button>
          </Link>
        </Card>

        <Card className="showcase-card">
          <h2>Proactive Check-In</h2>
          <p>
            A system for AI-initiated emotional engagement with configurable frequency
            and triggers for different types of check-ins.
          </p>
          <Link to="/proactive-check-in">
            <Button>View Demo</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
