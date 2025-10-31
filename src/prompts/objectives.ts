/**
 * Interactive prompts for objectives and assumptions
 */
import inquirer from 'inquirer';
import type { Objective } from '../types/config.js';

/**
 * Prompt for project objectives
 */
export async function promptObjectives(): Promise<Objective[]> {
  const objectives: Objective[] = [];

  console.log('\nDefine project objectives (minimum 1, maximum 5):');

  while (objectives.length < 5) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'objective',
        message: `Objective ${objectives.length + 1}:`,
        validate: (input: string) => input.trim().length > 0 || 'Objective is required'
      },
      {
        type: 'input',
        name: 'memory_check',
        message: 'Memory check strategy (how to query relevant memory):',
        validate: (input: string) => input.trim().length > 0 || 'Memory check is required'
      },
      {
        type: 'input',
        name: 'memory_update',
        message: 'Memory update strategy (how to record findings):',
        validate: (input: string) => input.trim().length > 0 || 'Memory update is required'
      }
    ]);

    objectives.push({
      objective: answers.objective,
      memory_check: answers.memory_check,
      memory_update: answers.memory_update
    });

    if (objectives.length >= 1) {
      const { addMore } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addMore',
          message: 'Add another objective?',
          default: false
        }
      ]);

      if (!addMore) {
        break;
      }
    }
  }

  return objectives;
}

/**
 * Prompt for project assumptions
 */
export async function promptAssumptions(): Promise<string[]> {
  const assumptions: string[] = [];

  console.log('\nDefine project assumptions and scope (minimum 1):');

  while (true) {
    const { assumption } = await inquirer.prompt([
      {
        type: 'input',
        name: 'assumption',
        message: `Assumption ${assumptions.length + 1}:`,
        validate: (input: string) => input.trim().length > 0 || 'Assumption is required'
      }
    ]);

    assumptions.push(assumption);

    if (assumptions.length >= 1) {
      const { addMore } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addMore',
          message: 'Add another assumption?',
          default: false
        }
      ]);

      if (!addMore) {
        break;
      }
    }
  }

  return assumptions;
}

/**
 * Prompt for domain-specific terms (optional)
 */
export async function promptDomainTerms(): Promise<string[]> {
  const { addTerms } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addTerms',
      message: 'Add domain-specific terms?',
      default: false
    }
  ]);

  if (!addTerms) {
    return [];
  }

  const terms: string[] = [];

  while (true) {
    const { term } = await inquirer.prompt([
      {
        type: 'input',
        name: 'term',
        message: `Term ${terms.length + 1} (format: "Term: Definition"):`,
        validate: (input: string) => {
          if (input.trim().length === 0) return 'Term is required';
          if (!input.includes(':')) return 'Format should be "Term: Definition"';
          return true;
        }
      }
    ]);

    terms.push(term);

    const { addMore } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addMore',
        message: 'Add another term?',
        default: false
      }
    ]);

    if (!addMore) {
      break;
    }
  }

  return terms;
}
