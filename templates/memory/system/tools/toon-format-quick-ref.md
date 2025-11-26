# TOON Format Quick Reference

**Purpose**: Token-efficient data format for AI agents (30-60% fewer tokens than JSON)

**Official Spec**: https://github.com/toon-format/spec

---

## Core Syntax

```toon
# Single values
name: value
count: 42
flag: true

# Nested objects
parent:
  child: value
  nested:
    deep: value

# Arrays (inline)
tags[3]: tag1,tag2,tag3

# Arrays (tabular for objects)
users{name,age,role}:
  - alice,30,admin
  - bob,25,user

# Multi-line strings
description: |
  First line
  Second line
```

---

## Why TOON?

- **Fewer tokens**: 30-60% reduction vs JSON
- **More readable**: YAML-like indentation
- **Schema-aware**: Explicit array lengths `[N]` and table headers `{fields}`
- **Native support**: Claude understands TOON natively

---

## Usage in This Project

**Read TOON files**:
```bash
# AI can read TOON files directly
Read .agent/config.toon
Read .agent/system/info.toon
Read .agent/memory/index/tags.toon
```

**No parsing needed**: Claude natively understands TOON structure.

---

**Key Point**: You don't need to "parse" TOON - just read the file and Claude will understand it naturally, like reading YAML or JSON.
