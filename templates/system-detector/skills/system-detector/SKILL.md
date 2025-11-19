---
name: system-detector
description: Detect current OS, runtime environments (Python, Node.js), timezone, and locale. Use when needing fresh system information or at session start.
---

# System Detector

## Quick Start

Get complete system information:

```bash
node .agent/scripts/detect-system.js
```

Output: TOON format with OS, runtimes, environment, timestamp.

## Component Scripts

Detect specific information:

```bash
node .agent/scripts/detect-os.js        # OS only
node .agent/scripts/detect-python.js    # Python only
node .agent/scripts/detect-node.js      # Node.js only
node .agent/scripts/detect-env.js       # Timezone/locale only
```

## Output Format

TOON format example:

```toon
system:
  os:
    type: linux
    name: EndeavourOS
    version: ""
  runtimes[2]{name,version,package_manager}:
    python,3.13.7,pip
    node,20.19.5,pnpm
  environment:
    timezone: Asia/Shanghai
    locale: en-US
  detected_at: "2025-11-19T15:30:00Z"
```

## When to Run

Run detection:
- At session start (when reading AGENT.md)
- When system environment may have changed
- Before making environment-specific decisions

## Usage Pattern

```bash
# Get fresh system info
SYSTEM_INFO=$(node .agent/scripts/detect-system.js)

# Parse and use (AI can process TOON format directly)
# Make environment-specific decisions based on output
```

Component scripts return partial TOON (just their section).
