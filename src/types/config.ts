/**
 * Type definitions for Claude Memory System configuration
 */

export interface ProjectConfig {
  name: string;
  type: string;
  description: string;
}

export interface LanguageConfig {
  user_language: string;
  think_language: string;
}

export interface PathsConfig {
  base_dir: string;
  codebase: string;
  memory?: string;
  prompt?: string;
  result?: string;
  temp?: string;
}

export interface Objective {
  objective: string;
  memory_check: string;
  memory_update: string;
}

export interface DomainConfig {
  terms: string[];
  evidence: string[];
  external_sources: string[];
}

export interface TasksConfig {
  use_task_specific_indexes: boolean;
  use_incremental_work: boolean;
  max_context_per_step: number;
  max_task_context: number;
  hygiene_cycle_frequency: number;
}

export interface OutputConfig {
  format: string;
  include_diagrams: boolean;
  diagram_types: string[];
  code_reference_format: string;
}

export interface GitConfig {
  ai_git_operations: boolean;
  ignore_patterns: string[];
}

export interface AdvancedConfig {
  max_tags: number;
  max_topics: number;
  max_cross_refs: number;
  target_context_reduction: number;
  target_index_lookup_time: number;
}

export interface FullConfig {
  project: ProjectConfig;
  language: LanguageConfig;
  paths: PathsConfig;
  objectives: Objective[];
  assumptions: string[];
  domain: DomainConfig;
  tasks: TasksConfig;
  output: OutputConfig;
  git: GitConfig;
  advanced: AdvancedConfig;
  custom?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Index file structure for tags and topics
 */
export interface IndexFile {
  updated: string;
  tags?: Record<string, any>;
  topics?: Record<string, any>;
}
