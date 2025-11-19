import { describe, it, expect } from 'vitest';
import { getCurrentDate, formatDate } from '../../../src/utils/date-utils.js';

describe('date-utils', () => {
  describe('getCurrentDate', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const date = getCurrentDate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return today\'s date', () => {
      const today = new Date();
      const expected = formatDate(today);
      expect(getCurrentDate()).toBe(expected);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2025-10-30T12:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('2025-10-30');
    });

    it('should pad single digit months and days', () => {
      const date = new Date('2025-01-05T12:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('2025-01-05');
    });
  });
});
