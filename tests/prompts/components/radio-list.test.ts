/**
 * Unit tests for radio-list component
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { radioList, type RadioOption } from '../../../src/prompts/components/radio-list.js';

// Mock inquirer
jest.mock('inquirer', () => ({
  default: {
    prompt: jest.fn()
  },
  prompt: jest.fn()
}), { virtual: true });

import inquirer from 'inquirer';
const mockPrompt = inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>;

describe('radioList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display a radio list with basic options', async () => {
    const options: RadioOption[] = [
      { name: 'Option 1', value: 'opt1' },
      { name: 'Option 2', value: 'opt2' }
    ];

    mockPrompt.mockResolvedValue({ selected: 'opt1' });

    const result = await radioList('Choose one:', options);

    expect(mockPrompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'list',
        name: 'selected',
        message: 'Choose one:'
      })
    ]);

    expect(result).toBe('opt1');
  });

  it('should format options with descriptions', async () => {
    const options: RadioOption[] = [
      { name: 'Default Template', value: 'default', description: '(recommended)' },
      { name: 'Custom Repository', value: 'custom', description: 'Advanced' }
    ];

    mockPrompt.mockResolvedValue({ selected: 'default' });

    await radioList('Select template:', options);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    const choices = promptCall[0].choices;

    expect(choices[0].name).toContain('Default Template');
    expect(choices[0].name).toContain('(recommended)');
    expect(choices[1].name).toContain('Custom Repository');
    expect(choices[1].name).toContain('Advanced');
  });

  it('should support default value', async () => {
    const options: RadioOption[] = [
      { name: 'A', value: 'a' },
      { name: 'B', value: 'b' },
      { name: 'C', value: 'c' }
    ];

    mockPrompt.mockResolvedValue({ selected: 'b' });

    await radioList('Choose:', options, 'b');

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    expect(promptCall[0].default).toBe('b');
  });

  it('should work without default value', async () => {
    const options: RadioOption[] = [
      { name: 'A', value: 'a' },
      { name: 'B', value: 'b' }
    ];

    mockPrompt.mockResolvedValue({ selected: 'a' });

    await radioList('Choose:', options);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    expect(promptCall[0].default).toBeUndefined();
  });

  it('should return single selected value', async () => {
    const options: RadioOption[] = [
      { name: 'First', value: 'first' },
      { name: 'Second', value: 'second' }
    ];

    mockPrompt.mockResolvedValue({ selected: 'second' });

    const result = await radioList('Choose:', options);

    expect(result).toBe('second');
  });

  it('should handle options without descriptions', async () => {
    const options: RadioOption[] = [
      { name: 'Simple', value: 'simple' }
    ];

    mockPrompt.mockResolvedValue({ selected: 'simple' });

    await radioList('Choose:', options);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    const choices = promptCall[0].choices;

    expect(choices[0].name).toBe('Simple');
  });

  it('should set pageSize to 10', async () => {
    const options: RadioOption[] = [
      { name: 'Option', value: 'opt' }
    ];

    mockPrompt.mockResolvedValue({ selected: 'opt' });

    await radioList('Choose:', options);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    expect(promptCall[0].pageSize).toBe(10);
  });

  it('should disable loop navigation', async () => {
    const options: RadioOption[] = [
      { name: 'Option', value: 'opt' }
    ];

    mockPrompt.mockResolvedValue({ selected: 'opt' });

    await radioList('Choose:', options);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    expect(promptCall[0].loop).toBe(false);
  });
});
