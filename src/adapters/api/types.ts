// Re-export from canonical location. Adapters that import WSFetchResult from
// '@/adapters/api/types' continue to work while the type lives in legacy/.
export type { WSFetchResult } from '../legacy/types';
