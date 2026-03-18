import { describe, it, expect, vi } from 'vitest';

describe('id.ts', () => {
  describe('createId', () => {
    it('should return a non-empty string', async () => {
      const { createId } = await import('@/utils/id');
      const id = createId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should return unique IDs on each call', async () => {
      const { createId } = await import('@/utils/id');
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(createId());
      }
      // All IDs should be unique
      expect(ids.size).toBe(100);
    });

    it('should use crypto.randomUUID when available', async () => {
      const { createId } = await import('@/utils/id');
      const mockUuid = 'test-uuid-1234-5678';
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUuid as `${string}-${string}-${string}-${string}-${string}`);

      const id = createId();
      expect(id).toBe(mockUuid);
    });
  });
});