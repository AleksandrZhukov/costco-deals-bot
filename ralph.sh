#!/bin/bash

# PRD Story Executor - Uses opencode to work on each story from PRD JSON
# Features: Auto-execute mode, dry-run, story filtering

# Default configuration
PRD_FILE=""  # No default - must be provided
WORK_DONE_FILE="/Users/azhukov/projects/deal-bot/work_done.md"
AUTO_EXECUTE=false
DRY_RUN=false
SPECIFIC_STORY=""

# Show help
show_help() {
  cat << EOF
PRD Story Executor - Execute user stories from PRD JSON files

Usage: $(basename "$0") -f PRD_FILE [OPTIONS]

Required:
  -f, --file PRD_FILE   Path to PRD JSON file

Options:
  -y, --yes, --auto     Auto-execute all stories without confirmation
  -d, --dry-run         Show what would be executed without running
  -s, --story STORY_ID  Execute only a specific story (e.g., US-001)
  -h, --help            Show this help message

Examples:
  $(basename "$0") -f prd-axiom-logging.json
  $(basename "$0") --file prd-axiom-logging.json --yes
  $(basename "$0") -f prd.json --dry-run
  $(basename "$0") -f prd.json --story US-001
  $(basename "$0") -f prd.json --yes --story US-002

EOF
}

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -f|--file)
      PRD_FILE="$2"
      shift 2
      ;;
    -y|--yes|--auto)
      AUTO_EXECUTE=true
      shift
      ;;
    -d|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -s|--story)
      SPECIFIC_STORY="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Check if PRD file parameter was provided
if [ -z "$PRD_FILE" ]; then
  echo "Error: PRD file is required"
  echo ""
  show_help
  exit 1
fi

# Derive log file path from PRD file (same directory, .log extension)
PRD_DIR=$(dirname "$PRD_FILE")
PRD_BASE=$(basename "$PRD_FILE" .json)
LOG_FILE="$PRD_DIR/${PRD_BASE}.log"

# Check if file exists
if [ ! -f "$PRD_FILE" ]; then
  echo "Error: PRD file not found at $PRD_FILE"
  exit 1
fi

# Check for required tools
for tool in jq git opencode; do
  if ! command -v "$tool" &> /dev/null; then
    echo "Error: Required tool '$tool' not found. Please install it first."
    exit 1
  fi
done

