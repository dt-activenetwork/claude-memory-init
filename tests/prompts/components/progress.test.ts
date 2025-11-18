/**
 * Unit tests for progress indicator component
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Ora } from 'ora';
import { ProgressIndicator } from '../../../src/prompts/components/progress.js';

// Mock ora
jest.mock('ora', () => {
  return {
    __esModule: true,
    default: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      text: ''
    }))
  };
});

import ora from 'ora';
const mockedOra = ora as jest.MockedFunction<typeof ora>;

describe('ProgressIndicator', () => {
  let mockSpinner: jest.Mocked<Ora>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSpinner = {
      start: jest.fn(),
      stop: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      text: ''
    } as any;

    mockedOra.mockReturnValue(mockSpinner as any);
  });

  it('should create a progress indicator with steps', () => {
    const steps = ['Step 1', 'Step 2', 'Step 3'];
    const progress = new ProgressIndicator(steps);

    expect(progress).toBeInstanceOf(ProgressIndicator);
    expect(mockedOra).toHaveBeenCalled();
  });

  it('should start at first step', () => {
    const steps = ['Creating files', 'Installing'];
    const progress = new ProgressIndicator(steps);

    progress.start();

    expect(mockSpinner.start).toHaveBeenCalled();
    expect(mockSpinner.text).toBe('[1/2] Creating files');
  });

  it('should move to next step', () => {
    const steps = ['Step 1', 'Step 2', 'Step 3'];
    const progress = new ProgressIndicator(steps);

    progress.start();
    expect(mockSpinner.text).toBe('[1/3] Step 1');

    progress.nextStep();
    expect(mockSpinner.text).toBe('[2/3] Step 2');

    progress.nextStep();
    expect(mockSpinner.text).toBe('[3/3] Step 3');
  });

  it('should not update text past last step', () => {
    const steps = ['Step 1', 'Step 2'];
    const progress = new ProgressIndicator(steps);

    progress.start();
    progress.nextStep();
    const textAfterStep2 = mockSpinner.text;

    progress.nextStep(); // Beyond last step
    expect(mockSpinner.text).toBe(textAfterStep2); // Should not change
  });

  it('should succeed with default message', () => {
    const steps = ['Step'];
    const progress = new ProgressIndicator(steps);

    progress.succeed();

    expect(mockSpinner.succeed).toHaveBeenCalledWith('Complete');
  });

  it('should succeed with custom message', () => {
    const steps = ['Step'];
    const progress = new ProgressIndicator(steps);

    progress.succeed('All done!');

    expect(mockSpinner.succeed).toHaveBeenCalledWith('All done!');
  });

  it('should fail with default message', () => {
    const steps = ['Step'];
    const progress = new ProgressIndicator(steps);

    progress.fail();

    expect(mockSpinner.fail).toHaveBeenCalledWith('Failed');
  });

  it('should fail with custom message', () => {
    const steps = ['Step'];
    const progress = new ProgressIndicator(steps);

    progress.fail('Error occurred');

    expect(mockSpinner.fail).toHaveBeenCalledWith('Error occurred');
  });

  it('should warn with default message', () => {
    const steps = ['Step'];
    const progress = new ProgressIndicator(steps);

    progress.warn();

    expect(mockSpinner.warn).toHaveBeenCalledWith('Warning');
  });

  it('should warn with custom message', () => {
    const steps = ['Step'];
    const progress = new ProgressIndicator(steps);

    progress.warn('Something went wrong');

    expect(mockSpinner.warn).toHaveBeenCalledWith('Something went wrong');
  });

  it('should show info with default message', () => {
    const steps = ['Step'];
    const progress = new ProgressIndicator(steps);

    progress.info();

    expect(mockSpinner.info).toHaveBeenCalledWith('Info');
  });

  it('should show info with custom message', () => {
    const steps = ['Step'];
    const progress = new ProgressIndicator(steps);

    progress.info('FYI: something');

    expect(mockSpinner.info).toHaveBeenCalledWith('FYI: something');
  });

  it('should format progress text correctly', () => {
    const steps = [
      'Creating directory structure',
      'Installing plugins',
      'Generating configuration'
    ];
    const progress = new ProgressIndicator(steps);

    progress.start();
    expect(mockSpinner.text).toBe('[1/3] Creating directory structure');

    progress.nextStep();
    expect(mockSpinner.text).toBe('[2/3] Installing plugins');

    progress.nextStep();
    expect(mockSpinner.text).toBe('[3/3] Generating configuration');
  });

  it('should handle single step', () => {
    const steps = ['Only step'];
    const progress = new ProgressIndicator(steps);

    progress.start();
    expect(mockSpinner.text).toBe('[1/1] Only step');
  });

  it('should handle empty step descriptions', () => {
    const steps = ['', 'Real step'];
    const progress = new ProgressIndicator(steps);

    progress.start();
    expect(mockSpinner.text).toBe('[1/2] ');

    progress.nextStep();
    expect(mockSpinner.text).toBe('[2/2] Real step');
  });
});
