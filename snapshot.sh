#!/bin/bash
# Post-commit snapshot — appends last commit info to Tennoplan-Context.md
# so future sessions have instant context without token-expensive re-exploration.

NOTES_FILE="../Notes/Tennoplan-Context.md"
LAST_COMMIT=$(git log -1 --pretty="%s")
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")

if [ -f "$NOTES_FILE" ]; then
  printf "\n## Session ended %s\nLast commit: %s\n" "$TIMESTAMP" "$LAST_COMMIT" >> "$NOTES_FILE"
fi
