#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

for ((i=1; i<=$1; i++)); do
  result=$(claude --permission-mode acceptEdits -p "@PRD.md @features.json \
  1. Find the highest-priority task and implement it. \
  2. Run your tests and type checks. \
  3. Update the PRD with what was done. \
  4. Append your progress to features.json. \
  5. Commit your changes. \
  
  Before committing, run ALL feedback loops: \
  1. TypeScript: npm run typecheck (must pass with no errors) \
  2. Tests: npm run test (must pass) \
  3. Lint: npm run lint (must pass) \
  Do NOT commit if any feedback loop fails. Fix issues first. \

  ONLY WORK ON A SINGLE TASK. \
  If the PRD is complete, output <promise>COMPLETE</promise>.")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $i iterations."
    exit 0
  fi
done