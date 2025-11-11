# Development Tools Detection

## Overview

Claude Memory Init automatically detects Python and Node.js development environments during initialization. This enables Claude Code to provide accurate, environment-specific recommendations for tool usage and package management.

## Why This Matters for Claude Code

**Claude Code** is exceptionally powerful at:
- 🐍 **Python development** - Creating scripts, tools, and applications
- 📦 **Node.js development** - Building CLI tools and JavaScript applications

By detecting and documenting the available development tools, Claude Code can:
- ✅ Use the correct package manager (`pnpm` vs `npm` vs `yarn`)
- ✅ Generate appropriate virtual environment commands (`uv` vs `venv`)
- ✅ Follow version-specific syntax and APIs
- ✅ Provide consistent, working code examples

## Features

### 1. Python Environment Detection

**What Gets Detected:**
- Python version (tries `python3` first, then `python`)
- Python path
- `uv` availability (modern fast package manager)
- `venv` support (built-in virtual environments)
- Recommended package manager based on priority: `uv` > `venv` > `pip`

**Example Detection:**
```yaml
dev_tools:
  python:
    available: true
    version: 3.13.7
    path: /usr/sbin/python3
    package_manager: uv
    has_uv: true
    has_venv: true
```

### 2. Node.js Environment Detection

**What Gets Detected:**
- Node.js version
- Node.js path
- All available package managers: `pnpm`, `yarn`, `npm`
- Selected package manager (priority: `pnpm` > `yarn` > `npm`)

**Example Detection:**
```yaml
dev_tools:
  node:
    available: true
    version: 20.19.5
    path: /usr/sbin/node
    package_managers:
      - pnpm
      - npm
    selected_package_manager: pnpm
```

### 3. Interactive Package Manager Selection

When multiple Node.js package managers are detected:

**Simple/Interactive Modes:**
```
📦 Node.js Environment:
  Version: 20.19.5
  Available package managers:
    - pnpm
    - yarn
    - npm

? Select Node.js package manager: (Use arrow keys)
❯ pnpm
  yarn
  npm
```

**Quick Mode:**
- Auto-selects based on priority (`pnpm` > `yarn` > `npm`)
- No user interaction required

## Generated CLAUDE.md Content

### Python Section Example

```markdown
### Python Environment

**Status**: ✅ Available
**Version**: 3.13.7
**Path**: `/usr/sbin/python3`
**Package Manager**: uv (with uv - recommended)

**Virtual Environment Creation:**
```bash
uv venv venv
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows
```

**Package Installation:**
```bash
uv pip install <package>
```

**Features:**
- ✅ `uv` available - Fast Python package installer and resolver
- ✅ `venv` available - Standard virtual environment support
- ✅ `pip` available - Python package installer
```

### Node.js Section Example

```markdown
### Node.js Environment

**Status**: ✅ Available
**Version**: 20.19.5
**Path**: `/usr/sbin/node`
**Package Manager**: pnpm

**Available Package Managers:**
  - pnpm ⭐ (selected)
  - npm

**Package Installation:**
```bash
pnpm add <package>
```

**Run Scripts:**
```bash
pnpm dev
```

**Usage Note**: Always use `pnpm` for package management in this project for consistency.
```

### AI Guidelines Section

```markdown
### Important Guidelines for AI Agent

**When suggesting code or tool usage:**

1. **Use Detected Tools**
   - ✅ Only suggest tools that are marked as "available" above
   - ✅ Use the specified package managers and versions
   - ❌ Do NOT suggest tools that are not detected

2. **Python Development**
   - Use uv for environment management
   - Follow Python 3.13.7 syntax and features
   - Use `uv` for fast virtual environment creation and package management

3. **Node.js Development**
   - Use pnpm for package management
   - Use pnpm <script> to run scripts
   - Follow Node.js 20.19.5 APIs and features

4. **Tool Installation Suggestions**
   - If a required tool is not available, suggest installation using the system package manager
   - Provide clear installation instructions specific to this environment
```

