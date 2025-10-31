/**
 * Interactive prompts for project information
 */
import inquirer from 'inquirer';
import type { ProjectConfig, LanguageConfig, PathsConfig } from '../types/config.js';

/**
 * Prompt for project information
 */
export async function promptProjectInfo(): Promise<ProjectConfig> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      validate: (input: string) => input.trim().length > 0 || 'Project name is required'
    },
    {
      type: 'list',
      name: 'type',
      message: 'Project type:',
      choices: [
        'Java monorepo',
        'Python microservices',
        'React application',
        'Node.js backend',
        'Multi-language repository',
        'Mobile app (iOS/Android)',
        'Full-stack web application',
        'Other'
      ]
    },
    {
      type: 'input',
      name: 'typeCustom',
      message: 'Enter custom project type:',
      when: (answers) => answers.type === 'Other',
      validate: (input: string) => input.trim().length > 0 || 'Project type is required'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      validate: (input: string) => input.trim().length > 0 || 'Project description is required'
    }
  ]);

  return {
    name: answers.name,
    type: answers.typeCustom || answers.type,
    description: answers.description
  };
}

/**
 * Prompt for language configuration
 */
export async function promptLanguageConfig(): Promise<LanguageConfig> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'user_language',
      message: 'User language (for outputs and documentation):',
      choices: ['English', 'Chinese', 'Japanese', 'Korean', 'Other'],
      default: 'English'
    },
    {
      type: 'input',
      name: 'user_language_custom',
      message: 'Enter custom user language:',
      when: (answers) => answers.user_language === 'Other',
      validate: (input: string) => input.trim().length > 0 || 'User language is required'
    },
    {
      type: 'list',
      name: 'think_language',
      message: 'Think language (for internal reasoning - English recommended):',
      choices: ['English', 'Chinese', 'Other'],
      default: 'English'
    },
    {
      type: 'input',
      name: 'think_language_custom',
      message: 'Enter custom think language:',
      when: (answers) => answers.think_language === 'Other',
      validate: (input: string) => input.trim().length > 0 || 'Think language is required'
    }
  ]);

  return {
    user_language: answers.user_language_custom || answers.user_language,
    think_language: answers.think_language_custom || answers.think_language
  };
}

/**
 * Prompt for paths configuration
 */
export async function promptPathsConfig(projectRoot: string): Promise<PathsConfig> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'base_dir',
      message: 'Base directory for Claude system:',
      default: 'claude',
      validate: (input: string) => input.trim().length > 0 || 'Base directory is required'
    },
    {
      type: 'input',
      name: 'codebase',
      message: 'Codebase root path:',
      default: projectRoot,
      validate: (input: string) => input.trim().length > 0 || 'Codebase path is required'
    }
  ]);

  return {
    base_dir: answers.base_dir,
    codebase: answers.codebase
  };
}
