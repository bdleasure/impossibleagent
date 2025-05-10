import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";

// Import routes
import { 
  MemoryGardenRoute, 
  RitualMomentsRoute, 
  VoiceInteractionRoute,
  ShowcaseRoute,
  LifelineRoute,
  CompanionAvatarRoute,
  ProactiveCheckInRoute
} from "@/routes";
import Chat from "./app";

/**
 * AppRouter
 * 
 * Main router component that sets up routes for the application.
 */
// Simple wrapper component for routes
function RouteWithNavigation({ element }: { element: React.ReactNode }) {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if there's an initialPath set by the server
    const initialPath = (window as any).initialPath;
    if (initialPath && initialPath !== window.location.pathname) {
      console.log(`Navigating to initialPath: ${initialPath}`);
      navigate(initialPath);
    }
  }, [navigate]);
  
  return <>{element}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route - now points to Chat */}
        <Route path="/" element={
          <RouteWithNavigation element={<Chat />} />
        } />
        
        {/* Component showcase */}
        <Route path="/showcase" element={
          <RouteWithNavigation element={<ShowcaseRoute />} />
        } />
        
        {/* Component demo routes */}
        <Route path="/memory-garden" element={
          <RouteWithNavigation element={<MemoryGardenRoute />} />
        } />
        <Route path="/ritual-moments" element={
          <RouteWithNavigation element={<RitualMomentsRoute />} />
        } />
        <Route path="/voice-interaction" element={
          <RouteWithNavigation element={<VoiceInteractionRoute />} />
        } />
        <Route path="/lifeline" element={
          <RouteWithNavigation element={<LifelineRoute />} />
        } />
        <Route path="/companion-avatar" element={
          <RouteWithNavigation element={<CompanionAvatarRoute />} />
        } />
        <Route path="/proactive-check-in" element={
          <RouteWithNavigation element={<ProactiveCheckInRoute />} />
        } />
        
        {/* Chat application */}
        <Route path="/chat" element={
          <RouteWithNavigation element={<Chat />} />
        } />
        
        {/* Fallback route - render the requested route or show 404 */}
        <Route path="*" element={
          <RouteWithNavigation element={<div className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
            <p className="mb-4">The page you're looking for doesn't exist.</p>
            <button 
              onClick={() => window.location.href = '/showcase'}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Go to Showcase
            </button>
          </div>} />
        } />
      </Routes>
    </BrowserRouter>
  );
}
