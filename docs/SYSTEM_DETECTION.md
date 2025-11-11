# System Detection Feature

## Overview

The Claude Memory System Initializer now automatically detects and configures system-specific information during initialization. This enables Claude to provide accurate package installation recommendations based on the user's operating system and package manager.

## Features

### 1. Operating System Detection

**Supported OS Types:**
- **Linux**: Detects specific distribution (Ubuntu, Arch, Fedora, etc.) by reading `/etc/os-release`
- **Windows**: Detects Windows version and checks for MSYS2 environment
- **macOS**: Detects macOS version using `sw_vers`

**Detection Details:**
- OS type (linux/windows/darwin)
- OS name (e.g., "Ubuntu 22.04", "EndeavourOS", "Windows 10")
- OS version
- MSYS2 environment detection (Windows only)

### 2. Package Manager Detection

**Automatically Detects:**

**Linux:**
- Debian/Ubuntu: `apt`, `apt-get`
- Arch Linux: `pacman`, `paru`, `yay`
- Fedora/RHEL: `dnf`, `yum`
- SUSE: `zypper`
- Alpine: `apk`
- Gentoo: `emerge`
- Nix: `nix-env`

**macOS:**
- Homebrew: `brew`
- MacPorts: `port`

**Windows:**
- Chocolatey: `choco`
- Scoop: `scoop`
- Winget: `winget`
- MSYS2: `pacman`

### 3. Smart Package Manager Selection

**Single Package Manager:**
- Automatically selected

**Multiple Package Managers:**
- Interactive prompt asks user to choose (interactive mode)
- Priority-based auto-selection (quick mode)
- Example: If both `pacman` and `paru` detected → user chooses preferred AUR helper

**Priority Order:**
- Linux: `apt` > `dnf` > `pacman` > `paru` > `yay` > `zypper` > `apk` > `emerge` > `yum` > `apt-get`
- macOS: `brew` > `port`
- Windows: `winget` > `choco` > `scoop` > `pacman` (MSYS2)

### 4. User Privilege Detection

**Detects:**
- Root/Administrator status
- Sudo availability (Unix-like systems)
- Sets appropriate install prefix (`sudo` or empty)

**Smart Sudo Handling:**
- Asks user confirmation for sudo usage in interactive mode
- AUR helpers (`paru`, `yay`) automatically set to not use sudo
- Other package managers default to sudo if available and not root

### 5. Install Command Generation

Automatically generates correct install command examples based on:
- Selected package manager
- User privileges
- OS requirements

**Examples:**
```bash
# Linux with sudo
sudo apt install <package>

# Arch with AUR helper (no sudo)
paru -S <package>

# macOS with Homebrew
brew install <package>

# Windows with Chocolatey
choco install <package>
```

## Configuration

### Config Structure

```yaml
system:
  os_type: linux
  os_name: EndeavourOS
  os_version: ""
  is_msys2: false
  package_manager: pacman
  is_root: false
  has_sudo: true
  install_prefix: sudo
```

### CLAUDE.md Template Variables

```markdown
{{OS_TYPE}}                    # 'linux', 'windows', 'darwin'
{{OS_NAME}}                    # Full OS name
{{OS_VERSION}}                 # OS version
{{PACKAGE_MANAGER}}            # Selected package manager
{{USER_PRIVILEGES}}            # Description of user privileges
{{INSTALL_PREFIX}}             # 'sudo' or ''
{{INSTALL_COMMAND_EXAMPLE}}    # Full install command example
{{IS_ROOT}}                    # 'true' or 'false'
{{HAS_SUDO}}                   # 'true' or 'false'
{{IS_MSYS2}}                   # 'true' or 'false'
```

## Usage

### Quick Mode (Non-Interactive)

```bash
cd my-project
pnpm dlx github:dt-activenetwork/claude-memory-init init --quick
```

**Behavior:**
- Auto-detects system information
- Selects package manager based on priority
- Uses default sudo settings

### Interactive Mode

```bash
cd my-project
pnpm dlx github:dt-activenetwork/claude-memory-init init --interactive
```

**Behavior:**
- Shows detected OS and package managers
- Prompts user to select package manager (if multiple)
- Asks about sudo usage (if applicable)
- Displays example install command

**Example Interaction:**
```
🖥️  System Information:
  OS: EndeavourOS (linux)
  Version:
  User: regular user
  Sudo: available

📦 Multiple package managers detected:
  - pacman
  - paru
  - yay

? Select package manager to use: (Use arrow keys)
❯ pacman
  paru
  yay

? Use 'sudo' for package installation with pacman? (Y/n) Yes

💡 Example install command:
  sudo pacman -S <package>
```

### From Config File

```bash
# Load existing config (auto-detects system if missing)
pnpm dlx github:dt-activenetwork/claude-memory-init init --config ./claude/config.yaml
```