## Detection Logic

### Python Detection Priority

1. Try `python3` command
2. If not found, try `python` command
3. If found:
   - Get version: `python --version`
   - Check for `uv`: `which uv`
   - Check for venv support: `python -m venv --help`
   - Set package_manager: `uv` if available, else `venv` if supported, else `pip`

### Node.js Detection Priority

1. Check if `node` exists
2. If found:
   - Get version: `node --version`
   - Check for `pnpm`: `which pnpm`
   - Check for `yarn`: `which yarn`
   - Check for `npm`: `which npm`
   - Default selection: first of [`pnpm`, `yarn`, `npm`] that exists

### Package Manager Selection Logic

**Single Package Manager:**
- Automatically selected
- No user interaction

**Multiple Package Managers:**
- **Interactive/Simple Mode**: Prompt user to choose
- **Quick Mode**: Auto-select by priority

**Priority Order:**
- Node.js: `pnpm` > `yarn` > `npm`
- Python: `uv` > `venv` > `pip`

## Command Generation

### Python Commands

**Virtual Environment:**
```python
# With uv
uv venv venv

# With venv
python3 -m venv venv

# With pip (fallback)
python -m venv venv
```

**Package Installation:**
```python
# With uv
uv pip install requests

# With pip
pip install requests
```

### Node.js Commands

**Package Installation:**
```bash
# With pnpm
pnpm add express

# With yarn
yarn add express

# With npm
npm install express
```

**Run Scripts:**
```bash
# With pnpm
pnpm dev

# With yarn
yarn dev

# With npm
npm run dev
```

## Implementation

### Key Files

**src/utils/system-detector.ts:**
- `detectPython()` - Python environment detection
- `detectNode()` - Node.js environment detection
- `detectDevelopmentTools()` - Main detection function
- `generatePythonVenvCommand()` - Python venv command generation
- `generatePythonInstallCommand()` - Python install command generation
- `generateNodeInstallCommand()` - Node install command generation
- `generateNodeRunCommand()` - Node run command generation

**src/prompts/system-info.ts:**
- Interactive prompts for package manager selection
- Development tools display in console

**src/types/config.ts:**
- `PythonConfig` interface
- `NodeConfig` interface
- `DevelopmentTools` interface

**src/core/template-engine.ts:**
- `renderDevToolsSection()` - Renders development environment section
- Template variable substitution for dev tools

## Usage Examples

### Example 1: Environment with Both Tools

```bash
cd my-project
pnpm dlx github:dt-activenetwork/claude-memory-init init --simple

# Detected:
# - Python 3.13.7 with uv
# - Node.js 20.19.5 with pnpm

# Generated CLAUDE.md tells AI:
# - Use uv for Python virtual environments
# - Use pnpm for Node.js packages
```

### Example 2: Python-Only Environment

```bash
# Only Python installed, no Node.js

# Generated CLAUDE.md tells AI:
# - Python 3.11.0 available with venv
# - Node.js not available
# - Suggests Node.js installation if needed
```

### Example 3: Multiple Node Package Managers

```bash
# Both pnpm and npm installed

# Interactive mode asks:
? Select Node.js package manager:
❯ pnpm
  npm

# Quick mode auto-selects pnpm (higher priority)
```

## Benefits for Claude Code

### Before (Generic Suggestions)

```python
Claude: "To create a virtual environment:
  python -m venv venv  # Standard method
  # or
  virtualenv venv  # If virtualenv installed
  # or
  conda create -n myenv  # If conda installed"
```

### After (Environment-Aware)

```python
Claude: "Based on your environment (Python 3.13.7 with uv), create a virtual environment:

  uv venv venv
  source venv/bin/activate

This uses uv for faster environment creation and package installation."
```

### For Node.js

**Before:**
```javascript
Claude: "Install dependencies with:
  npm install
  # or
  yarn install
  # or
  pnpm install"
```

