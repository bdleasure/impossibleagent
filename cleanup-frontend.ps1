# cleanup-frontend.ps1
# This script removes all frontend components except for Chat.tsx and Chat.css
# It keeps only the necessary backend files for the application to function

Write-Host "Starting frontend cleanup process..." -ForegroundColor Green

# Create backup directory
$backupDir = "frontend-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -Path $backupDir -ItemType Directory -Force | Out-Null
Write-Host "Created backup directory: $backupDir" -ForegroundColor Cyan

# Function to backup a file before removing it
function Backup-File {
    param (
        [string]$FilePath
    )
    
    if (Test-Path $FilePath) {
        $relativePath = $FilePath.Replace("$PWD\", "").Replace("$PWD/", "")
        $backupPath = Join-Path $backupDir $relativePath
        $backupFolder = Split-Path $backupPath -Parent
        
        if (-not (Test-Path $backupFolder)) {
            New-Item -Path $backupFolder -ItemType Directory -Force | Out-Null
        }
        
        Copy-Item -Path $FilePath -Destination $backupPath -Force
        Write-Host "Backed up: $relativePath" -ForegroundColor DarkGray
    }
}

# Files to keep (these won't be removed)
$filesToKeep = @(
    "src/components/Chat.tsx",
    "src/components/Chat.css",
    "src/server.ts",
    "src/index.ts",
    "src/utils.ts",
    "src/tools.ts",
    "src/shared.ts",
    "src/agents/PersonalAgent.ts",
    "src/agents/MemoryFix.ts",
    "src/memory/MemoryManager.ts",
    "src/memory/EmbeddingManager.ts",
    "src/memory/TemporalContextManager.ts",
    "src/memory/RelevanceRanking.ts",
    "src/memory/LearningEnhancedMemoryRetrieval.ts",
    "src/knowledge/KnowledgeBase.ts",
    "src/knowledge/KnowledgeExtractor.ts",
    "src/knowledge/KnowledgeGraph.ts",
    "src/knowledge/LearningSystem.ts",
    "src/knowledge/graph/types.ts",
    "src/security/SecurityManager.ts",
    "src/tools/BaseMCPAdapter.ts",
    "src/tools/ToolDiscoveryManager.ts",
    "src/tools/ToolSuggestionSystem.ts",
    "src/tools/ToolUsageTracker.ts"
)

# Directories to remove completely
$dirsToRemove = @(
    "src/components/avatar",
    "src/components/button",
    "src/components/card",
    "src/components/companion-avatar",
    "src/components/dropdown",
    "src/components/feedback",
    "src/components/input",
    "src/components/label",
    "src/components/lifeline",
    "src/components/loader",
    "src/components/memory",
    "src/components/memory-garden",
    "src/components/memory-visualization",
    "src/components/menu-bar",
    "src/components/modal",
    "src/components/orbit-site",
    "src/components/proactive-check-in",
    "src/components/ritual-moments",
    "src/components/select",
    "src/components/showcase",
    "src/components/slot",
    "src/components/textarea",
    "src/components/toggle",
    "src/components/tool-invocation-card",
    "src/components/tooltip",
    "src/components/voice-interaction",
    "src/hooks",
    "src/providers",
    "src/routes",
    "src/styles"
)

# Files to remove
$filesToRemove = @(
    "src/app-router.tsx",
    "src/app.tsx",
    "src/client.tsx",
    "src/simple-chat.css",
    "src/styles.css"
)

# Backup and remove directories
foreach ($dir in $dirsToRemove) {
    if (Test-Path $dir) {
        # Backup the directory
        Get-ChildItem -Path $dir -Recurse -File | ForEach-Object {
            Backup-File -FilePath $_.FullName
        }
        
        # Remove the directory
        Remove-Item -Path $dir -Recurse -Force
        Write-Host "Removed directory: $dir" -ForegroundColor Yellow
    }
}

# Backup and remove files
foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        Backup-File -FilePath $file
        Remove-Item -Path $file -Force
        Write-Host "Removed file: $file" -ForegroundColor Yellow
    }
}

# Create a minimal app.tsx file that just imports and renders the Chat component
$minimalAppContent = @"
import React from 'react';
import { Chat } from './components/Chat';
import './components/Chat.css';

export function App() {
  return (
    <div className="app-container">
      <Chat />
    </div>
  );
}
"@

Write-Host "Creating minimal app.tsx file..." -ForegroundColor Cyan
Set-Content -Path "src/app.tsx" -Value $minimalAppContent

# Create a minimal client.tsx file that just renders the App component
$minimalClientContent = @"
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
"@

Write-Host "Creating minimal client.tsx file..." -ForegroundColor Cyan
Set-Content -Path "src/client.tsx" -Value $minimalClientContent

# Create a minimal styles.css file
$minimalStylesContent = @"
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
}
"@

Write-Host "Creating minimal styles.css file..." -ForegroundColor Cyan
Set-Content -Path "src/styles.css" -Value $minimalStylesContent

# Update the index.html file to remove unnecessary scripts and styles
if (Test-Path "index.html") {
    Backup-File -FilePath "index.html"
    
    $indexHtml = Get-Content -Path "index.html" -Raw
    $updatedIndexHtml = $indexHtml -replace '<!-- Additional scripts and styles -->(.*?)<!-- End additional scripts and styles -->', '<!-- Simplified for backend-only version -->'
    
    Set-Content -Path "index.html" -Value $updatedIndexHtml
    Write-Host "Updated index.html to remove unnecessary scripts and styles" -ForegroundColor Cyan
}

Write-Host "Frontend cleanup completed successfully!" -ForegroundColor Green
Write-Host "Backup of removed files is available in: $backupDir" -ForegroundColor Green
Write-Host "The application now uses only the Chat component for the frontend." -ForegroundColor Green
