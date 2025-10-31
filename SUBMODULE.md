# Git Submodule Management

This project uses git submodules to manage the `mem/` template directory. This document explains how the submodule system works and how to manage it.

## What is the mem/ Submodule?

The `mem/` directory contains the Claude Memory System template files. It's maintained as a separate git repository and included in this project as a git submodule.

## Automatic Initialization

When you run `pnpm install`, the postinstall script automatically checks and initializes the submodule if needed.

```bash
pnpm install
# Output: 🔧 Checking git submodules...
#         ✅ Submodules already initialized
```

## Manual Management

### Check Submodule Status

```bash
# Using CLI tool
claude-memory-init submodule --status

# Using npm/pnpm script
pnpm run submodule:init   # Same as: git submodule update --init --recursive
```

### Initialize Submodule

If the submodule is not initialized:

```bash
# Method 1: Using CLI tool
claude-memory-init submodule --init

# Method 2: Using npm/pnpm script
pnpm run submodule:init

# Method 3: Direct git command
git submodule update --init --recursive
```

### Update Submodule to Latest

To pull the latest changes from the mem/ template repository:

```bash
# Method 1: Using CLI tool
claude-memory-init submodule --update

# Method 2: Using npm/pnpm script
pnpm run submodule:update

# Method 3: Direct git command
git submodule update --remote --merge
```

## How It Works

### For Developers (This Repository)

1. **Clone with submodules**:
   ```bash
   git clone --recurse-submodules https://github.com/yourusername/claude-memory-init.git
   ```

2. **If you already cloned without --recurse-submodules**:
   ```bash
   git submodule update --init --recursive
   # or
   pnpm install  # Will run postinstall script
   ```

3. **Update submodule to latest**:
   ```bash
   pnpm run submodule:update
   ```

### For Users (npm install)

When users install this package via npm/pnpm:

```bash
npm install -g @claude-memory/init
```

The `postinstall` script runs automatically and:
1. Checks if the installation is inside a git repository
2. Initializes the `mem/` submodule if it's missing
3. Ensures the template files are available

If the script fails (e.g., not a git repo), users can still use the tool normally because the package should be published with the submodule files included.

## Package Publishing

When publishing to npm, ensure the `mem/` directory is included:

1. The `package.json` has `"files": ["dist", "mem", ...]`
2. Before publishing, ensure submodule is up-to-date:
   ```bash
   pnpm run submodule:update
   pnpm run build
   npm publish
   ```

## Troubleshooting

### Problem: "Submodule is not initialized"

**Solution**:
```bash
pnpm run submodule:init
# or
git submodule update --init --recursive
```

### Problem: "mem/ directory is empty"

This happens if you cloned without `--recurse-submodules`.

**Solution**:
```bash
git submodule update --init --recursive
```

### Problem: "postinstall script failed"

This is usually not critical. The script tries to initialize submodules but won't fail the install if it can't.

**Manual fix**:
```bash
cd node_modules/@claude-memory/init
git submodule update --init --recursive
```

### Problem: "old submodule commit"

To update to the latest template:

**Solution**:
```bash
pnpm run submodule:update
# Commit the change
git add mem
git commit -m "Update mem submodule to latest"
```

## For Maintainers

### Updating the Submodule Reference

When the mem/ template repository has new changes:

1. Update submodule to latest:
   ```bash
   pnpm run submodule:update
   ```

2. Review changes:
   ```bash
   cd mem
   git log
   cd ..
   ```

3. Commit the updated reference:
   ```bash
   git add mem
   git commit -m "Update mem template to version X.Y.Z"
   git push
   ```

### Adding the Submodule (First Time)

If you need to add the submodule initially:

```bash
git submodule add https://github.com/yourusername/claude-memory.git mem
git commit -m "Add mem submodule"
```

### Removing the Submodule

To remove the submodule (not recommended):

```bash
git submodule deinit -f mem
git rm -f mem
rm -rf .git/modules/mem
git commit -m "Remove mem submodule"
```

## Scripts Reference

### npm/pnpm Scripts

- `postinstall` - Automatically runs after install to check submodules
- `submodule:init` - Initialize submodules
- `submodule:update` - Update submodules to latest

### CLI Commands

- `claude-memory-init submodule --status` - Check if submodule is initialized
- `claude-memory-init submodule --init` - Initialize submodule
- `claude-memory-init submodule --update` - Update submodule to latest

## CI/CD Integration

For GitHub Actions or other CI systems:

```yaml
- name: Checkout with submodules
  uses: actions/checkout@v3
  with:
    submodules: recursive

# Or if already checked out:
- name: Initialize submodules
  run: git submodule update --init --recursive
```

## References

- [Git Submodules Documentation](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [simple-git npm package](https://www.npmjs.com/package/simple-git)
