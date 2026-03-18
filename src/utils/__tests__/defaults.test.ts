import { describe, it, expect } from 'vitest';
import {
  APP_VERSION,
  ACCOUNT_COLORS,
  ACCOUNT_ICONS,
  DEFAULT_ACCOUNT_CONFIG,
  DEFAULT_SNAPSHOT,
  DEFAULT_PREFERENCES,
  DEFAULT_RECONCILIATION,
  COLOR_PALETTE,
} from '../defaults';

describe('defaults', () => {
  describe('APP_VERSION', () => {
    it('should be a valid semver string', () => {
      expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('ACCOUNT_COLORS', () => {
    it('should contain 7 colors', () => {
      expect(ACCOUNT_COLORS).toHaveLength(7);
    });

    it('should all be valid hex colors', () => {
      ACCOUNT_COLORS.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('ACCOUNT_ICONS', () => {
    it('should contain 7 icon keys', () => {
      expect(ACCOUNT_ICONS).toHaveLength(7);
    });

    it('should all be non-empty strings', () => {
      ACCOUNT_ICONS.forEach((icon) => {
        expect(icon).toBeTruthy();
        expect(typeof icon).toBe('string');
      });
    });
  });

  describe('DEFAULT_ACCOUNT_CONFIG', () => {
    it('should return an object with required fields', () => {
      const config = DEFAULT_ACCOUNT_CONFIG();

      expect(config.id).toBeTruthy();
      expect(config.name).toBe('主账户');
      expect(config.typeLabel).toBe('现金账户');
      expect(config.initialBalance).toBe(0);
      expect(config.currency).toBe('¥');
      expect(config.warningThreshold).toBe(1000);
      expect(config.color).toBe(ACCOUNT_COLORS[0]);
      expect(config.iconKey).toBe(ACCOUNT_ICONS[0]);
      expect(config.createdAt).toBeTruthy();
      expect(config.updatedAt).toBeTruthy();
    });

    it('should generate unique IDs for each call', () => {
      const config1 = DEFAULT_ACCOUNT_CONFIG();
      const config2 = DEFAULT_ACCOUNT_CONFIG();

      expect(config1.id).not.toBe(config2.id);
    });

    it('should have valid ISO timestamps', () => {
      const config = DEFAULT_ACCOUNT_CONFIG();

      expect(() => new Date(config.createdAt)).not.toThrow();
      expect(() => new Date(config.updatedAt)).not.toThrow();
    });
  });

  describe('DEFAULT_SNAPSHOT', () => {
    it('should return a snapshot with accountId and initial balance', () => {
      const account = DEFAULT_ACCOUNT_CONFIG();
      const snapshot = DEFAULT_SNAPSHOT(account);

      expect(snapshot.id).toBe('snapshot-initial');
      expect(snapshot.accountId).toBe(account.id);
      expect(snapshot.balance).toBe(account.initialBalance);
      expect(snapshot.source).toBe('initial');
      expect(snapshot.createdAt).toBe(account.createdAt);
    });

    it('should have a valid date string', () => {
      const account = DEFAULT_ACCOUNT_CONFIG();
      const snapshot = DEFAULT_SNAPSHOT(account);

      expect(snapshot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('DEFAULT_PREFERENCES', () => {
    it('should return default user preferences', () => {
      const prefs = DEFAULT_PREFERENCES();

      expect(prefs.defaultViewMonths).toBe(12);
      expect(prefs.chartType).toBe('line');
      expect(prefs.showWeekends).toBe(true);
    });
  });

  describe('DEFAULT_RECONCILIATION', () => {
    it('should return a reconciliation with accountId and initial balance', () => {
      const account = DEFAULT_ACCOUNT_CONFIG();
      const recon = DEFAULT_RECONCILIATION(account);

      expect(recon.id).toBeTruthy();
      expect(recon.accountId).toBe(account.id);
      expect(recon.balance).toBe(account.initialBalance);
      expect(recon.note).toBe('初始对账');
      expect(recon.createdAt).toBe(account.createdAt);
    });

    it('should generate unique IDs for each call', () => {
      const account = DEFAULT_ACCOUNT_CONFIG();
      const recon1 = DEFAULT_RECONCILIATION(account);
      const recon2 = DEFAULT_RECONCILIATION(account);

      expect(recon1.id).not.toBe(recon2.id);
    });

    it('should have a valid date string', () => {
      const account = DEFAULT_ACCOUNT_CONFIG();
      const recon = DEFAULT_RECONCILIATION(account);

      expect(recon.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('COLOR_PALETTE', () => {
    it('should have income, expense, warning, and neutral colors', () => {
      expect(COLOR_PALETTE.income).toBeTruthy();
      expect(COLOR_PALETTE.expense).toBeTruthy();
      expect(COLOR_PALETTE.warning).toBeTruthy();
      expect(COLOR_PALETTE.neutral).toBeTruthy();
    });

    it('should all be valid hex colors', () => {
      expect(COLOR_PALETTE.income).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(COLOR_PALETTE.expense).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(COLOR_PALETTE.warning).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(COLOR_PALETTE.neutral).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});