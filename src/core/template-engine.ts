/**
 * Template engine for rendering Claude memory system templates
 */
import { readFile } from '../utils/file-ops.js';
import { getCurrentDate } from '../utils/date-utils.js';
import {
  generateInstallCommand,
  generatePythonVenvCommand,
  generatePythonInstallCommand,
  generateNodeInstallCommand,
  generateNodeRunCommand
} from '../utils/system-detector.js';
import type { FullConfig, Objective } from '../types/config.js';

/**
 * Load template from file
 */
export async function loadTemplate(templatePath: string): Promise<string> {
  return await readFile(templatePath);
}

/**
 * Render template with configuration values
 */
export function renderTemplate(template: string, config: FullConfig): string {
  let result = template;

  // Simple variable replacements
  const simpleVars: Record<string, string> = {
    '{{PROJECT_NAME}}': config.project.name,
    '{{PROJECT_TYPE}}': config.project.type,
    '{{PROJECT_DESCRIPTION}}': config.project.description,
    '{{USER_LANGUAGE}}': config.language.user_language,
    '{{THINK_LANGUAGE}}': config.language.think_language,
    '{{BASE_DIR}}': config.paths.base_dir,
    '{{CODEBASE}}': config.paths.codebase,
    '{{LAST_UPDATED}}': getCurrentDate(),
  };

  // System configuration variables
  if (config.system) {
    simpleVars['{{OS_TYPE}}'] = config.system.os_type;
    simpleVars['{{OS_NAME}}'] = config.system.os_name;
    simpleVars['{{OS_VERSION}}'] = config.system.os_version;
    simpleVars['{{PACKAGE_MANAGER}}'] = config.system.package_manager;
    simpleVars['{{IS_ROOT}}'] = String(config.system.is_root);
    simpleVars['{{HAS_SUDO}}'] = String(config.system.has_sudo);
    simpleVars['{{INSTALL_PREFIX}}'] = config.system.install_prefix;
    simpleVars['{{IS_MSYS2}}'] = String(config.system.is_msys2);

    // User privileges description
    const userPrivileges = config.system.is_root
      ? 'root/administrator'
      : config.system.has_sudo
        ? 'regular user with sudo access'
        : 'regular user without sudo access';
    simpleVars['{{USER_PRIVILEGES}}'] = userPrivileges;

    // Install command example
    const installCommand = generateInstallCommand(config.system.package_manager, config.system.install_prefix);
    simpleVars['{{INSTALL_COMMAND_EXAMPLE}}'] = installCommand;

    // Development tools variables
    if (config.system.dev_tools) {
      // Python variables
      if (config.system.dev_tools.python) {
        const py = config.system.dev_tools.python;
        simpleVars['{{PYTHON_AVAILABLE}}'] = 'true';
        simpleVars['{{PYTHON_VERSION}}'] = py.version;
        simpleVars['{{PYTHON_PATH}}'] = py.path;
        simpleVars['{{PYTHON_PACKAGE_MANAGER}}'] = py.package_manager;
        simpleVars['{{PYTHON_HAS_UV}}'] = py.has_uv ? 'true' : 'false';
        simpleVars['{{PYTHON_HAS_VENV}}'] = py.has_venv ? 'true' : 'false';
        simpleVars['{{PYTHON_VENV_COMMAND}}'] = generatePythonVenvCommand(py);
        simpleVars['{{PYTHON_INSTALL_COMMAND}}'] = generatePythonInstallCommand(py);

        // Guidance text
        const venvGuidance = py.has_uv
          ? 'Use `uv` for fast virtual environment creation and package management'
          : py.has_venv
            ? 'Use `python -m venv` for virtual environment creation'
            : 'Use `pip` for package management';
        simpleVars['{{PYTHON_VENV_GUIDANCE}}'] = venvGuidance;
      } else {
        simpleVars['{{PYTHON_AVAILABLE}}'] = 'false';
        simpleVars['{{PYTHON_VERSION}}'] = 'not installed';
        simpleVars['{{PYTHON_PATH}}'] = 'N/A';
        simpleVars['{{PYTHON_PACKAGE_MANAGER}}'] = 'N/A';
        simpleVars['{{PYTHON_HAS_UV}}'] = 'false';
        simpleVars['{{PYTHON_HAS_VENV}}'] = 'false';
        simpleVars['{{PYTHON_VENV_COMMAND}}'] = 'N/A';
        simpleVars['{{PYTHON_INSTALL_COMMAND}}'] = 'N/A';
        simpleVars['{{PYTHON_VENV_GUIDANCE}}'] = 'Python is not available';
      }

      // Node.js variables
      if (config.system.dev_tools.node) {
        const node = config.system.dev_tools.node;
        simpleVars['{{NODE_AVAILABLE}}'] = 'true';
        simpleVars['{{NODE_VERSION}}'] = node.version;
        simpleVars['{{NODE_PATH}}'] = node.path;
        simpleVars['{{NODE_PACKAGE_MANAGER}}'] = node.selected_package_manager;
        simpleVars['{{NODE_INSTALL_COMMAND}}'] = generateNodeInstallCommand(node.selected_package_manager);
        simpleVars['{{NODE_RUN_COMMAND}}'] = generateNodeRunCommand(node.selected_package_manager);
      } else {
        simpleVars['{{NODE_AVAILABLE}}'] = 'false';
        simpleVars['{{NODE_VERSION}}'] = 'not installed';
        simpleVars['{{NODE_PATH}}'] = 'N/A';
        simpleVars['{{NODE_PACKAGE_MANAGER}}'] = 'N/A';
        simpleVars['{{NODE_INSTALL_COMMAND}}'] = 'N/A';
        simpleVars['{{NODE_RUN_COMMAND}}'] = 'N/A';
      }

      // Generate DEV_TOOLS_SECTION
      simpleVars['{{DEV_TOOLS_SECTION}}'] = renderDevToolsSection(config.system.dev_tools);
    } else {
      // No dev tools detected
      simpleVars['{{DEV_TOOLS_SECTION}}'] = '**No development tools detected.**\n\nPython and Node.js are not available in this environment.';
      simpleVars['{{PYTHON_AVAILABLE}}'] = 'false';
      simpleVars['{{NODE_AVAILABLE}}'] = 'false';
      simpleVars['{{PYTHON_PACKAGE_MANAGER}}'] = 'N/A';
      simpleVars['{{NODE_PACKAGE_MANAGER}}'] = 'N/A';
      simpleVars['{{PYTHON_VERSION}}'] = 'N/A';
      simpleVars['{{NODE_VERSION}}'] = 'N/A';
      simpleVars['{{PYTHON_VENV_GUIDANCE}}'] = 'N/A';
      simpleVars['{{NODE_RUN_COMMAND}}'] = 'N/A';
    }
  }

  // Replace simple variables
  for (const [key, value] of Object.entries(simpleVars)) {
    result = result.replaceAll(key, value);
  }

  // Complex variable: OBJECTIVES
  if (result.includes('{{OBJECTIVES}}')) {
    const objectivesMarkdown = renderObjectives(config.objectives);
    result = result.replaceAll('{{OBJECTIVES}}', objectivesMarkdown);
  }

  // Complex variable: ASSUMPTIONS (also PROJECT_ASSUMPTIONS)
  if (result.includes('{{ASSUMPTIONS}}') || result.includes('{{PROJECT_ASSUMPTIONS}}')) {
    const assumptionsMarkdown = renderAssumptions(config.assumptions);
    result = result.replaceAll('{{ASSUMPTIONS}}', assumptionsMarkdown);
    result = result.replaceAll('{{PROJECT_ASSUMPTIONS}}', assumptionsMarkdown);
  }

  // Complex variable: DOMAIN_TERMS
  if (result.includes('{{DOMAIN_TERMS}}') && config.domain?.terms) {
    const termsMarkdown = renderList(config.domain.terms);
    result = result.replaceAll('{{DOMAIN_TERMS}}', termsMarkdown);
  }

  // Complex variable: DOMAIN_EVIDENCE (also DOMAIN_SPECIFIC_EVIDENCE)
  if ((result.includes('{{DOMAIN_EVIDENCE}}') || result.includes('{{DOMAIN_SPECIFIC_EVIDENCE}}')) && config.domain?.evidence) {
    const evidenceMarkdown = renderList(config.domain.evidence);
    result = result.replaceAll('{{DOMAIN_EVIDENCE}}', evidenceMarkdown);
    result = result.replaceAll('{{DOMAIN_SPECIFIC_EVIDENCE}}', evidenceMarkdown);
  }

  // Complex variable: EXTERNAL_SOURCES (also EXTERNAL_KNOWLEDGE_SOURCES)
  if ((result.includes('{{EXTERNAL_SOURCES}}') || result.includes('{{EXTERNAL_KNOWLEDGE_SOURCES}}')) && config.domain?.external_sources) {
    const sourcesMarkdown = renderList(config.domain.external_sources);
    result = result.replaceAll('{{EXTERNAL_SOURCES}}', sourcesMarkdown);
    result = result.replaceAll('{{EXTERNAL_KNOWLEDGE_SOURCES}}', sourcesMarkdown);
  }

  // Task configuration variables
  if (config.tasks) {
    result = result.replaceAll('{{USE_TASK_SPECIFIC_INDEXES}}', String(config.tasks.use_task_specific_indexes));
    result = result.replaceAll('{{USE_INCREMENTAL_WORK}}', String(config.tasks.use_incremental_work));
    result = result.replaceAll('{{MAX_CONTEXT_PER_STEP}}', String(config.tasks.max_context_per_step));
    result = result.replaceAll('{{MAX_TASK_CONTEXT}}', String(config.tasks.max_task_context));
    result = result.replaceAll('{{HYGIENE_CYCLE_FREQUENCY}}', String(config.tasks.hygiene_cycle_frequency));
  }

  // Output configuration variables
  if (config.output) {
    result = result.replaceAll('{{OUTPUT_FORMAT}}', config.output.format);
    result = result.replaceAll('{{INCLUDE_DIAGRAMS}}', String(config.output.include_diagrams));
    result = result.replaceAll('{{CODE_REFERENCE_FORMAT}}', config.output.code_reference_format);
    if (config.output.diagram_types) {
      result = result.replaceAll('{{DIAGRAM_TYPES}}', renderList(config.output.diagram_types));
    }
  }

  // Git configuration variables
  if (config.git) {
    result = result.replaceAll('{{AI_GIT_OPERATIONS}}', String(config.git.ai_git_operations));
    if (config.git.ignore_patterns) {
      result = result.replaceAll('{{GIT_IGNORE_PATTERNS}}', renderList(config.git.ignore_patterns));
    }
  }

  // Advanced configuration variables
  if (config.advanced) {
    result = result.replaceAll('{{MAX_TAGS}}', String(config.advanced.max_tags));
    result = result.replaceAll('{{MAX_TOPICS}}', String(config.advanced.max_topics));
    result = result.replaceAll('{{MAX_CROSS_REFS}}', String(config.advanced.max_cross_refs));
    result = result.replaceAll('{{TARGET_CONTEXT_REDUCTION}}', String(config.advanced.target_context_reduction));
    result = result.replaceAll('{{TARGET_INDEX_LOOKUP_TIME}}', String(config.advanced.target_index_lookup_time));
  }

  return result;
}

