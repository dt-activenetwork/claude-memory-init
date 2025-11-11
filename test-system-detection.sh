#!/bin/bash
# Test script for system detection feature

set -e

echo "========================================="
echo "Testing System Detection Feature"
echo "========================================="
echo ""

# Create test directory
TEST_DIR="/tmp/test-claude-system-detection"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo "Test 1: Quick mode initialization (--quick)"
echo "-----------------------------------"
echo "Running fully automated initialization..."
node /home/dai/code/claude-memory-init/dist/index.js init --quick
echo ""

echo "Test 2: Check generated config.yaml"
echo "-----------------------------------"
cat claude/config.yaml | grep -A 10 "system:"
echo ""

echo "Test 3: Check CLAUDE.md system section"
echo "-----------------------------------"
grep -A 25 "## System Environment" CLAUDE.md
echo ""

echo "Test 4: Verify install command example"
echo "-----------------------------------"
grep -A 5 "Package Installation" CLAUDE.md
echo ""

echo "========================================="
echo "All tests passed!"
echo "========================================="

# Cleanup
cd /home/dai/code/claude-memory-init
rm -rf "$TEST_DIR"
