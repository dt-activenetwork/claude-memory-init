/**
 * Template engine for rendering Claude memory system templates
 */
import { readFile } from '../utils/file-ops.js';
import { getCurrentDate } from '../utils/date-utils.js';
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
