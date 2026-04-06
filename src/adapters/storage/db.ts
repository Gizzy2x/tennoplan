import Dexie, { type Table } from "dexie";

export interface Setting {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface CacheEntry {
  key: string;
  data: unknown;
  expiresAt: number;
  updatedAt: number;
}

export interface UserMark {
  id?: number;
  type: string;
  referenceId: string;
  status: string;
  metadata?: unknown;
  createdAt: number;
  updatedAt: number;
}

export class TennoplanDB extends Dexie {
  settings!: Table<Setting, string>;
  cache!: Table<CacheEntry, string>;
  userMarks!: Table<UserMark, number>;

  constructor() {
    super("tennoplan");

    this.version(1).stores({
      settings: "key",
      cache: "key, expiresAt",
      userMarks: "++id, type, referenceId, [type+referenceId], updatedAt",
    });
  }
}

export const db = new TennoplanDB();
