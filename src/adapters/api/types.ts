/**
 * Standard result envelope returned by worldstate fetch functions.
 * fromStaleCache: true means the data came from an expired Dexie entry
 * (network was unavailable at fetch time).
 */
export interface WSFetchResult<T> {
  data:           T;
  cachedAt:       number;
  fromStaleCache: boolean;
}
