# Initialization Modes

Claude Memory Init provides three initialization modes to suit different user needs and levels of customization.

## Mode Comparison

| Feature | `--quick` | `--simple` | `--interactive` |
|---------|-----------|------------|-----------------|
| **User Interaction** | None | Minimal (3-4 prompts) | Full (10+ prompts) |
| **Project Name** | Auto from directory | Editable default | Full input |
| **Project Type** | Auto-detected | Auto-detected | Choose from list |
| **Description** | Default | Brief input | Full input |
| **Language** | English/English | Choose user language | Full language config |
| **System Detection** | Auto-select | Auto + user selection | Auto + user selection |
| **Objectives** | 1 default | 1 default | Add multiple |
| **Assumptions** | 1 default | 1 default | Add multiple |
| **Domain Terms** | None | None | Add custom terms |
| **Use Case** | CI/CD, quick setup | **Recommended** for most users | Advanced customization |

## Mode Details

### 1. Quick Mode (`--quick`)

**Fully automated initialization with zero interaction.**

```bash
cd my-project
pnpm dlx github:dt-activenetwork/claude-memory-init init --quick
```

**Characteristics:**
- ✅ No prompts or user input required
- ✅ Minimal output (only success/error messages)
- ✅ Perfect for CI/CD pipelines and automation
- ✅ Fastest initialization (~2 seconds)

**What Gets Set:**
- **Project Name**: Directory basename
- **Project Type**: "Multi-language Repository"
- **Description**: "Code analysis and documentation project"
- **Languages**: English for both user and think
- **System**: Auto-detected OS and package manager (priority-based)
- **Objectives**: 1 default objective
- **Assumptions**: 1 default assumption
- **Domain Terms**: None

**Example Output:**
```
✅ Initialization complete
```

**When to Use:**
- Automated scripts and CI/CD
- Quick testing and demos
- Projects that don't need customization
- When you're in a hurry

---

### 2. Simple Mode (`--simple`) ⭐ Recommended

**Essential settings with minimal interaction.**

```bash
cd my-project
pnpm dlx github:dt-activenetwork/claude-memory-init init --simple
```

**Characteristics:**
- ✅ Only 3-4 essential prompts
- ✅ Takes ~1 minute to complete
- ✅ Good balance of customization and speed
- ✅ Recommended for most users

**What You'll Be Asked:**

1. **Project Name**
   ```
   ? Project name: (my-project)
   ```
   *Press Enter to accept default*

2. **Project Description**
   ```
   ? Project description (brief): Code analysis and documentation project
   ```
   *Provide a brief description*

3. **User Language**
   ```
   ? User language (for outputs): (Use arrow keys)
   ❯ English
     Chinese
     Japanese
     Other
   ```

4. **System Information** (auto-detected)
   ```
   🖥️  System Information:
     OS: EndeavourOS (linux)
     User: regular user
     Sudo: available

   📦 Multiple package managers detected:
     - pacman
     - paru

   ? Select package manager to use: (Use arrow keys)
   ❯ pacman
     paru
   ```
   *Only shown if multiple package managers detected*

**Example Session:**
```
🚀 Claude Memory System Initializer (Simple Mode)

📋 Project Information
? Project name: my-awesome-project
? Project description (brief): REST API backend service

🌐 Language
? User language (for outputs): English

🖥️  System Information:
  OS: EndeavourOS (linux)
  Version:
  User: regular user
  Sudo: available

📦 Package manager: pacman

💡 Example install command:
  sudo pacman -S <package>

✔ Configuration saved
✔ Memory system initialized

✅ Initialization complete!

Next steps:
  claude-memory-init show         # View configuration
  claude-memory-init add-objective "..." # Add objectives
  claude-memory-init edit         # Edit configuration
```

**When to Use:**
- First time setup (recommended)
- Projects needing basic customization
- When you want sensible defaults with minimal input
- Daily development workflow

---

### 3. Interactive Mode (`--interactive`)

**Full interactive configuration with all options.**

```bash
cd my-project
pnpm dlx github:dt-activenetwork/claude-memory-init init --interactive
```

**Characteristics:**
- ✅ Complete control over all settings
- ✅ Takes ~3-5 minutes to complete
- ✅ Suitable for complex projects
- ⚠️  Many prompts (10+)

**What You'll Be Asked:**

1. **Project Information**
   - Name
   - Type (from list or custom)
   - Description

2. **Language Configuration**
   - User language (outputs)
   - Think language (internal reasoning)

3. **Directory Paths**
   - Base directory (default: "claude")
   - Codebase path

4. **System Information**
   - OS detection
   - Package manager selection
   - Sudo configuration