# Log function to track progress
log_progress() {
  local level="$1"  # INFO, SUCCESS, ERROR, WARN
  local message="$2"

  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")

  # Output to console and log file
  echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Initialize log file
if [ "$DRY_RUN" = false ]; then
  log_progress "INFO" "========== SESSION STARTED =========="
  log_progress "INFO" "PRD File: $PRD_FILE"
  log_progress "INFO" "Log File: $LOG_FILE"
  log_progress "INFO" "Working Directory: $(pwd)"
  log_progress "INFO" "Mode: $([ "$AUTO_EXECUTE" = true ] && echo "AUTO-EXECUTE" || echo "INTERACTIVE")"
  [ -n "$SPECIFIC_STORY" ] && log_progress "INFO" "Filtering for story: $SPECIFIC_STORY"
else
  echo "========== DRY RUN MODE =========="
  echo "PRD File: $PRD_FILE"
  [ -n "$SPECIFIC_STORY" ] && echo "Filtering for story: $SPECIFIC_STORY"
  echo ""
fi

# Show previous progress if log file exists and has content
if [ "$DRY_RUN" = false ] && [ -f "$LOG_FILE" ] && [ -s "$LOG_FILE" ]; then
  echo ""
  echo "========================================="
  echo "PREVIOUS PROGRESS (from log file)"
  echo "========================================="

  # Extract and show completed stories from log
  completed_stories=$(grep -E "^\[.*\] \[SUCCESS\] Story .* completed successfully" "$LOG_FILE" 2>/dev/null | tail -5)

  if [ -n "$completed_stories" ]; then
    echo ""
    echo "Recently completed stories:"
    echo "$completed_stories"
  else
    echo "No completed stories found in log."
  fi

  echo ""
  echo "========================================="
fi

# Extract PRD context (requires jq)
extract_context() {
  local prd_title=$(jq -r '.title' "$PRD_FILE")
  local prd_problem=$(jq -r '.context.problem' "$PRD_FILE")
  local prd_solution=$(jq -r '.context.solution' "$PRD_FILE")
  local prd_goals=$(jq -r '.goals[] | "- " + .' "$PRD_FILE")
  local prd_success=$(jq -r '.success_criteria[] | "- " + .' "$PRD_FILE")
  local prd_quality_gates=$(jq -r '.qualityGates[]' "$PRD_FILE" | tr '\n' ' ')

  # Get source document path
  local source_doc_path=$(jq -r '.context.source_document' "$PRD_FILE")

  # Read source document if it exists
  local source_doc_content=""
  if [ -f "$source_doc_path" ]; then
    source_doc_content="

IMPLEMENTATION PLAN
===================
$(cat "$source_doc_path")"
  else
    echo "Warning: Source document not found at $source_doc_path" >&2
  fi

  echo "PROJECT CONTEXT
===============
Title: $prd_title

Problem: $prd_problem

Solution: $prd_solution

Goals:
$prd_goals

Success Criteria:
$prd_success

Quality Gates: $prd_quality_gates
$source_doc_content
"
}

# Function to update work_done.md
update_work_done() {
  local story_id="$1"
  local title="$2"
  local commit_hash="$3"
  local files_created="$4"
  local files_modified="$5"

  local current_date=$(date "+%b %d, %Y")

  # Create markdown entry
  local entry="

## $story_id: $title ✅
**Commit:** \`$commit_hash\` | **Date:** $current_date

### Completed
- ✅ $title

### Files Created
$files_created

### Files Modified
$files_modified

Status: Story completed. All acceptance criteria implemented.
---
"

  # Append to work_done.md
  echo "$entry" >> "$WORK_DONE_FILE"
  echo "Updated $WORK_DONE_FILE"
}

# Function to create git commit
create_commit() {
  local story_id="$1"
  local title="$2"

  # Stage all changes
  git add .

  # Create commit message
  local commit_message="feat: $story_id - $title

Implements user story $story_id"

  # Create commit
  git commit -m "$commit_message"

  # Get commit hash
  local commit_hash=$(git rev-parse HEAD)
  echo "$commit_hash"
}

# Function to execute a story using opencode
execute_story() {
  local story_id="$1"
  local title="$2"
  local description="$3"
  local acceptance_criteria="$4"
  local prd_context="$5"
  local depends_on="$6"

  echo ""
  echo "========================================="
  echo "Story: $story_id - $title"
  echo "========================================="
  echo ""

  if [ "$DRY_RUN" = false ]; then
    log_progress "INFO" "Starting story: $story_id - $title"
  fi

  # Build depends on section if exists
  local depends_section=""
  if [ -n "$depends_on" ]; then
    depends_section="
Depends On: $depends_on"
  fi

  # Build the opencode prompt
  local prompt="$prd_context

USER STORY TO IMPLEMENT
========================
ID: $story_id
Title: $title
Description: $description$depends_section

Acceptance Criteria:
$acceptance_criteria

IMPLEMENTATION GUIDELINES
========================
1. Read existing code to understand patterns and conventions in the codebase
2. Follow the project's existing code style and architecture
3. Implement all acceptance criteria completely
4. Run quality gates after making changes
5. Test the implementation if possible

Focus on completing the core functionality required by the acceptance criteria while adhering to the project goals and success criteria above."

  if [ "$DRY_RUN" = true ]; then
    echo "Would execute with prompt:"
    echo "---"
    echo "$prompt" | head -20
    echo "..."
    echo "(prompt truncated in dry-run mode)"
    echo "---"
    return
  fi

  echo "Prompt:"
  echo "$prompt"
  echo ""

  log_progress "INFO" "Prompt prepared for story $story_id"

  # Ask for confirmation (unless auto-execute is enabled)
  if [ "$AUTO_EXECUTE" = true ]; then
    REPLY="y"
    echo "🤖 Auto-executing story (--yes flag enabled)..."
    echo ""
  else
    read -p "Execute this story? (y/n/q to quit) " -n 1 -r
    echo ""
  fi

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_progress "INFO" "Executing opencode for story $story_id"

    # Run opencode with the prompt
    opencode run "$prompt"

    log_progress "INFO" "Opencode execution completed for story $story_id"

    echo ""
    echo "Checking for changes..."

    # Check if there are changes to commit
    if git diff --quiet && git diff --cached --quiet; then
      log_progress "WARN" "No changes detected for story $story_id - skipping commit"
      echo "No changes detected. Skipping commit."
      return
    fi

    log_progress "INFO" "Changes detected, creating commit for story $story_id"

    # Create commit
    echo "Creating commit..."
    local commit_hash=$(create_commit "$story_id" "$title")
    log_progress "SUCCESS" "Commit created: $commit_hash for story $story_id"
    echo "Commit created: $commit_hash"

    # Get list of changed files
    local changed_files=$(git diff --name-only HEAD~1 HEAD)
    local files_created=""
    local files_modified=""

    # Categorize files
    for file in $changed_files; do
      if [ "$file" != "$WORK_DONE_FILE" ]; then
        if git show HEAD~1:"$file" &> /dev/null; then
          files_modified="$files_modified- \`$file\`
"
        else
          files_created="$files_created- \`$file\`
"
        fi
      fi
    done

    if [ -z "$files_created" ]; then
      files_created="None"
    fi

    if [ -z "$files_modified" ]; then
      files_modified="None"
    fi

    log_progress "INFO" "Files created: $files_created"
    log_progress "INFO" "Files modified: $files_modified"

    # Update work_done.md
    echo "Updating work_done.md..."
    update_work_done "$story_id" "$title" "$commit_hash" "$files_created" "$files_modified"
    log_progress "INFO" "Updated work_done.md for story $story_id"

    # Commit work_done.md
    echo "Committing work_done.md..."
    git add "$WORK_DONE_FILE"
    git commit -m "docs: update work_done.md for $story_id"
    log_progress "SUCCESS" "Committed work_done.md for story $story_id"

    # Update PRD JSON to mark story as completed
    echo "Updating PRD to mark story as completed..."
    local updated_json=$(jq --arg sid "$story_id" '.stories |= map(if .id == $sid then .status = "completed" | .completedAt = (now | todateiso8601) | .updatedAt = (now | todateiso8601) else . end)' "$PRD_FILE")
    echo "$updated_json" > "$PRD_FILE"
    git add "$PRD_FILE"
    git commit -m "docs: mark $story_id as completed in PRD"
    log_progress "SUCCESS" "Marked $story_id as completed in PRD"

    log_progress "SUCCESS" "Story $story_id completed successfully"
    echo "Story $story_id completed and committed!"

  elif [[ $REPLY =~ ^[Qq]$ ]]; then
    log_progress "INFO" "User quit - exiting"
    echo "Exiting..."
    exit 0
  else
    log_progress "INFO" "Skipping story $story_id per user request"
    echo "Skipping story $story_id"
  fi
}

# Extract PRD context once
PRD_CONTEXT=$(extract_context)

stories_count=$(jq '.stories | length' "$PRD_FILE")
echo "Found $stories_count stories in PRD"

# Count stories to be executed
stories_to_execute=0
for ((i=0; i<$stories_count; i++)); do
  story_id=$(jq -r ".stories[$i].id" "$PRD_FILE")
  status=$(jq -r ".stories[$i].status" "$PRD_FILE")

  # Check if we should process this story
  if [ "$status" = "completed" ]; then
    continue
  fi

  if [ -n "$SPECIFIC_STORY" ] && [ "$story_id" != "$SPECIFIC_STORY" ]; then
    continue
  fi

  stories_to_execute=$((stories_to_execute + 1))
done

echo "Stories to execute: $stories_to_execute"
echo ""

if [ $stories_to_execute -eq 0 ]; then
  echo "No stories to execute!"
  if [ -n "$SPECIFIC_STORY" ]; then
    echo "Story $SPECIFIC_STORY not found or already completed."
  else
    echo "All stories are already completed."
  fi
  exit 0
fi

# Process stories
for ((i=0; i<$stories_count; i++)); do
  story_id=$(jq -r ".stories[$i].id" "$PRD_FILE")
  title=$(jq -r ".stories[$i].title" "$PRD_FILE")
  description=$(jq -r ".stories[$i].description" "$PRD_FILE")
  depends_on=$(jq -r ".stories[$i].dependsOn[]?" "$PRD_FILE" | tr '\n' ',' | sed 's/,$//')

  # Format acceptance criteria
  acceptance_criteria=$(jq -r ".stories[$i].acceptanceCriteria[] | \"- \" + ." "$PRD_FILE")

  # Skip completed stories
  status=$(jq -r ".stories[$i].status" "$PRD_FILE")
  if [ "$status" = "completed" ]; then
    if [ "$DRY_RUN" = false ]; then
      log_progress "INFO" "Skipping completed story: $story_id (status: $status)"
    fi
    echo "⏭️  Skipping completed story: $story_id"
    continue
  fi

  # Skip if specific story requested and this isn't it
  if [ -n "$SPECIFIC_STORY" ] && [ "$story_id" != "$SPECIFIC_STORY" ]; then
    continue
  fi

  execute_story "$story_id" "$title" "$description" "$acceptance_criteria" "$PRD_CONTEXT" "$depends_on"
done

echo ""
if [ "$DRY_RUN" = true ]; then
  echo "Dry run completed! Use without --dry-run to execute."
else
  echo "All stories processed!"
  log_progress "INFO" "========== SESSION COMPLETED =========="
  log_progress "INFO" "Session summary: See log file for details: $LOG_FILE"
fi