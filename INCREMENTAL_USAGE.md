# Incremental Configuration Management

This guide shows how to use `claude-memory-init` in an incremental way - start simple and add details as you learn about your project.

## Philosophy

You don't need to know everything about your project upfront. The CLI supports adding and modifying configuration as you go.

## Quick Start Workflow

### 1. Initialize with Minimal Config

```bash
cd your-project
claude-memory-init init --quick
```

This creates:
- `claude/` directory structure
- `claude/config.yaml` with sensible defaults
- `CLAUDE.md` prompt file

### 2. View Current Configuration

```bash
claude-memory-init show
```

Output:
```
📋 Current Configuration

Project: your-project (Multi-language Repository)
Description: Code analysis and documentation project

🎯 Objectives:
  0. Analyze and document the codebase architecture

📝 Assumptions:
  0. The codebase structure will be analyzed incrementally

🌐 Language:
  User: English
  Think: English
```

### 3. Add Objectives as You Discover Them

As you work with Claude and discover what you need:

```bash
# Day 1: Exploring the codebase
claude-memory-init add-objective "Document API endpoints"

# Day 2: Found some bugs
claude-memory-init add-objective "Identify authentication issues"

# Week 2: Need to improve performance
claude-memory-init add-objective "Analyze performance bottlenecks"
```

With custom memory operations:

```bash
claude-memory-init add-objective "Fix security vulnerabilities" \
  --check "Search episodic notes for security findings" \
  --update "Create procedural notes for security fixes"
```

### 4. Add Assumptions as You Learn

```bash
# After discovering the tech stack
claude-memory-init add-assumption "Uses Express.js 4.x"
claude-memory-init add-assumption "PostgreSQL database"
claude-memory-init add-assumption "Deployed on AWS Lambda"

# Architecture insights
claude-memory-init add-assumption "Microservices architecture with 5 main services"
```

### 5. Update Settings

```bash
# Change output language
claude-memory-init set language.user_language Chinese

# Update project type
claude-memory-init set project.type "React SPA with Node.js backend"

# Update description
claude-memory-init set project.description "E-commerce platform with payment integration"
```

### 6. Remove Outdated Items

```bash
# First, see current state
claude-memory-init show

# Remove an objective (by index)
claude-memory-init remove-objective 2

# Remove an assumption (by index)
claude-memory-init remove-assumption 0
```

### 7. Quick Edit for Complex Changes

```bash
# Open in your default editor
claude-memory-init edit

# Or set a specific editor
EDITOR=code claude-memory-init edit  # VS Code
EDITOR=vim claude-memory-init edit   # Vim
```

## Real-World Example

### Week 1: Starting a New Project

```bash
# Just initialize
cd my-saas-app
claude-memory-init init --quick

# Start working with Claude...
```

### Week 2: After Some Exploration

```bash
# Add what you've learned
claude-memory-init add-assumption "Next.js 14 with App Router"
claude-memory-init add-assumption "Supabase for auth and database"
claude-memory-init add-objective "Document database schema"
claude-memory-init add-objective "Map authentication flow"
```

### Month 1: Project Clarity

```bash
# Refine the configuration
claude-memory-init set project.type "SaaS Application"
claude-memory-init set project.description "Multi-tenant SaaS platform with subscription billing"

claude-memory-init add-objective "Optimize payment webhook handling"
claude-memory-init add-assumption "Stripe for payment processing"
claude-memory-init add-assumption "Redis for session management"

# Check the full config
claude-memory-init show
```

### Month 2: Cleanup

```bash
# Remove completed or irrelevant objectives
claude-memory-init show  # See indexes
claude-memory-init remove-objective 0  # "Analyze and document the codebase architecture" - done!

# Fine-tune with editor
claude-memory-init edit
```

## Benefits of This Approach

1. **No Upfront Analysis Paralysis**: Start immediately without knowing everything
2. **Evolve Naturally**: Add details as you discover them
3. **Stay Current**: Remove outdated assumptions as the project changes
4. **Shared Context**: Team members can see and update project knowledge
5. **Better Memory System**: Claude gets better context over time

## Tips

- **Add objectives when you start new work**: Before asking Claude to implement a feature, add it as an objective
- **Update assumptions when you discover them**: Found a new dependency? Add it immediately
- **Use `show` frequently**: Keep track of what Claude knows about your project
- **Review monthly**: Clean up completed objectives and outdated assumptions
- **Use `edit` for bulk changes**: When you need to update multiple things at once

## Advanced Usage

### Scripting Configuration Updates

```bash
#!/bin/bash
# deploy-config.sh - Update config for deployment

claude-memory-init add-assumption "Production environment: AWS ECS"
claude-memory-init add-assumption "CDN: CloudFront"
claude-memory-init add-objective "Optimize Docker image size"
claude-memory-init set project.description "Production-ready SaaS platform"
```

### Project Templates

Save your config and reuse it:

```bash
# Export current config
cp claude/config.yaml ~/templates/saas-template.yaml

# Later, for a new project
claude-memory-init init --config ~/templates/saas-template.yaml
```

## See Also

- [README.md](./README.md) - Main documentation
- [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) - More usage examples
- [mem/config.example.yaml](./mem/config.example.yaml) - Full configuration reference
