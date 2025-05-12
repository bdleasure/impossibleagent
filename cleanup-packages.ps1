# PowerShell script to remove frontend-related packages from package.json

Write-Host "Starting cleanup of frontend packages in package.json..."

# Read the current package.json
$packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json

# Create a backup of the original package.json
Copy-Item -Path "package.json" -Destination "package.json.bak"
Write-Host "Created backup of package.json as package.json.bak"

# Frontend-specific dependencies to remove
$frontendDependencies = @(
    # React and React-related
    "react",
    "react-dom",
    "react-router-dom",
    "react-markdown",
    
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
    
    # Markdown processing
    "marked",
    "remark-gfm"
)

# Frontend-specific devDependencies to remove
$frontendDevDependencies = @(
    "@tailwindcss/vite",
    "@types/react",
    "@types/react-dom",
    "@types/d3",
    "@types/marked",
    "@types/three",
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

Write-Host "Frontend packages have been removed from package.json"
Write-Host "To update your node_modules, run: npm install"
Write-Host "Note: This only updates package.json. To completely remove the packages from node_modules, run npm install after this script."