5. **Objectives** (can add multiple)
   ```
   ? Add an objective:
   ? Memory check strategy:
   ? Memory update strategy:
   ? Add another objective? (y/N)
   ```

6. **Assumptions** (can add multiple)
   ```
   ? Add an assumption:
   ? Add another assumption? (y/N)
   ```

7. **Domain Terms** (optional, can add multiple)
   ```
   ? Add domain-specific term:
   ? Add another term? (y/N)
   ```

**When to Use:**
- Complex projects with specific requirements
- When you need custom objectives and assumptions
- Projects with domain-specific terminology
- Advanced users who want full control

---

## Quick Reference

### Installation Commands

```bash
# Quick mode (fully automated)
pnpm dlx github:dt-activenetwork/claude-memory-init init --quick

# Simple mode (recommended)
pnpm dlx github:dt-activenetwork/claude-memory-init init --simple

# Interactive mode (full options)
pnpm dlx github:dt-activenetwork/claude-memory-init init --interactive

# From existing config file
pnpm dlx github:dt-activenetwork/claude-memory-init init --config ./claude/config.yaml

# Force re-initialization
pnpm dlx github:dt-activenetwork/claude-memory-init init --simple --force
```

### Decision Tree

```
Do you need custom objectives/assumptions?
│
├─ Yes → Use --interactive
│
└─ No
   │
   └─ Do you want to customize project description?
      │
      ├─ Yes → Use --simple (recommended)
      │
      └─ No → Use --quick
```

### Time Comparison

- **Quick**: ~2 seconds (0 prompts)
- **Simple**: ~1 minute (3-4 prompts)
- **Interactive**: ~3-5 minutes (10+ prompts)

---

## Common Options

All modes support these additional flags:

### `--force`

Force re-initialization of already initialized projects.

```bash
# Re-initialize with simple mode
pnpm dlx github:dt-activenetwork/claude-memory-init init --simple --force
```

⚠️ **Warning**: This will overwrite existing configuration and memory files.

### `--target <path>`

Specify target directory (default: current directory).

```bash
# Initialize a different directory
pnpm dlx github:dt-activenetwork/claude-memory-init init --simple --target /path/to/project
```

---

## Examples

### Example 1: Quick Setup for Testing

```bash
cd /tmp/test-project
pnpm dlx github:dt-activenetwork/claude-memory-init init --quick
# ✅ Done in 2 seconds
```

### Example 2: Normal Project Setup

```bash
cd ~/projects/my-api
pnpm dlx github:dt-activenetwork/claude-memory-init init --simple

# Prompts:
# ? Project name: my-api
# ? Project description: REST API for user management
# ? User language: English
# ? Package manager: apt
#
# ✅ Initialization complete!
```

### Example 3: Complex Project with Custom Settings

```bash
cd ~/projects/enterprise-app
pnpm dlx github:dt-activenetwork/claude-memory-init init --interactive

# Extensive prompts for:
# - Project details
# - Multiple objectives
# - Multiple assumptions
# - Domain terminology
#
# Takes ~5 minutes but fully customized
```

### Example 4: CI/CD Pipeline

```yaml
# .github/workflows/init-claude-memory.yml
name: Initialize Claude Memory
on: [push]
jobs:
  init:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: pnpm dlx github:dt-activenetwork/claude-memory-init init --quick
```

---

## After Initialization

Regardless of which mode you use, you can always:

1. **View Configuration**
   ```bash
   claude-memory-init show
   ```

2. **Add Objectives**
   ```bash
   claude-memory-init add-objective "Document the API endpoints"
   ```

3. **Add Assumptions**
   ```bash
   claude-memory-init add-assumption "Uses microservices architecture"
   ```

4. **Edit Configuration**
   ```bash
   claude-memory-init edit
   ```

5. **Manage Configuration**
   ```bash
   # Set specific value
   claude-memory-init set language.user_language Chinese

   # Remove objective
   claude-memory-init remove-objective 0
   ```

---

## Recommendation

**For most users, we recommend `--simple` mode:**

✅ Fast enough (1 minute)
✅ Asks only essential questions
✅ Provides good defaults
✅ Easy to modify later

Only use `--quick` for automation/testing or `--interactive` for complex projects requiring extensive customization.

---

## Related Documentation

- [QUICKSTART.md](../QUICKSTART.md) - Getting started guide
- [SYSTEM_DETECTION.md](./SYSTEM_DETECTION.md) - System detection details
- [COMMAND_REFERENCE.md](../COMMAND_REFERENCE.md) - All CLI commands
- [README.md](../README.md) - Main documentation
