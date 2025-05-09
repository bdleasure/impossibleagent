# Git Save Scripts

This directory contains scripts to simplify the process of saving your changes to GitHub. These scripts automate the process of adding, committing, and pushing changes to your repository, and include functionality to help fix blocked pushes due to secrets.

## Available Scripts

### 1. PowerShell Script (Recommended for Windows)

**File:** `git-save.ps1`

**Usage:**
```powershell
.\git-save.ps1
```

The script will prompt you to enter a commit message. If you leave it blank, a default message with timestamp will be used.

### 2. Batch File (Alternative for Windows)

**File:** `git-save.bat`

**Usage:**
```batch
git-save.bat
```

The script will prompt you to enter a commit message. If you leave it blank, a default message with timestamp will be used.

### 3. Bash Script (For Linux/Mac)

**File:** `git-save.sh`

**Usage:**
```bash
# Make it executable first (one-time setup)
chmod +x git-save.sh

# Run the script
./git-save.sh
```

The script will prompt you to enter a commit message. If you leave it blank, a default message with timestamp will be used.

### 4. NPM Script (Cross-platform)

**Usage:**
```bash
npm run save
```

This will run the PowerShell script on Windows, which will prompt you to enter a commit message.

## What These Scripts Do

1. Check for sensitive files (.dev.vars, .dev.vars.secrets) being tracked by Git
2. Offer to remove sensitive files from Git tracking if found
3. Add all changes to the staging area (`git add .`)
4. Commit the changes with a timestamp and optional message
5. Push the changes to the remote repository

## Default Commit Message

If no commit message is provided, the scripts will use a default message in the format:
```
Update ImpossibleAgent - [TIMESTAMP]
```

Where `[TIMESTAMP]` is the current date and time.

## Custom Commit Message

If you provide a custom commit message, the scripts will use it in the format:
```
[YOUR MESSAGE] - [TIMESTAMP]
```

Where `[YOUR MESSAGE]` is your custom message and `[TIMESTAMP]` is the current date and time.

## Fixing Blocked Pushes

If your push is blocked by GitHub's secret scanning protection, you can use the fix-blocked-push functionality to help remove secrets from your commits.

### Using the PowerShell Script

```powershell
.\git-save.ps1 --fix-blocked-push
```

### Using the NPM Script

```bash
npm run fix-push
```

The script will guide you through the process of removing secrets from your commits, offering two options:

1. **Fix for Latest Commit Only**: If the secret was introduced in your most recent commit, this option will help you amend that commit to remove the secret.

2. **Fix for Earlier Commits**: If the secret was introduced in an earlier commit, this option will help you perform an interactive rebase to edit the commit that introduced the secret.

The script will provide step-by-step instructions for each option, making it easier to resolve blocked pushes due to secrets.
