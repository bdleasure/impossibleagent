# PowerShell script to remove remaining frontend-related packages from package.json

Write-Host "Starting cleanup of remaining frontend packages in package.json..."

# Read the current package.json
$packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json

# Create a backup of the current package.json
Copy-Item -Path "package.json" -Destination "package.json.remaining.bak"
Write-Host "Created backup of package.json as package.json.remaining.bak"

# Remaining frontend-specific dependencies to remove
$remainingFrontendDependencies = @(
    # Frontend-related type definitions
    "@types/d3",
    "@types/marked",
    "@types/three",
    
    # React-specific SDK
    "@ai-sdk/react"
)

# Create new dependencies object without remaining frontend packages
$newDependencies = [PSCustomObject]@{}
foreach ($prop in $packageJson.dependencies.PSObject.Properties) {
    if ($remainingFrontendDependencies -notcontains $prop.Name) {
        $newDependencies | Add-Member -MemberType NoteProperty -Name $prop.Name -Value $prop.Value
    }
    else {
        Write-Host "Removing dependency: $($prop.Name)"
    }
}

# Update the package.json object
$packageJson.dependencies = $newDependencies

# Write the updated package.json
$packageJson | ConvertTo-Json -Depth 10 | Set-Content -Path "package.json"

Write-Host "Remaining frontend packages have been removed from package.json"
Write-Host "To update your node_modules, run: npm install"
