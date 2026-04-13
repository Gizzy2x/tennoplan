// ---------------------------------------------------------------------------
// Shared adapter result type — used by all worldstate API adapters
// ---------------------------------------------------------------------------

export interface WSFetchResult<T> {
  data:           T;
  cachedAt:       number;  // ms epoch when data was last fetched from the API
  fromStaleCache: boolean; // true = network failed, serving expired Dexie data
}
