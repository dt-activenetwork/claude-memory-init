## TOON Format

All config files use **TOON** (Token-Oriented Object Notation) format.

**Key Points**:
- 30-60% fewer tokens than JSON
- Human-readable (similar to YAML)
- Claude understands natively (no parsing needed)

**Quick Syntax**:
```toon
# Simple values
name: value
count: 42

# Nested (indentation)
parent:
  child: value

# Arrays
tags[3]: tag1,tag2,tag3

# Multi-line
description: |
  Line 1
  Line 2
```

**Usage**: Just read `.toon` files directly. Claude understands them automatically.

**Reference**: See `.agent/memory/system/tools/toon-format-quick-ref.md` for complete syntax.
