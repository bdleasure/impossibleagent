@echo off
setlocal EnableDelayedExpansion
:: Script to add, commit, and push all changes to GitHub
:: Usage: git-save.bat
:: The script will prompt you to enter a commit message

:: Get the current date and time for the commit message
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "Min=%dt:~10,2%"
set "Sec=%dt:~12,2%"
set "TIMESTAMP=%YYYY%-%MM%-%DD% %HH%:%Min%:%Sec%"

:: Prompt for a commit message
set /p USER_MESSAGE=Enter a commit message (leave blank for default message): 

:: Check if a commit message was provided
if "%USER_MESSAGE%"=="" (
  :: No commit message provided, use default with timestamp
  set "COMMIT_MESSAGE=Update ImpossibleAgent - %TIMESTAMP%"
) else (
  :: Use the provided commit message
  set "COMMIT_MESSAGE=%USER_MESSAGE% - %TIMESTAMP%"
)

:: Check for sensitive files
echo Checking for sensitive files...
set "SENSITIVE_FILES=.dev.vars .dev.vars.secrets"
set "TRACKED_SENSITIVE_FILES="

for %%f in (%SENSITIVE_FILES%) do (
  git ls-files --error-unmatch %%f >nul 2>&1
  if not errorlevel 1 (
    set "TRACKED_SENSITIVE_FILES=!TRACKED_SENSITIVE_FILES! %%f"
  )
)

if not "!TRACKED_SENSITIVE_FILES!"=="" (
  echo Warning: The following sensitive files are being tracked by Git:
  for %%f in (!TRACKED_SENSITIVE_FILES!) do (
    echo   - %%f
  )
  
  set /p CONFIRMATION=Do you want to remove these files from Git tracking? (y/n): 
  if /i "!CONFIRMATION!"=="y" (
    for %%f in (!TRACKED_SENSITIVE_FILES!) do (
      echo Removing %%f from Git tracking...
      git rm --cached %%f
    )
    echo Sensitive files removed from Git tracking.
  ) else (
    echo Warning: Sensitive files will be committed. This may expose secrets.
    set /p PROCEED=Do you want to proceed anyway? (y/n): 
    if /i not "!PROCEED!"=="y" (
      echo Operation cancelled.
      exit /b
    )
  )
)

:: Add all changes to the staging area
echo Adding all changes to staging area...
git add .

:: Commit the changes
echo Committing changes with message: %COMMIT_MESSAGE%
git commit -m "%COMMIT_MESSAGE%"

:: Push the changes to the remote repository
echo Pushing changes to GitHub...
git push

echo Done! All changes have been saved to GitHub.
