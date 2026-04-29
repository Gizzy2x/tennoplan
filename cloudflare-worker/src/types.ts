export interface Env {
  TENNOPLAN_KV: KVNamespace;
  LOG_LEVEL?:                    string;
  MAX_STALENESS_MINUTES?:        string;
  FALLBACK_STALENESS_WARNING?:   string;
}

export type DataSource =
  | 'calamity-plus'
  | 'official'
  | 'wfcd'
  | 'enriched'
  | 'warframestat'
  | 'cached'
  | 'fallback';

export type DataQuality = 'high' | 'medium' | 'low';

export interface SyncMetadata {
  lastSync:    number;       // Unix ms of last successful sync
  etag:        string;       // SHA-256 of current blob (used for ETag header)
  version:     string;       // e.g. "official-20260430"
  source:      DataSource;
  quality:     DataQuality;
  errorCount:  number;       // consecutive failures since last success
  lastError?:  string;
  itemCount?:  number;       // Codex only
}

export interface ResponseMetadata {
  source:      DataSource;
  ageSeconds:  number;
  version?:    string;
  timestamp:   number;
  itemCount?:  number;
}

export type ApiResponse<T = unknown> =
  | { success: true;  data: T; metadata?: ResponseMetadata }
  | { success: false; error: string; code?: ErrorCode; message?: string };

export enum ErrorCode {
  STALE_DATA         = 'STALE_DATA',
  FETCH_FAILED       = 'FETCH_FAILED',
  CODEX_UNAVAILABLE  = 'CODEX_UNAVAILABLE',
  OFFLINE            = 'OFFLINE',
  PARSE_ERROR        = 'PARSE_ERROR',
  INVALID_REQUEST    = 'INVALID_REQUEST',
}
