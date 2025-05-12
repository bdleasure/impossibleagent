# PowerShell script to clean up node_modules and reinstall dependencies

Write-Host "Starting node_modules cleanup process..." -ForegroundColor Green

# Step 1: Remove node_modules directory
Write-Host "Removing node_modules directory..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Path "node_modules" -Recurse -Force
    Write-Host "node_modules directory removed" -ForegroundColor Cyan
} else {
    Write-Host "node_modules directory not found" -ForegroundColor Cyan
}

# Step 2: Remove package-lock.json
Write-Host "Removing package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item -Path "package-lock.json" -Force
    Write-Host "package-lock.json removed" -ForegroundColor Cyan
} else {
    Write-Host "package-lock.json not found" -ForegroundColor Cyan
}

# Step 3: Clear npm cache
Write-Host "Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "npm cache cleared" -ForegroundColor Cyan

# Step 4: Reinstall dependencies
Write-Host "Reinstalling dependencies..." -ForegroundColor Yellow
npm install
Write-Host "Dependencies reinstalled" -ForegroundColor Cyan

# Step 5: List installed packages
Write-Host "`nInstalled packages:" -ForegroundColor Green
npm list --depth=0

Write-Host "`nNode modules cleanup and reinstallation complete!" -ForegroundColor Green
Write-Host "Your project now has only the necessary dependencies installed." -ForegroundColor Cyan
