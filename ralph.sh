#!/bin/bash
set -e

RALPH_DIR=".ralph"

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

clean_ralph() {
  rm -rf "$RALPH_DIR"
  mkdir -p "$RALPH_DIR"
}

# === ROLE FUNCTIONS (to be added) ===

# === MAIN LOOP ===
for ((i=1; i<=$1; i++)); do
  echo "========================================="
  echo "ITERATION $i"
  echo "========================================="

  clean_ralph

  # PLANNING PHASE (to be added)

  # IMPLEMENTATION PHASE (to be added)

  # COMMIT PHASE (to be added)

  echo "Iteration $i complete."
done