**Backward Compatibility:**
- Existing configs without `system` field are automatically updated
- System detection runs transparently
- Config file is saved with detected system info

## Implementation Details

### Key Files

**src/utils/system-detector.ts:**
- `detectOS()` - OS type and details
- `detectPackageManagers()` - Available package managers
- `checkRootPrivileges()` - Root/admin detection
- `checkSudoAvailability()` - Sudo detection
- `generateInstallCommand()` - Command generation
- `detectSystemInfo()` - Main detection function

**src/prompts/system-info.ts:**
- `promptSystemInfo()` - Interactive system detection
- `getSystemInfoQuick()` - Non-interactive detection

**src/types/config.ts:**
- `SystemConfig` interface

**src/core/template-engine.ts:**
- Template variable rendering for system info

**src/core/config-loader.ts:**
- Backward compatibility support
- Auto-detection for missing system config

## Testing

### Run Test Script

```bash
cd /home/dai/code/claude-memory-init
chmod +x test-system-detection.sh
./test-system-detection.sh
```

### Manual Testing

**Test on Different OS:**
1. Linux (various distros)
2. Windows (with/without MSYS2)
3. macOS

**Test Package Manager Selection:**
1. Single package manager (auto-select)
2. Multiple from same family (e.g., pacman/paru/yay) → user chooses
3. Multiple from different families → user chooses

**Test Privilege Detection:**
1. As root user
2. As regular user with sudo
3. As regular user without sudo

## Benefits for AI Agent

### Accurate Recommendations

The AI Agent in Claude sessions can now:

1. **Use Correct Package Manager**
   - Recommends `apt` on Ubuntu, not `pacman`
   - Recommends `brew` on macOS, not `apt`

2. **Include Proper Sudo Prefix**
   - Knows when to suggest `sudo apt install`
   - Knows when NOT to suggest `sudo` (e.g., with `paru`)

3. **OS-Specific Package Names**
   - Can reference correct package names for detected OS
   - Understands distribution-specific differences

4. **Consistent Commands**
   - All package installation suggestions use same package manager
   - Reduces confusion for users

### Example Claude Behavior

**Before (Generic):**
```
User: "How do I install Node.js?"
Claude: "You can install Node.js using:
  apt install nodejs  # Ubuntu/Debian
  pacman -S nodejs    # Arch
  brew install node   # macOS
  ..."
```

**After (System-Aware):**
```
User: "How do I install Node.js?"
Claude: "Based on your system (EndeavourOS with pacman), install Node.js with:
  sudo pacman -S nodejs

This command uses your configured package manager (pacman) with sudo prefix."
```

## Future Enhancements

1. **Package Name Translation**
   - Map generic package names to OS-specific names
   - Example: `nodejs` (Arch) vs `node` (Homebrew)

2. **Version Detection**
   - Detect package manager version
   - Adjust commands for version-specific syntax

3. **Custom Package Repositories**
   - Detect AUR access (Arch)
   - Detect PPA usage (Ubuntu)
   - Detect Homebrew taps (macOS)

4. **Container Detection**
   - Detect if running in Docker
   - Detect if running in WSL
   - Adjust recommendations accordingly

5. **CI/CD Environment Detection**
   - Detect GitHub Actions
   - Detect GitLab CI
   - Adjust for non-interactive environments

## Troubleshooting

### Issue: Package Manager Not Detected

**Cause:** Package manager not in PATH or not installed

**Solution:**
1. Install package manager
2. Add to PATH
3. Re-run initialization with `--force`

### Issue: Wrong Package Manager Selected

**Cause:** Priority-based auto-selection in quick mode

**Solution:**
1. Use interactive mode: `init --interactive`
2. Manually select preferred package manager
3. Or edit `claude/config.yaml` and change `system.package_manager`

### Issue: Sudo Not Detected

**Cause:** Sudo not installed or not in PATH

**Solution:**
1. Install sudo: `su -c 'apt install sudo'` (or equivalent)
2. Add user to sudo group
3. Re-run initialization

### Issue: MSYS2 Not Detected on Windows

**Cause:** Not running in MSYS2 shell

**Solution:**
1. Run tool from MSYS2 terminal (MINGW64, MSYS, etc.)
2. Check `$MSYSTEM` environment variable is set

## Version History

**Version 1.1.0 (2025-01-11)**
- Initial implementation of system detection feature
- OS detection (Linux/Windows/macOS)
- Package manager detection and selection
- User privilege detection (root/sudo)
- Install command generation
- CLAUDE.md template integration
- Backward compatibility support

## Related Documentation

- [README.md](../README.md) - Main project documentation
- [QUICKSTART.md](../QUICKSTART.md) - Getting started guide
- [COMMAND_REFERENCE.md](../COMMAND_REFERENCE.md) - CLI commands
- [CLAUDE.md Template](../mem/CLAUDE.md.template) - Template with system variables
