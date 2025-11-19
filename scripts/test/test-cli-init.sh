#!/bin/bash
# Test CLI initialization with real interaction

set -e

TEST_DIR="/tmp/cli-test-$(date +%s)"

echo "======================================================================"
echo "CLI Init Test - Real Initialization"
echo "======================================================================"
echo ""
echo "Test directory: $TEST_DIR"
echo ""

# Create test directory
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo "Running: claude-memory-init init"
echo "----------------------------------------------------------------------"
echo ""

# Note: This will run in non-interactive mode since we're in a script
# For real testing, run manually: node dist/index.js init

echo "Simulating user input:"
echo "  Project name: CLI Test Project"
echo "  Description: Testing CLI initialization"
echo "  Select plugins: system-detector, git"
echo "  Auto-commit: no"
echo "  AI git ops: no"
echo "  Confirm: yes"
echo ""

# The actual command would be interactive
# For automated testing, we'd need to pipe responses
# For now, just show what would happen

echo "To test interactively, run:"
echo "  cd $TEST_DIR"
echo "  $(pwd)/dist/index.js init"
echo ""

echo "Expected outputs:"
echo "  - AGENT.md"
echo "  - .agent/system/info.toon"
echo "  - .agent/git/ (if git selected)"
echo ""

# Cleanup
cd -
rm -rf "$TEST_DIR"

echo "======================================================================"
echo "Manual test instructions prepared"
echo "======================================================================"
