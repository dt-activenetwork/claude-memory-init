## Reading Strategy: Full Context Utilization

**IMPORTANT**: This project has ample token budget. DO NOT conservatively limit file reading.

### File Reading Guidelines

**❌ DON'T do this**:
```
Read file.ts (limit: 100 lines)  # Only reading partial file
Read file.ts (offset: 0, limit: 50)  # Skipping content
```

**✅ DO this instead**:
```
Read file.ts  # Read ENTIRE file, no limit
Read all related files completely
```

### Core Principle

**We have abundant tokens. USE THEM.**

- ✅ Read files **completely** (no offset, no limit parameters)
- ✅ Read **all relevant files** when analyzing a feature
- ✅ Don't skip sections "to save tokens"
- ✅ Full context leads to better understanding and fewer errors

### When Analyzing Code

**Complete Analysis Pattern**:

1. **Read all related files** (not just the main file)
   ```
   Analyzing authentication?
   → Read auth service
   → Read auth middleware
   → Read auth tests
   → Read auth configuration
   ```

2. **Read entire files** (no partial reads)
   ```
   ✅ Read src/services/auth.ts (complete)
   ❌ Read src/services/auth.ts (first 100 lines only)
   ```

3. **Multi-file understanding**
   ```
   Understanding a feature often requires:
   - Implementation files (complete)
   - Test files (complete)
   - Configuration files (complete)
   - Documentation (complete)
   ```

### Benefits of Full Context

- ✅ **Fewer errors**: Don't miss important details at line 500
- ✅ **Better understanding**: See the complete picture
- ✅ **Accurate answers**: Based on full information, not partial
- ✅ **Faster overall**: No need for follow-up reads

### Token Budget

**Available**: Large context window (1M+ tokens)
**File reading cost**: ~1 token per 4 characters
**Average file**: 500 lines ≈ 2000 tokens

**Math**: Even reading 100 complete files = ~200K tokens (only 20% of budget)

### When to Read Completely

**Always read completely when**:
- User asks to analyze/understand code
- Implementing new features (need full context)
- Debugging issues (need complete flow)
- Reviewing changes (need surrounding context)

**Exception (rare)**:
- Extremely large files (>5000 lines): May read in sections
- Binary/generated files: Skip or sample
- But for normal source code: **ALWAYS READ COMPLETELY**

### Practical Examples

**Scenario 1: "Analyze the authentication module"**
```
✅ Correct approach:
1. Read src/services/auth.ts (complete)
2. Read src/middleware/auth.ts (complete)
3. Read src/routes/auth.ts (complete)
4. Read tests/auth.test.ts (complete)
5. Analyze based on FULL understanding

❌ Wrong approach:
1. Read src/services/auth.ts (first 100 lines)
2. Make assumptions about the rest
3. Provide incomplete analysis
```

**Scenario 2: "Fix this bug"**
```
✅ Correct:
- Read the buggy file completely
- Read imported dependencies completely
- Read tests completely
- Understand the FULL context before suggesting fix

❌ Wrong:
- Read only the error line
- Guess the context
- Provide fix that might break other parts
```

### Summary

**Key Message**: We have plenty of tokens. Be thorough, not conservative.

- Read complete files
- Read all relevant files
- Full context = better work
- Don't optimize for tokens at the cost of quality
