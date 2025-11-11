#!/bin/bash
# Test script for three initialization modes

set -e

TOOL_PATH="/home/dai/code/claude-memory-init/dist/index.js"

echo "========================================="
echo "Testing Initialization Modes"
echo "========================================="
echo ""

# Test 1: Quick mode (fully silent)
echo "Test 1: --quick mode (fully automated)"
echo "-----------------------------------"
TEST_DIR="/tmp/test-quick-mode"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo "Running: node $TOOL_PATH init --quick"
node "$TOOL_PATH" init --quick

echo "✓ Quick mode completed"
echo "Generated files:"
ls -la claude/
echo ""

# Check config
echo "Config system section:"
cat claude/config.yaml | grep -A 10 "system:"
echo ""

# Cleanup
cd /
rm -rf "$TEST_DIR"

echo ""
echo "========================================="
echo "Test 2: --simple mode (essential prompts)"
echo "========================================="
echo ""
echo "This mode requires user interaction."
echo "Please test manually with:"
echo "  cd /tmp/test-simple && node $TOOL_PATH init --simple"
echo ""

echo "========================================="
echo "Test 3: --interactive mode (full options)"
echo "========================================="
echo ""
echo "This mode requires extensive user interaction."
echo "Please test manually with:"
echo "  cd /tmp/test-interactive && node $TOOL_PATH init --interactive"
echo ""

echo "========================================="
echo "All automated tests passed!"
echo "========================================="
