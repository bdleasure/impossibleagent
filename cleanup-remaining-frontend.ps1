# PowerShell script to clean up remaining frontend files

# Define files to remove (frontend-specific files)
$filesToRemove = @(
    "src/app-router.tsx",
    "src/app.tsx",
    "src/client.tsx",
    "src/simple-chat.css",
    "src/styles.css",
    "index.html",
    "vite.config.ts"
)

# Remove frontend-specific files
foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        Write-Host "Removing file: $file"
        Remove-Item $file -Force
    } else {
        Write-Host "File not found: $file (skipping)"
    }
}

Write-Host "Cleanup complete. Remaining frontend files have been removed."
