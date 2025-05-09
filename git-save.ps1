# Script to add, commit, and push all changes to GitHub
# Usage: .\git-save.ps1 [--fix-blocked-push]
# The script will prompt you to enter a commit message
#
# Additional functionality:
# - Checks for sensitive files being tracked by Git
# - Offers to remove sensitive files from Git tracking
# - Provides options to fix blocked pushes due to secrets
#
# Parameters:
#   --fix-blocked-push: Run in fix mode to help remove secrets from commits

# Function to help fix a blocked push by removing secrets from commits
function Fix-BlockedPush {
    Write-Host "=== FIX BLOCKED PUSH MODE ===" -ForegroundColor Magenta
    Write-Host "This mode will help you remove secrets from commits that are blocking your push." -ForegroundColor Cyan
    Write-Host ""
    
    # Ask if the secret was introduced in the latest commit or an earlier commit
    Write-Host "Was the secret introduced in:" -ForegroundColor Yellow
    Write-Host "  1. The latest commit only"
    Write-Host "  2. An earlier commit in the branch"
    $option = Read-Host "Enter option (1 or 2)"
    
    if ($option -eq "1") {
        # Fix for latest commit
        Write-Host "`nFIXING SECRET IN LATEST COMMIT" -ForegroundColor Cyan
        Write-Host "Follow these steps:" -ForegroundColor Yellow
        Write-Host "1. Edit the file(s) to remove the secret"
        Write-Host "2. Save the file(s)"
        Write-Host "3. Press Enter when ready to continue"
        Read-Host "Press Enter when you've removed the secret"
        
        # Amend the commit
        Write-Host "`nAmending the commit..." -ForegroundColor Cyan
        git add .
        git commit --amend --no-edit
        
        # Try to push
        Write-Host "`nPushing changes..." -ForegroundColor Cyan
        git push
        
        Write-Host "`nIf the push was successful, the secret has been removed." -ForegroundColor Green
        Write-Host "If the push was still blocked, you may need to use option 2 or contact your repository administrator." -ForegroundColor Yellow
    }
    elseif ($option -eq "2") {
        # Fix for earlier commit
        Write-Host "`nFIXING SECRET IN EARLIER COMMIT" -ForegroundColor Cyan
        Write-Host "You'll need to identify which commit first introduced the secret." -ForegroundColor Yellow
        
        # Show git log
        Write-Host "`nShowing git log to help identify the commit:" -ForegroundColor Cyan
        git log --oneline -10
        
        Write-Host "`nFrom the error message when your push was blocked, identify the earliest commit that contains the secret." -ForegroundColor Yellow
        $commitId = Read-Host "Enter the commit ID (e.g., 8728dbe)"
        
        if ([string]::IsNullOrWhiteSpace($commitId)) {
            Write-Host "No commit ID provided. Operation cancelled." -ForegroundColor Red
            return
        }
        
        # Start interactive rebase
        Write-Host "`nStarting interactive rebase to edit commit $commitId..." -ForegroundColor Cyan
        Write-Host "In the editor that opens:" -ForegroundColor Yellow
        Write-Host "1. Change 'pick' to 'edit' for the commit $commitId"
        Write-Host "2. Save and close the editor"
        
        # Pause to let user read instructions
        Read-Host "Press Enter to continue"
        
        # Execute the rebase command
        git rebase -i "${commitId}~1"
        
        Write-Host "`nNow:" -ForegroundColor Yellow
        Write-Host "1. Edit the file(s) to remove the secret"
        Write-Host "2. Save the file(s)"
        Write-Host "3. Press Enter when ready to continue"
        Read-Host "Press Enter when you've removed the secret"
        
        # Amend the commit and continue rebase
        Write-Host "`nAmending the commit and continuing rebase..." -ForegroundColor Cyan
        git add .
        git commit --amend --no-edit
        git rebase --continue
        
        # Try to push
        Write-Host "`nPushing changes..." -ForegroundColor Cyan
        git push --force
        
        Write-Host "`nIf the push was successful, the secret has been removed." -ForegroundColor Green
        Write-Host "If the push was still blocked, you may need to contact your repository administrator." -ForegroundColor Yellow
    }
    else {
        Write-Host "Invalid option. Operation cancelled." -ForegroundColor Red
    }
    
    exit
}

# Check if running in fix mode
if ($args.Contains("--fix-blocked-push")) {
    Fix-BlockedPush
}

# Get the current date and time for the commit message
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Prompt for a commit message
Write-Host "Enter a commit message (leave blank for default message):" -ForegroundColor Yellow
$userMessage = Read-Host

# Check if a commit message was provided
if ([string]::IsNullOrWhiteSpace($userMessage)) {
    # No commit message provided, use default with timestamp
    $commitMessage = "Update ImpossibleAgent - $timestamp"
} else {
    # Use the provided commit message
    $commitMessage = "$userMessage - $timestamp"
}

# Check for sensitive files
Write-Host "Checking for sensitive files..." -ForegroundColor Cyan
$sensitiveFiles = @(".dev.vars", ".dev.vars.secrets")
$trackedSensitiveFiles = @()

foreach ($file in $sensitiveFiles) {
    $isTracked = git ls-files --error-unmatch $file 2>$null
    if ($?) {
        $trackedSensitiveFiles += $file
    }
}

if ($trackedSensitiveFiles.Count -gt 0) {
    Write-Host "Warning: The following sensitive files are being tracked by Git:" -ForegroundColor Red
    foreach ($file in $trackedSensitiveFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
    
    $confirmation = Read-Host "Do you want to remove these files from Git tracking? (y/n)"
    if ($confirmation -eq 'y') {
        foreach ($file in $trackedSensitiveFiles) {
            Write-Host "Removing $file from Git tracking..." -ForegroundColor Yellow
            git rm --cached $file
        }
        Write-Host "Sensitive files removed from Git tracking." -ForegroundColor Green
    } else {
        Write-Host "Warning: Sensitive files will be committed. This may expose secrets." -ForegroundColor Red
        $proceed = Read-Host "Do you want to proceed anyway? (y/n)"
        if ($proceed -ne 'y') {
            Write-Host "Operation cancelled." -ForegroundColor Red
            exit
        }
    }
}

# Add all changes to the staging area
Write-Host "Adding all changes to staging area..." -ForegroundColor Cyan
git add .

# Commit the changes
Write-Host "Committing changes with message: $commitMessage" -ForegroundColor Cyan
git commit -m "$commitMessage"

# Push the changes to the remote repository
Write-Host "Pushing changes to GitHub..." -ForegroundColor Cyan
git push

Write-Host "Done! All changes have been saved to GitHub." -ForegroundColor Green
