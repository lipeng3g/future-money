import type { AppData } from '../../src/types';
import { CURRENT_DATA_VERSION, MAX_VAULT_BYTES, type VaultWriteRequest } from './types';

export class VaultValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultValidationError';
  }
}

export function parseVaultWriteRequest(text: string): VaultWriteRequest {
  if (new TextEncoder().encode(text).byteLength > MAX_VAULT_BYTES) {
    throw new VaultValidationError('Vault payload is too large');
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new VaultValidationError('Request body is not valid JSON');
  }

  if (
    !isRecord(value)
    || typeof value.expectedRevision !== 'number'
    || !Number.isSafeInteger(value.expectedRevision)
    || value.expectedRevision < 0
  ) {
    throw new VaultValidationError('expectedRevision must be a non-negative integer');
  }
  if (!isAppData(value.data)) {
    throw new VaultValidationError('Vault data has an invalid structure');
  }

  return value as unknown as VaultWriteRequest;
}

export function parseStoredAppData(value: unknown): AppData {
  if (!isAppData(value)) throw new VaultValidationError('Stored vault data has an invalid structure');
  return value;
}

function isAppData(value: unknown): value is AppData {
  if (!isRecord(value) || value.version !== CURRENT_DATA_VERSION) return false;
  if (!Array.isArray(value.accounts) || !value.accounts.every(isAccount)) return false;
  if (!Array.isArray(value.transactions) || !value.transactions.every(isTransaction)) return false;
  if (!Array.isArray(value.series) || !value.series.every(isSeries)) return false;
  if (!Array.isArray(value.categories) || !value.categories.every(isCategory)) return false;
  return true;
}

function isAccount(value: unknown): boolean {
  return isRecord(value)
    && isId(value.id)
    && isShortString(value.name, 200)
    && isOptionalId(value.categoryId)
    && isMoney(value.openingBalance)
    && isDate(value.openingDate)
    && isShortString(value.color, 100)
    && typeof value.archived === 'boolean'
    && isTimestamp(value.createdAt)
    && isTimestamp(value.updatedAt);
}

function isTransaction(value: unknown): boolean {
  return isRecord(value)
    && isId(value.id)
    && isId(value.accountId)
    && isDate(value.date)
    && isMoney(value.amount)
    && isOptionalId(value.categoryId)
    && isOptionalString(value.note, 2_000)
    && isOptionalId(value.seriesId)
    && isTimestamp(value.createdAt)
    && isTimestamp(value.updatedAt);
}

function isSeries(value: unknown): boolean {
  return isRecord(value)
    && isId(value.id)
    && isId(value.accountId)
    && ['once', 'daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'annual'].includes(String(value.frequency))
    && Number.isSafeInteger(value.interval)
    && Number(value.interval) > 0
    && isMoney(value.baseAmount)
    && isDate(value.startDate)
    && isRecurrenceEnd(value.end)
    && isOptionalId(value.categoryId)
    && isOptionalString(value.note, 2_000)
    && isTimestamp(value.createdAt);
}

function isCategory(value: unknown): boolean {
  return isRecord(value)
    && isId(value.id)
    && isShortString(value.name, 200)
    && isShortString(value.color, 100)
    && isTimestamp(value.createdAt);
}

function isRecurrenceEnd(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (value.kind === 'count' && Number.isSafeInteger(value.count) && Number(value.count) > 0)
    || (value.kind === 'until' && isDate(value.date));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return isShortString(value, 200) && value.length > 0;
}

function isOptionalId(value: unknown): boolean {
  return value === undefined || isId(value);
}

function isShortString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max;
}

function isOptionalString(value: unknown, max: number): boolean {
  return value === undefined || isShortString(value, max);
}

function isDate(value: unknown): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isMoney(value: unknown): boolean {
  return Number.isSafeInteger(value);
}

function isTimestamp(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}
