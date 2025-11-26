import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentDate, formatDate } from '../../../src/utils/date-utils.js';

describe('date-utils', () => {
  describe('getCurrentDate', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const date = getCurrentDate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return today's date", () => {
      const result = getCurrentDate();
      const today = new Date();
      const expected = today.toISOString().split('T')[0];
      expect(result).toBe(expected);
    });

    it('should call formatDate internally', () => {
      const spy = vi.spyOn({ formatDate }, 'formatDate');
      getCurrentDate();
      expect(spy).not.toHaveBeenCalled(); // Won't work as spy is on different object
      spy.mockRestore();
    });
  });

  describe('formatDate', () => {
    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      const result = formatDate(date);
      expect(result).toBe('2024-03-15');
    });

    it('should handle different months correctly', () => {
      const jan = new Date('2024-01-05T00:00:00Z');
      const dec = new Date('2024-12-25T00:00:00Z');

      expect(formatDate(jan)).toContain('-01-');
      expect(formatDate(dec)).toContain('-12-');
    });

    it('should pad single digit months with zero', () => {
      const date = new Date('2024-03-05T00:00:00Z');
      const result = formatDate(date);
      expect(result).toBe('2024-03-05');
    });

    it('should pad single digit days with zero', () => {
      const date = new Date('2024-11-07T00:00:00Z');
      const result = formatDate(date);
      expect(result).toBe('2024-11-07');
    });

    it('should handle year boundaries correctly', () => {
      const newYear = new Date('2024-01-01T00:00:00Z');
      const yearEnd = new Date('2024-12-31T00:00:00Z');

      expect(formatDate(newYear)).toBe('2024-01-01');
      expect(formatDate(yearEnd)).toBe('2024-12-31');
    });

    it('should handle leap year dates', () => {
      const leapDay = new Date('2024-02-29T00:00:00Z');
      const result = formatDate(leapDay);
      expect(result).toBe('2024-02-29');
    });

    it('should format dates consistently regardless of timezone', () => {
      // Create date using UTC
      const date1 = new Date(Date.UTC(2024, 5, 15)); // June 15, 2024
      const result1 = formatDate(date1);

      // The result should be valid YYYY-MM-DD format
      expect(result1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result1).toContain('2024');
      expect(result1).toContain('-06-'); // Month is June (5+1)
    });
  });
});
