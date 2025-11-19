/**
 * Unit tests for input component
 */

import { jest, describe, it, expect, beforeEach } from 'vitest';
import { input, type InputValidator } from '../../../src/prompts/components/input.js';

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  },
  prompt: vi.fn()
}), { virtual: true });

import inquirer from 'inquirer';
const mockPrompt = inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>;

describe('input', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display a text input prompt', async () => {
    mockPrompt.mockResolvedValue({ value: 'test-input' });

    const result = await input('Enter name:');

    expect(mockPrompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'input',
        name: 'value',
        message: 'Enter name:'
      })
    ]);

    expect(result).toBe('test-input');
  });

  it('should support default value', async () => {
    mockPrompt.mockResolvedValue({ value: 'my-project' });

    await input('Project name:', 'my-project');

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    expect(promptCall[0].default).toBe('my-project');
  });

  it('should work without default value', async () => {
    mockPrompt.mockResolvedValue({ value: 'user-input' });

    await input('Enter something:');

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    expect(promptCall[0].default).toBeUndefined();
  });

  it('should support custom validation function', async () => {
    const validator: InputValidator = (input: string) => {
      if (!input) return 'Input is required';
      if (input.length < 3) return 'Minimum 3 characters';
      return true;
    };

    mockPrompt.mockResolvedValue({ value: 'valid' });

    await input('Enter name:', undefined, validator);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    expect(typeof promptCall[0].validate).toBe('function');
  });

  it('should have default validator that always returns true', async () => {
    mockPrompt.mockResolvedValue({ value: 'anything' });

    await input('Enter anything:');

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    const validate = promptCall[0].validate;

    expect(validate('')).toBe(true);
    expect(validate('test')).toBe(true);
  });

  it('should return user input string', async () => {
    mockPrompt.mockResolvedValue({ value: 'user response' });

    const result = await input('Question:');

    expect(result).toBe('user response');
  });

  it('should handle empty string input', async () => {
    mockPrompt.mockResolvedValue({ value: '' });

    const result = await input('Optional field:');

    expect(result).toBe('');
  });

  it('should handle multiline-looking input', async () => {
    mockPrompt.mockResolvedValue({ value: 'Line 1\nLine 2' });

    const result = await input('Description:');

    expect(result).toBe('Line 1\nLine 2');
  });

  it('should preserve whitespace in input', async () => {
    mockPrompt.mockResolvedValue({ value: '  spaces  ' });

    const result = await input('Input:');

    expect(result).toBe('  spaces  ');
  });
});
