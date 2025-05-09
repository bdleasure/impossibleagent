import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route redirects to the showcase */}
        <Route path="/" element={<Navigate to="/showcase" replace />} />
        
        {/* Component showcase */}
        <Route path="/showcase" element={<ShowcaseRoute />} />
        
        {/* Component demo routes */}
        <Route path="/memory-garden" element={<MemoryGardenRoute />} />
        <Route path="/ritual-moments" element={<RitualMomentsRoute />} />
        <Route path="/voice-interaction" element={<VoiceInteractionRoute />} />
        <Route path="/lifeline" element={<LifelineRoute />} />
        <Route path="/companion-avatar" element={<CompanionAvatarRoute />} />
        <Route path="/proactive-check-in" element={<ProactiveCheckInRoute />} />
        
        {/* Chat application */}
        <Route path="/chat" element={<Chat />} />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/showcase" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
