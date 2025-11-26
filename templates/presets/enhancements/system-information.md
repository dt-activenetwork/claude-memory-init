## System Environment

**Operating System**: {{OS_NAME}}
{{#if OS_VERSION}}**Version**: {{OS_VERSION}}{{/if}}
**Package Manager**: {{OS_PACKAGE_MANAGER}}

{{#if PYTHON_AVAILABLE}}
### Python Environment

**Status**: ✅ Available
**Version**: {{PYTHON_VERSION}}
**Package Manager**: {{PYTHON_SELECTED_MANAGER}} (preferred)
{{#if PYTHON_OTHER_MANAGERS}}**Also Available**: {{PYTHON_OTHER_MANAGERS}}{{/if}}

**Installation**:
```bash
{{PYTHON_SELECTED_MANAGER}} install <package>
```
{{/if}}

{{#if NODE_AVAILABLE}}
### Node.js Environment

**Status**: ✅ Available
**Version**: {{NODE_VERSION}}
**Package Manager**: {{NODE_SELECTED_MANAGER}} (preferred)
{{#if NODE_OTHER_MANAGERS}}**Also Available**: {{NODE_OTHER_MANAGERS}}{{/if}}

**Installation**:
```bash
{{NODE_SELECTED_MANAGER}} add <package>
```
{{/if}}

**Locale**:
- Timezone: {{TIMEZONE}}
- Language: {{LANGUAGE}}
