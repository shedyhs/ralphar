#!/bin/bash
# PreCompact hook: instructs agent to save checkpoint before compaction
INPUT=$(cat)
AGENT=$(cat .ralph/current-agent 2>/dev/null || echo "unknown")

cat <<EOF
{
  "hookSpecificOutput": {
    "additionalContext": "CONTEXT LIMIT APPROACHING. Before continuing, you MUST write ALL your accumulated knowledge and progress to .ralph/checkpoint-${AGENT}.md. Include: (1) what you have done so far, (2) what you have learned/discovered, (3) key files and patterns found, (4) decisions made and reasoning, (5) what remains to be done. This checkpoint is critical — a new session will continue from it."
  }
}
EOF