/**
 * Render objectives as Markdown list
 */
export function renderObjectives(objectives: Objective[]): string {
  return objectives.map((obj, index) => {
    return `${index + 1}. **${obj.objective}**
   - ⚠️ **Memory check required**: ${obj.memory_check}
   - ⚠️ **Memory update required**: ${obj.memory_update}`;
  }).join('\n\n');
}

/**
 * Render assumptions as Markdown list
 */
export function renderAssumptions(assumptions: string[]): string {
  return renderList(assumptions);
}

/**
 * Render a simple list as Markdown
 */
export function renderList(items: string[]): string {
  return items.map(item => `- ${item}`).join('\n');
}

/**
 * Load and render template in one step
 */
export async function loadAndRenderTemplate(templatePath: string, config: FullConfig): Promise<string> {
  const template = await loadTemplate(templatePath);
  return renderTemplate(template, config);
}

/**
 * Render development tools section
 */
function renderDevToolsSection(devTools: import('../types/config.js').DevelopmentTools): string {
  const sections: string[] = [];

  // Python section
  if (devTools.python) {
    const py = devTools.python;
    const venvCommand = generatePythonVenvCommand(py);
    const installCommand = generatePythonInstallCommand(py);

    sections.push(`### Python Environment

**Status**: ✅ Available
**Version**: ${py.version}
**Path**: \`${py.path}\`
**Package Manager**: ${py.package_manager}${py.has_uv ? ' (with uv - recommended)' : ''}

**Virtual Environment Creation:**
\`\`\`bash
${venvCommand}
source venv/bin/activate  # Linux/macOS
# or
venv\\Scripts\\activate  # Windows
\`\`\`

**Package Installation:**
\`\`\`bash
${installCommand}
\`\`\`

**Features:**
${py.has_uv ? '- ✅ `uv` available - Fast Python package installer and resolver' : ''}
${py.has_venv ? '- ✅ `venv` available - Standard virtual environment support' : ''}
- ✅ \`pip\` available - Python package installer`);
  } else {
    sections.push(`### Python Environment

**Status**: ❌ Not Available

Python is not installed or not found in PATH. To use Python development features:
1. Install Python from python.org or your package manager
2. Optionally install \`uv\` for faster package management: \`pip install uv\`
3. Re-run initialization to detect Python`);
  }

  // Node.js section
  if (devTools.node) {
    const node = devTools.node;
    const installCommand = generateNodeInstallCommand(node.selected_package_manager);
    const runCommand = generateNodeRunCommand(node.selected_package_manager, 'dev');

    const pmList = node.package_managers.length > 0
      ? node.package_managers.map(pm => `  - ${pm}${pm === node.selected_package_manager ? ' ⭐ (selected)' : ''}`).join('\n')
      : '  - None detected';

    sections.push(`### Node.js Environment

**Status**: ✅ Available
**Version**: ${node.version}
**Path**: \`${node.path}\`
**Package Manager**: ${node.selected_package_manager}

**Available Package Managers:**
${pmList}

**Package Installation:**
\`\`\`bash
${installCommand}
\`\`\`

**Run Scripts:**
\`\`\`bash
${runCommand}
\`\`\`

**Usage Note**: Always use \`${node.selected_package_manager}\` for package management in this project for consistency.`);
  } else {
    sections.push(`### Node.js Environment

**Status**: ❌ Not Available

Node.js is not installed or not found in PATH. To use Node.js development features:
1. Install Node.js from nodejs.org or your package manager
2. Optionally install \`pnpm\` for better package management: \`npm install -g pnpm\`
3. Re-run initialization to detect Node.js`);
  }

  return sections.join('\n\n');
}
