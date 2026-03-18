import { describe, it, expect } from 'vitest';
import { sanitizeHexColor } from '@/utils/color';

describe('color.ts', () => {
  describe('sanitizeHexColor', () => {
    it('should return undefined for non-string input', () => {
      expect(sanitizeHexColor(undefined)).toBeUndefined();
      expect(sanitizeHexColor(null)).toBeUndefined();
      expect(sanitizeHexColor(123)).toBeUndefined();
      expect(sanitizeHexColor({})).toBeUndefined();
    });

    it('should return undefined for empty string after trim', () => {
      expect(sanitizeHexColor('')).toBeUndefined();
      expect(sanitizeHexColor('   ')).toBeUndefined();
      expect(sanitizeHexColor('\t\n')).toBeUndefined();
    });

    it('should return undefined for invalid color format', () => {
      expect(sanitizeHexColor('red')).toBeUndefined();
      expect(sanitizeHexColor('rgb(255,0,0)')).toBeUndefined();
      expect(sanitizeHexColor('#gggggg')).toBeUndefined();
      expect(sanitizeHexColor('#12')).toBeUndefined();
      expect(sanitizeHexColor('#12345')).toBeUndefined();
      expect(sanitizeHexColor('#123456789')).toBeUndefined();
    });

    it('should accept valid 3-digit hex color', () => {
      expect(sanitizeHexColor('#fff')).toBe('#fff');
      expect(sanitizeHexColor('#abc')).toBe('#abc');
      expect(sanitizeHexColor('#ABC')).toBe('#ABC');
      expect(sanitizeHexColor('#Abc')).toBe('#Abc');
    });

    it('should accept valid 6-digit hex color', () => {
      expect(sanitizeHexColor('#ffffff')).toBe('#ffffff');
      expect(sanitizeHexColor('#000000')).toBe('#000000');
      expect(sanitizeHexColor('#3b82f6')).toBe('#3b82f6');
      expect(sanitizeHexColor('#ABCDEF')).toBe('#ABCDEF');
    });

    it('should accept valid 8-digit hex color (with alpha)', () => {
      expect(sanitizeHexColor('#ffffffff')).toBe('#ffffffff');
      expect(sanitizeHexColor('#3b82f6ff')).toBe('#3b82f6ff');
      expect(sanitizeHexColor('#3b82f680')).toBe('#3b82f680');
    });

    it('should trim whitespace from input', () => {
      expect(sanitizeHexColor('  #fff  ')).toBe('#fff');
      expect(sanitizeHexColor('\t#3b82f6\n')).toBe('#3b82f6');
    });

    it('should return undefined for colors with invalid characters', () => {
      expect(sanitizeHexColor('#fffz')).toBeUndefined();
      expect(sanitizeHexColor('#12g4')).toBeUndefined();
    });
  });
});