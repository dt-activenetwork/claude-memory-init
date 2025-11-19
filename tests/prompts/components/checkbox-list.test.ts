/**
 * Unit tests for checkbox-list component
 */

import { jest, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkboxList, type CheckboxOption } from '../../../src/prompts/components/checkbox-list.js';

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  },
  prompt: vi.fn()
}), { virtual: true });

import inquirer from 'inquirer';
const mockPrompt = inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>;

describe('checkboxList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display a checkbox list with basic options', async () => {
    const options: CheckboxOption[] = [
      { name: 'Option 1', value: 'opt1' },
      { name: 'Option 2', value: 'opt2' }
    ];

    mockPrompt.mockResolvedValue({ selected: ['opt1'] });

    const result = await checkboxList('Select options:', options);

    expect(mockPrompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'checkbox',
        name: 'selected',
        message: 'Select options:'
      })
    ]);

    expect(result).toEqual(['opt1']);
  });

  it('should format options with descriptions', async () => {
    const options: CheckboxOption[] = [
      { name: 'Memory System', value: 'memory', description: 'Full semantic memory' },
      { name: 'Git Integration', value: 'git', description: 'Auto-commit' }
    ];

    mockPrompt.mockResolvedValue({ selected: ['memory', 'git'] });

    await checkboxList('Select features:', options);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    const choices = promptCall[0].choices;

    // Check that descriptions are properly formatted
    expect(choices[0].name).toContain('Memory System');
    expect(choices[0].name).toContain('Full semantic memory');
    expect(choices[1].name).toContain('Git Integration');
    expect(choices[1].name).toContain('Auto-commit');
  });

  it('should support checked default values', async () => {
    const options: CheckboxOption[] = [
      { name: 'Option 1', value: 'opt1', checked: true },
      { name: 'Option 2', value: 'opt2', checked: false },
      { name: 'Option 3', value: 'opt3' }
    ];

    mockPrompt.mockResolvedValue({ selected: ['opt1'] });

    await checkboxList('Select:', options);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    const choices = promptCall[0].choices;

    expect(choices[0].checked).toBe(true);
    expect(choices[1].checked).toBe(false);
    expect(choices[2].checked).toBe(false);
  });

  it('should support disabled options', async () => {
    const options: CheckboxOption[] = [
      { name: 'Enabled', value: 'enabled' },
      { name: 'Disabled', value: 'disabled', disabled: true }
    ];

    mockPrompt.mockResolvedValue({ selected: ['enabled'] });

    await checkboxList('Select:', options);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    const choices = promptCall[0].choices;

    expect(choices[0].disabled).toBe(false);
    expect(choices[1].disabled).toBe(true);
  });

  it('should return multiple selected values', async () => {
    const options: CheckboxOption[] = [
      { name: 'A', value: 'a' },
      { name: 'B', value: 'b' },
      { name: 'C', value: 'c' }
    ];

    mockPrompt.mockResolvedValue({ selected: ['a', 'c'] });

    const result = await checkboxList('Select:', options);

    expect(result).toEqual(['a', 'c']);
  });

  it('should return empty array when nothing selected', async () => {
    const options: CheckboxOption[] = [
      { name: 'A', value: 'a' },
      { name: 'B', value: 'b' }
    ];

    mockPrompt.mockResolvedValue({ selected: [] });

    const result = await checkboxList('Select:', options);

    expect(result).toEqual([]);
  });

  it('should handle options without descriptions', async () => {
    const options: CheckboxOption[] = [
      { name: 'Plain option', value: 'plain' }
    ];

    mockPrompt.mockResolvedValue({ selected: ['plain'] });

    await checkboxList('Select:', options);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    const choices = promptCall[0].choices;

    // Should just be the name without padding
    expect(choices[0].name).toBe('Plain option');
  });

  it('should set pageSize to 15', async () => {
    const options: CheckboxOption[] = [
      { name: 'Option', value: 'opt' }
    ];

    mockPrompt.mockResolvedValue({ selected: [] });

    await checkboxList('Select:', options);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    expect(promptCall[0].pageSize).toBe(15);
  });

  it('should disable loop navigation', async () => {
    const options: CheckboxOption[] = [
      { name: 'Option', value: 'opt' }
    ];

    mockPrompt.mockResolvedValue({ selected: [] });

    await checkboxList('Select:', options);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    expect(promptCall[0].loop).toBe(false);
  });
});
