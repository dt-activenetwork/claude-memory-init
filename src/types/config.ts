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

export interface PythonConfig {
  available: boolean;
  version: string;
  path: string;
  package_manager: 'uv' | 'venv' | 'pip' | 'none';
  has_uv: boolean;
  has_venv: boolean;
}

export interface NodeConfig {
  available: boolean;
  version: string;
  path: string;
  package_managers: string[];  // Available: npm, pnpm, yarn
  selected_package_manager: string;
}

export interface DevelopmentTools {
  python?: PythonConfig;
  node?: NodeConfig;
}

export interface SystemConfig {
  os_type: string;           // 'linux' | 'windows' | 'darwin'
  os_name: string;           // e.g., 'Ubuntu 22.04', 'Arch Linux', 'Windows 10'
  os_version: string;        // e.g., '22.04', '6.5.0-arch1', '10.0.19041'
  is_msys2: boolean;         // true if running in MSYS2 environment
  package_manager: string;   // Selected package manager (e.g., 'apt', 'pacman', 'brew')
  is_root: boolean;          // true if running as root/admin
  has_sudo: boolean;         // true if sudo is available
  install_prefix: string;    // '' or 'sudo' depending on privileges
  dev_tools: DevelopmentTools; // Development tools (Python, Node.js)
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
  system: SystemConfig;
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
