/**
 * Unit tests for confirm component
 */

import { jest, describe, it, expect, beforeEach } from 'vitest';
import { confirm } from '../../../src/prompts/components/confirm.js';

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  },
  prompt: vi.fn()
}), { virtual: true });

import inquirer from 'inquirer';
const mockPrompt = inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>;

describe('confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display a confirmation prompt', async () => {
    mockPrompt.mockResolvedValue({ confirmed: true });

    const result = await confirm('Proceed?');

    expect(mockPrompt).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'confirm',
        name: 'confirmed',
        message: 'Proceed?'
      })
    ]);

    expect(result).toBe(true);
  });

  it('should default to true when not specified', async () => {
    mockPrompt.mockResolvedValue({ confirmed: true });

    await confirm('Continue?');

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    expect(promptCall[0].default).toBe(true);
  });

  it('should support false as default value', async () => {
    mockPrompt.mockResolvedValue({ confirmed: false });

    await confirm('Enable feature?', false);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    expect(promptCall[0].default).toBe(false);
  });

  it('should support true as explicit default value', async () => {
    mockPrompt.mockResolvedValue({ confirmed: true });

    await confirm('Proceed with initialization?', true);

    const promptCall = mockPrompt.mock.calls[0][0] as any;
    expect(promptCall[0].default).toBe(true);
  });

  it('should return true when user confirms', async () => {
    mockPrompt.mockResolvedValue({ confirmed: true });

    const result = await confirm('Are you sure?');

    expect(result).toBe(true);
  });

  it('should return false when user declines', async () => {
    mockPrompt.mockResolvedValue({ confirmed: false });

    const result = await confirm('Enable auto-commit?', false);

    expect(result).toBe(false);
  });

  it('should handle different question formats', async () => {
    mockPrompt.mockResolvedValue({ confirmed: true });

    await confirm('Do you want to continue? (y/n)');

    expect(mockPrompt).toHaveBeenCalledWith([
      expect.objectContaining({
        message: 'Do you want to continue? (y/n)'
      })
    ]);
  });
});
