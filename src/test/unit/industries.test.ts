import { describe, it, expect } from 'vitest';
import {
  INDUSTRIES,
  DATE_POSTED_OPTIONS,
  SENIORITY_OPTIONS,
  WORK_TYPE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  RELEVANCE_OPTIONS,
} from '@/data/industries';

describe('INDUSTRIES', () => {
  it('every entry has non-empty value, label, and group fields', () => {
    expect(INDUSTRIES.length).toBeGreaterThan(0);
    for (const item of INDUSTRIES) {
      expect(typeof item.value).toBe('string');
      expect(item.value.length).toBeGreaterThan(0);
      expect(typeof item.label).toBe('string');
      expect(item.label.length).toBeGreaterThan(0);
      expect(typeof item.group).toBe('string');
      expect((item.group as string).length).toBeGreaterThan(0);
    }
  });
});

describe('Options arrays', () => {
  const allArrays = {
    DATE_POSTED_OPTIONS,
    SENIORITY_OPTIONS,
    WORK_TYPE_OPTIONS,
    EMPLOYMENT_TYPE_OPTIONS,
    RELEVANCE_OPTIONS,
  };

  it('every option has non-empty value and label', () => {
    for (const [, arr] of Object.entries(allArrays)) {
      expect(arr.length).toBeGreaterThan(0);
      for (const opt of arr) {
        expect(typeof opt.value).toBe('string');
        expect(opt.value.length).toBeGreaterThan(0);
        expect(typeof opt.label).toBe('string');
        expect(opt.label.length).toBeGreaterThan(0);
      }
    }
  });

  it('no duplicate values within any options array', () => {
    for (const [name, arr] of Object.entries(allArrays)) {
      const values = arr.map((o) => o.value);
      const unique = new Set(values);
      expect(unique.size, `${name} contains duplicate values`).toBe(values.length);
    }
  });
});
