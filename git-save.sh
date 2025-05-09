#!/bin/bash

# Script to add, commit, and push all changes to GitHub
# Usage: ./git-save.sh
# The script will prompt you to enter a commit message

# Get the current date and time for the commit message
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Prompt for a commit message
echo -e "\033[33mEnter a commit message (leave blank for default message):\033[0m"
read USER_MESSAGE

# Check if a commit message was provided
if [ -z "$USER_MESSAGE" ]; then
  # No commit message provided, use default with timestamp
  COMMIT_MESSAGE="Update ImpossibleAgent - $TIMESTAMP"
else
  # Use the provided commit message
  COMMIT_MESSAGE="$USER_MESSAGE - $TIMESTAMP"
fi

# Check for sensitive files
echo -e "\033[36mChecking for sensitive files...\033[0m"
SENSITIVE_FILES=(".dev.vars" ".dev.vars.secrets")
TRACKED_SENSITIVE_FILES=()

for file in "${SENSITIVE_FILES[@]}"; do
  if git ls-files --error-unmatch "$file" &>/dev/null; then
    TRACKED_SENSITIVE_FILES+=("$file")
  fi
done

if [ ${#TRACKED_SENSITIVE_FILES[@]} -gt 0 ]; then
  echo -e "\033[31mWarning: The following sensitive files are being tracked by Git:\033[0m"
  for file in "${TRACKED_SENSITIVE_FILES[@]}"; do
    echo -e "\033[31m  - $file\033[0m"
  done
  
  echo -e -n "\033[33mDo you want to remove these files from Git tracking? (y/n): \033[0m"
  read CONFIRMATION
  if [ "$CONFIRMATION" = "y" ]; then
    for file in "${TRACKED_SENSITIVE_FILES[@]}"; do
      echo -e "\033[33mRemoving $file from Git tracking...\033[0m"
      git rm --cached "$file"
    done
    echo -e "\033[32mSensitive files removed from Git tracking.\033[0m"
  else
    echo -e "\033[31mWarning: Sensitive files will be committed. This may expose secrets.\033[0m"
    echo -e -n "\033[33mDo you want to proceed anyway? (y/n): \033[0m"
    read PROCEED
    if [ "$PROCEED" != "y" ]; then
      echo -e "\033[31mOperation cancelled.\033[0m"
      exit 1
    fi
  fi
fi

# Add all changes to the staging area
echo -e "\033[36mAdding all changes to staging area...\033[0m"
git add .

# Commit the changes
echo -e "\033[36mCommitting changes with message: $COMMIT_MESSAGE\033[0m"
git commit -m "$COMMIT_MESSAGE"

# Push the changes to the remote repository
echo -e "\033[36mPushing changes to GitHub...\033[0m"
git push

echo -e "\033[32mDone! All changes have been saved to GitHub.\033[0m"
