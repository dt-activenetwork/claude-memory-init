#!/bin/bash
# System Detection Hook for Claude Code
# This hook runs on Claude Code startup to detect dynamic system information.
#
# Output format: JSON object with system info
# This is injected into the conversation context.

set -e

# Detect Python version
python_version=""
python_path=""
if command -v python3 &> /dev/null; then
    python_version=$(python3 --version 2>&1 | cut -d' ' -f2)
    python_path=$(which python3)
elif command -v python &> /dev/null; then
    python_version=$(python --version 2>&1 | cut -d' ' -f2)
    python_path=$(which python)
fi

# Detect Node.js version
node_version=""
node_path=""
if command -v node &> /dev/null; then
    node_version=$(node --version 2>&1 | sed 's/^v//')
    node_path=$(which node)
fi

# Output JSON
cat << EOF
{
  "python": {
    "version": "$python_version",
    "path": "$python_path"
  },
  "node": {
    "version": "$node_version",
    "path": "$node_path"
  },
  "detected_at": "$(date -Iseconds)"
}
EOF
