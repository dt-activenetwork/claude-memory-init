/**
 * Simple prompts for --simple mode (essential settings only)
 */
import inquirer from 'inquirer';
import * as path from 'path';
import type { ProjectConfig, LanguageConfig } from '../types/config.js';

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
