/**
 * Simple prompts for --simple mode (essential settings only)
 */
import inquirer from 'inquirer';
import * as path from 'path';
import type { ProjectConfig, LanguageConfig, GitConfig } from '../types/config.js';

/**
 * Prompt for essential project information (simple mode)
 */
export async function promptProjectInfoSimple(targetDir: string): Promise<ProjectConfig> {
  const defaultName = path.basename(targetDir);

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: defaultName,
      validate: (input: string) => input.trim().length > 0 || 'Project name is required'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description (brief):',
      default: 'Code analysis and documentation project',
      validate: (input: string) => input.trim().length > 0 || 'Project description is required'
    }
  ]);

  // Auto-detect project type based on directory contents
  const projectType = 'Multi-language Repository'; // TODO: Could detect from package.json, etc.

  return {
    name: answers.name,
    type: projectType,
    description: answers.description
  };
}

/**
 * Prompt for language configuration (simple mode)
 */
export async function promptLanguageConfigSimple(): Promise<LanguageConfig> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'user_language',
      message: 'User language (for outputs):',
      choices: ['English', 'Chinese', 'Japanese', 'Other'],
      default: 'English'
    },
    {
      type: 'input',
      name: 'user_language_custom',
      message: 'Enter custom language:',
      when: (answers) => answers.user_language === 'Other',
      validate: (input: string) => input.trim().length > 0 || 'Language is required'
    }
  ]);

  const userLanguage = answers.user_language_custom || answers.user_language;

  return {
    user_language: userLanguage,
    think_language: 'English' // Always English for internal reasoning
  };
}

/**
 * Prompt for git configuration (simple mode)
 */
export async function promptGitConfigSimple(): Promise<GitConfig> {
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enable_auto_commit',
      message: 'Enable auto-commit for memory system updates?',
      default: false
    },
    {
      type: 'confirm',
      name: 'commit_separately',
      message: 'Commit memory updates separately from other file changes?',
      default: true,
      when: (answers) => answers.enable_auto_commit
    }
  ]);

  return {
    ai_git_operations: answers.enable_auto_commit || false,
    ignore_patterns: ['claude/temp/'],
    auto_commit_memory_updates: answers.enable_auto_commit || false,
    commit_memory_separately: answers.commit_separately ?? true
  };
}
