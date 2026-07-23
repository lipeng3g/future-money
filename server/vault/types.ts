import type { AppData } from '../../src/types';

export const MAX_VAULT_BYTES = 4 * 1024 * 1024;
export const CURRENT_DATA_VERSION = 1;
export const CURRENT_KEY_VERSION = 1;

export interface VaultBindings {
  DATA_ENCRYPTION_KEY_V1?: string;
}

export interface StoredVault {
  user_id: string;
  revision: number;
  schema_version: number;
  key_version: number;
  iv: string;
  ciphertext: string;
  updated_at: string;
}

export interface VaultWriteRequest {
  expectedRevision: number;
  data: AppData;
}
