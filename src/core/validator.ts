/**
 * Configuration and template validation
 */
import type { FullConfig, ValidationResult } from '../types/config.js';
import { dirExists, fileExists } from '../utils/file-ops.js';

/**
 * Validate full configuration
 */
export function validateConfig(config: FullConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  const missingFields = validateRequiredFields(config);
  errors.push(...missingFields);

  // Validate objectives
  if (config.objectives.length === 0) {
    errors.push('At least one objective is required');
  }

  // Validate assumptions
  if (config.assumptions.length === 0) {
    warnings.push('No assumptions specified - consider adding project assumptions');
  }

  // Check for sensible values
  if (config.tasks?.max_context_per_step && config.tasks.max_context_per_step < 100) {
    warnings.push('max_context_per_step is very low (< 100)');
  }

  if (config.advanced?.max_tags && config.advanced.max_tags < 10) {
    warnings.push('max_tags is very low (< 10)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate required fields exist
 */
export function validateRequiredFields(config: FullConfig): string[] {
  const errors: string[] = [];

  // Project fields
  if (!config.project?.name) {
    errors.push('project.name is required');
  }
  if (!config.project?.type) {
    errors.push('project.type is required');
  }
  if (!config.project?.description) {
    errors.push('project.description is required');
  }

  // Language fields
  if (!config.language?.user_language) {
    errors.push('language.user_language is required');
  }
  if (!config.language?.think_language) {
    errors.push('language.think_language is required');
  }

  // Paths fields
  if (!config.paths?.base_dir) {
    errors.push('paths.base_dir is required');
  }
  if (!config.paths?.codebase) {
    errors.push('paths.codebase is required');
  }

  // Objectives
  if (!config.objectives || !Array.isArray(config.objectives)) {
    errors.push('objectives must be an array');
  } else {
    config.objectives.forEach((obj, index) => {
      if (!obj.objective) {
        errors.push(`objectives[${index}].objective is required`);
      }
      if (!obj.memory_check) {
        errors.push(`objectives[${index}].memory_check is required`);
      }
      if (!obj.memory_update) {
        errors.push(`objectives[${index}].memory_update is required`);
      }
    });
  }

  return errors;
}

/**
 * Validate that paths exist on filesystem
 */
export async function validatePaths(config: FullConfig): Promise<string[]> {
  const errors: string[] = [];

  // Check if codebase directory exists
  if (config.paths?.codebase) {
    const exists = await dirExists(config.paths.codebase);
    if (!exists) {
      errors.push(`Codebase directory does not exist: ${config.paths.codebase}`);
    }
  }

  return errors;
}

/**
 * Validate template rendering - check for unreplaced variables
 */
export function validateTemplateRendering(content: string): boolean {
  // Check for any {{VARIABLE}} patterns that weren't replaced
  const unreplacedPattern = /\{\{[A-Z_]+\}\}/g;
  const matches = content.match(unreplacedPattern);
  return matches === null || matches.length === 0;
}

/**
 * Get list of unreplaced variables in template
 */
export function getUnreplacedVariables(content: string): string[] {
  const unreplacedPattern = /\{\{([A-Z_]+)\}\}/g;
  const matches = [...content.matchAll(unreplacedPattern)];
  return matches.map(m => m[1]);
}

/**
 * Validate memory system structure exists
 */
export async function validateMemorySystemStructure(baseDir: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if base directory exists
  if (!(await dirExists(baseDir))) {
    errors.push(`Memory system base directory does not exist: ${baseDir}`);
    return { valid: false, errors, warnings };
  }

  // Check for required subdirectories
  const requiredDirs = ['memory', 'prompt', 'result', 'temp'];
  for (const dir of requiredDirs) {
    const dirPath = `${baseDir}/${dir}`;
    if (!(await dirExists(dirPath))) {
      warnings.push(`Recommended directory does not exist: ${dirPath}`);
    }
  }

  // Check for template files
  const templateFiles = ['CLAUDE.md.template'];
  for (const file of templateFiles) {
    const filePath = `${baseDir}/${file}`;
    if (!(await fileExists(filePath))) {
      errors.push(`Required template file does not exist: ${filePath}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
