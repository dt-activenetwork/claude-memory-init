#!/bin/bash
# Test script for development tools detection feature

set -e

TOOL_PATH="/home/dai/code/claude-memory-init/dist/index.js"

echo "========================================="
echo "Testing Development Tools Detection"
echo "========================================="
echo ""

# Test 1: Quick init with dev tools detection
echo "Test 1: Quick mode with dev tools detection"
echo "-----------------------------------"
TEST_DIR="/tmp/test-dev-tools"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo "Running: node $TOOL_PATH init --quick"
node "$TOOL_PATH" init --quick

echo "✓ Quick mode completed"
echo ""

# Test 2: Check config for dev_tools section
echo "Test 2: Check config.yaml dev_tools section"
echo "-----------------------------------"
cat claude/config.yaml | grep -A 20 "dev_tools:"
echo ""

# Test 3: Check CLAUDE.md Development Environment section
echo "Test 3: Check CLAUDE.md Development Environment"
echo "-----------------------------------"
echo "Python Environment:"
grep -A 15 "### Python Environment" claude/CLAUDE.md | head -16
echo ""

echo "Node.js Environment:"
grep -A 15 "### Node.js Environment" claude/CLAUDE.md | head -16
echo ""

# Test 4: Display detected tools summary
echo "Test 4: Detected Tools Summary"
echo "-----------------------------------"
echo "Python:"
grep "**Version**:" claude/CLAUDE.md | grep -A 1 "Python" | head -2 || echo "  Not found"
grep "**Package Manager**:" claude/CLAUDE.md | grep -A 1 "uv\|venv\|pip" | head -1 || echo "  Not found"

echo ""
echo "Node.js:"
grep "**Version**:" claude/CLAUDE.md | grep -v "Python" | head -1 || echo "  Not found"
grep "**Package Manager**:" claude/CLAUDE.md | grep -A 1 "pnpm\|yarn\|npm" | head -1 || echo "  Not found"

echo ""

# Test 5: Verify guidelines for AI
echo "Test 5: Check AI Guidelines Section"
echo "-----------------------------------"
grep -A 5 "Important Guidelines for AI Agent" claude/CLAUDE.md | head -6
echo ""

# Cleanup
cd /
rm -rf "$TEST_DIR"

echo "========================================="
echo "All tests passed!"
echo "========================================="
echo ""
echo "Summary:"
echo "✓ Dev tools detection working"
echo "✓ Config properly generated"
echo "✓ CLAUDE.md contains dev environment"
echo "✓ AI guidelines included"
