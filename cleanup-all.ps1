# PowerShell script to perform all frontend cleanup steps in one go

Write-Host "Starting comprehensive frontend cleanup process..." -ForegroundColor Green

# Step 1: Create backup of the current state
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "backup-$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item -Path "package.json" -Destination "$backupDir\package.json" -Force
Copy-Item -Path "src" -Destination "$backupDir\src" -Recurse -Force
Write-Host "Created backup in $backupDir" -ForegroundColor Cyan

# Step 2: Remove frontend files and directories
Write-Host "`nRemoving frontend files and directories..." -ForegroundColor Yellow

# List of frontend directories to remove
$frontendDirs = @(
    "src\components",
    "src\hooks",
    "src\providers",
    "src\routes",
    "src\styles"
)

# Keep only the Chat.tsx and Chat.css files
if (Test-Path "src\components\Chat.tsx") {
    $chatTsxContent = Get-Content "src\components\Chat.tsx" -Raw
    $chatCssContent = $null
    if (Test-Path "src\components\Chat.css") {
        $chatCssContent = Get-Content "src\components\Chat.css" -Raw
    }
}

# Remove frontend directories
foreach ($dir in $frontendDirs) {
    if (Test-Path $dir) {
        Write-Host "Removing directory: $dir"
        Remove-Item -Path $dir -Recurse -Force
    }
}

# Create minimal components directory with just Chat files
if ($chatTsxContent) {
    New-Item -ItemType Directory -Path "src\components" -Force | Out-Null
    Set-Content -Path "src\components\Chat.tsx" -Value $chatTsxContent
    if ($chatCssContent) {
        Set-Content -Path "src\components\Chat.css" -Value $chatCssContent
    }
    Write-Host "Preserved Chat.tsx and Chat.css for minimal testing interface"
}

# Remove frontend files
$frontendFiles = @(
    "src\app.tsx",
    "src\app-router.tsx",
    "src\client.tsx",
    "src\styles.css"
)

foreach ($file in $frontendFiles) {
    if (Test-Path $file) {
        Write-Host "Removing file: $file"
        Remove-Item -Path $file -Force
    }
}

# Step 3: Clean up package.json
Write-Host "`nRemoving frontend dependencies from package.json..." -ForegroundColor Yellow

# Read the current package.json
$packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json

# Frontend-specific dependencies to remove
$frontendDependencies = @(
    # React and React-related
    "react",
    "react-dom",
    "react-router-dom",
    "react-markdown",
    "@ai-sdk/react",
    
    # UI Components and styling
    "@phosphor-icons/react",
    "@radix-ui/react-avatar",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-slot",
    "@radix-ui/react-switch",
    "class-variance-authority",
    "clsx",
    "tailwind-merge",
    
    # 3D and visualization
    "@react-three/drei",
    "@react-three/fiber",
    "three",
    "d3",
    "@types/d3",
    "@types/three",
    
    # Markdown processing
    "marked",
    "remark-gfm",
    "@types/marked"
)

# Frontend-specific devDependencies to remove
$frontendDevDependencies = @(
    "@tailwindcss/vite",
    "@types/react",
    "@types/react-dom",
    "@vitejs/plugin-react",
    "tailwindcss"
)

# Create new dependencies object without frontend packages
$newDependencies = [PSCustomObject]@{}
foreach ($prop in $packageJson.dependencies.PSObject.Properties) {
    if ($frontendDependencies -notcontains $prop.Name) {
        $newDependencies | Add-Member -MemberType NoteProperty -Name $prop.Name -Value $prop.Value
    }
    else {
        Write-Host "Removing dependency: $($prop.Name)"
    }
}

# Create new devDependencies object without frontend packages
$newDevDependencies = [PSCustomObject]@{}
foreach ($prop in $packageJson.devDependencies.PSObject.Properties) {
    if ($frontendDevDependencies -notcontains $prop.Name) {
        $newDevDependencies | Add-Member -MemberType NoteProperty -Name $prop.Name -Value $prop.Value
    }
    else {
        Write-Host "Removing devDependency: $($prop.Name)"
    }
}

# Update the package.json object
$packageJson.dependencies = $newDependencies
$packageJson.devDependencies = $newDevDependencies

# Write the updated package.json
$packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path "package.json"

# Step 4: Update vite.config.ts to remove React plugin
Write-Host "`nUpdating vite.config.ts to remove React plugin..." -ForegroundColor Yellow

if (Test-Path "vite.config.ts") {
    $viteConfig = Get-Content -Path "vite.config.ts" -Raw
    
    # Remove React plugin import and usage
    $viteConfig = $viteConfig -replace "import react from '@vitejs/plugin-react';?`n?", ""
    $viteConfig = $viteConfig -replace "react\(\),?`n?", ""
    
    Set-Content -Path "vite.config.ts" -Value $viteConfig
    Write-Host "Updated vite.config.ts"
}

Write-Host "`nFrontend cleanup complete!" -ForegroundColor Green
Write-Host "To update your node_modules, run: npm install" -ForegroundColor Cyan
Write-Host "For more information, see FRONTEND-CLEANUP-README.md" -ForegroundColor Cyan