**After:**
```javascript
Claude: "Based on your environment (Node.js 20.19.5 with pnpm):

  pnpm install

Always use pnpm for consistency in this project."
```

## Testing

### Run Tests

```bash
# Test development tools detection
./test-dev-tools-detection.sh
```

### Manual Testing

```bash
# Test with current environment
cd /tmp/test-project
node /path/to/claude-memory-init/dist/index.js init --quick

# Check generated config
cat claude/config.yaml | grep -A 20 "dev_tools:"

# Check generated CLAUDE.md
grep -A 50 "## Development Environment" claude/CLAUDE.md
```

### Test Scenarios

1. **Both Tools Available**
   - Python + Node.js both detected
   - Package managers selected
   - Complete guidelines generated

2. **Python Only**
   - Python detected
   - Node.js section shows "Not Available"
   - Installation instructions provided

3. **Node Only**
   - Node.js detected
   - Python section shows "Not Available"
   - Installation instructions provided

4. **Neither Available**
   - Both sections show "Not Available"
   - Installation instructions for both

5. **Multiple Package Managers**
   - Interactive selection works
   - Selected manager displayed with ⭐

## Configuration

### Config Structure

```yaml
system:
  os_type: linux
  os_name: EndeavourOS
  package_manager: pacman
  dev_tools:
    python:
      available: true
      version: "3.13.7"
      path: /usr/sbin/python3
      package_manager: uv
      has_uv: true
      has_venv: true
    node:
      available: true
      version: "20.19.5"
      path: /usr/sbin/node
      package_managers: [pnpm, npm]
      selected_package_manager: pnpm
```

## Troubleshooting

### Issue: Python Not Detected

**Cause:** Python not in PATH or not installed

**Solution:**
1. Install Python: `sudo pacman -S python` (or your package manager)
2. Verify: `python3 --version`
3. Re-run: `claude-memory-init init --force`

### Issue: uv Not Detected

**Cause:** uv not installed

**Solution:**
1. Install uv: `pip install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`
2. Re-run: `claude-memory-init init --force`

### Issue: Wrong Node Package Manager Selected

**Cause:** Auto-selection in quick mode

**Solution:**
1. Use interactive mode: `init --simple`
2. Select preferred package manager when prompted
3. Or edit `claude/config.yaml` and change `selected_package_manager`

### Issue: pnpm Not Detected

**Cause:** pnpm not installed globally

**Solution:**
1. Install pnpm: `npm install -g pnpm`
2. Or use corepack: `corepack enable pnpm`
3. Re-run: `claude-memory-init init --force`

## Future Enhancements

1. **Additional Tools Detection**
   - Poetry (Python)
   - Pipenv (Python)
   - Bun (JavaScript runtime)
   - Deno (JavaScript runtime)

2. **Version Compatibility Checks**
   - Warn if Python < 3.8
   - Warn if Node.js < 16
   - Suggest upgrades

3. **Virtual Environment Auto-Detection**
   - Detect existing venv in project
   - Suggest activation if not activated

4. **Package Lock File Detection**
   - Detect `package-lock.json` (npm)
   - Detect `pnpm-lock.yaml` (pnpm)
   - Detect `yarn.lock` (yarn)
   - Recommend matching package manager

5. **Python Version Manager Detection**
   - pyenv
   - asdf
   - conda/mamba

6. **Node Version Manager Detection**
   - nvm
   - asdf
   - fnm

## Related Documentation

- [SYSTEM_DETECTION.md](./SYSTEM_DETECTION.md) - OS and package manager detection
- [INITIALIZATION_MODES.md](./INITIALIZATION_MODES.md) - Initialization modes
- [README.md](../README.md) - Main documentation
- [CLAUDE.md](../CLAUDE.md) - Project guide

## Version Information

**Added in**: Version 1.2.0
**Date**: 2025-01-11
**Status**: Production-ready
