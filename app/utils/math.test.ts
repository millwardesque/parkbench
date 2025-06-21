import { describe, it, expect } from 'vitest';
import { add, subtract } from './math';

describe('Math utilities', () => {
  describe('add function', () => {
    it('adds two positive numbers correctly', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('handles zero correctly', () => {
      expect(add(0, 5)).toBe(5);
      expect(add(5, 0)).toBe(5);
    });

    it('handles negative numbers correctly', () => {
      expect(add(-2, 3)).toBe(1);
      expect(add(2, -3)).toBe(-1);
      expect(add(-2, -3)).toBe(-5);
    });
  });

  describe('subtract function', () => {
    it('subtracts two positive numbers correctly', () => {
      expect(subtract(5, 3)).toBe(2);
    });

    it('handles zero correctly', () => {
      expect(subtract(5, 0)).toBe(5);
      expect(subtract(0, 5)).toBe(-5);
    });

    it('handles negative numbers correctly', () => {
      expect(subtract(-2, 3)).toBe(-5);
      expect(subtract(2, -3)).toBe(5);
      expect(subtract(-2, -3)).toBe(1);
    });
  });
});
