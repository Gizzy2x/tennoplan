---
title: Data Flow Architecture Audit
date: 2026-04-14
status: complete
---

# Audit: Single Pipe Enforcement (SyncService)

## Executive Summary

The codebase follows the Single Pipe pattern **correctly for worldstate data** but has identified areas of concern:

### Status Summary
- ✅ **Main hooks (worldstate)**: Compliant — use `useLiveQuery(db.cache.get('worldstate_master'))` + `SyncService.performSync()`
- ✅ **LogParserService leak**: RESOLVED (2026-04-14) — now pure; uses `SyncService.updateUserInventory()` gateway
- ⚠️ **Independent pipes**: Drop rates, manifest, assets — intentional separate streams (documented in manifest)
- ⚠️ **Incomplete**: Ascension Registry is still a stub

---

## 1. CRITICAL FINDINGS

### ✅ RESOLVED: LogParserService.ts — Direct Dexie Leak (Fixed 2026-04-14)

**Original Location**: `src/services/LogParserService.ts:23-31`

**Status**: RESOLVED

**What was fixed**:
1. **LogParserService.ts**: Removed direct `db.cache.put()` method (was `syncInventoryToDb()`)
   - Now a pure service with only `parseLog(content: string)` method
   - Zero Dexie imports; zero side-effects
   - All persistence delegated to SyncService

2. **SyncService.ts**: Added `updateUserInventory(items: string[])` gateway method
   ```typescript
   async updateUserInventory(items: string[]) {
     const now = Date.now();
     try {
       await db.cache.put({
         key: 'user_inventory',
         data: items,
         updatedAt: now,
         expiresAt: now + USER_INVENTORY_TTL, // 24 hours
       });
     } catch (error) {
       console.error('Failed to persist user inventory:', error);
       throw error;
     }
   }
   ```
   - Consistent TTL (24 hours via constant)
   - Single write path (SyncService enforces)
   - Error handling and logging
   - Clear ownership semantics

3. **LogDropZone.tsx**: Updated to call new SyncService method
   - Line 19: `await SyncService.updateUserInventory(items)`
   - Added error state handling + UI feedback
   - Replaced direct LogParserService call

**Why this fix works**:
- ✅ Enforces Single Pipe — all cache writes go through SyncService
- ✅ Maintains TTL consistency — user_inventory respects 24h expiry
- ✅ Centralized error handling — failures logged and propagated
- ✅ Pure business logic — LogParserService is now side-effect-free
- ✅ Follows manifest architecture — one gateway for all persistence

---

## 2. COMPLIANT IMPLEMENTATIONS (Worldstate Data)

All feature hooks reading worldstate follow the Single Pipe pattern correctly:

### ✅ useWorldCycles (Celestial Pendulum)
- **File**: `src/features/celestial-pendulum/hooks/useWorldCycles.ts`
- **Pattern**: `useLiveQuery(() => db.cache.get('worldstate_master'))`
- **Refresh**: Calls `SyncService.performSync(true)` on forceRefetch
- **Status**: COMPLIANT

### ✅ useFissures (Void Reliquaries)
- **Pattern**: Same as above
- **Status**: COMPLIANT (verified in grep results)

### ✅ useSolarRailFeed (Solar Rail Feed)
- **Pattern**: Same as above
- **Status**: COMPLIANT (verified in grep results)

### ✅ useDailiesWeeklies (Dailies & Weeklies)
- **File**: `src/features/dailies-weeklies/hooks/useDailiesWeeklies.ts`
- **Pattern**: `useLiveQuery(() => db.cache.get('worldstate_master'))`
- **Refresh**: Calls `SyncService.performSync(true)`
- **Ownership**: Also writes to `db.userMarks` for completion state (correct separation)
- **Status**: COMPLIANT

### ✅ SyncService (Single Entry Point)
- **File**: `src/services/SyncService.ts`
- **Pattern**: 
  - 60s anti-spam lock check
  - Single `fetch('/api/worldstate')` call
  - Writes via `setWsCache('worldstate_master', data, 3_600_000)`
  - All subscribers auto-wake via Dexie useLiveQuery
- **Status**: COMPLIANT — enforces Single Pipe correctly

---

## 3. INDEPENDENT PIPES (Intentional — Per Manifest)

These are separate data streams documented in SOMATIC_MANIFEST.md as intentional Sub-Systems:

### ⚠️ useDropRates (Drop Table)
- **File**: `src/hooks/useDropRates.ts`
- **Pattern**: Module-level `_inFlight` guard + direct fetch to `https://drops.warframestat.us/data/all.json`
- **TTL**: 24 hours (separate from worldstate)
- **Status**: INDEPENDENT PIPE — allowed per manifest section 4
- **Concern**: Could benefit from coordination with SyncService's 60s lock concept
- **Recommendation**: Document explicitly why this is separate (large payload, different update cadence)

### ⚠️ manifestAdapter.ts (WFCD Manifest)
- **File**: `src/adapters/assets/manifestAdapter.ts:66`
- **Pattern**: Direct fetch to GitHub with conditional headers (If-None-Match)
- **TTL**: Custom via ETag/Last-Modified (not SyncService-managed)
- **Status**: INDEPENDENT PIPE — asset metadata stream
- **Concern**: No coordination with worldstate sync cadence
- **Recommendation**: Document as intentional independent pipe

### ⚠️ assetDownloader.ts (CDN Assets)
- **File**: `src/adapters/assets/assetDownloader.ts:52`
- **Pattern**: Direct concurrent fetch with retry/backoff
- **Status**: INDEPENDENT PIPE — binary asset downloads
- **Concern**: Uses custom retry logic instead of SyncService pattern
- **Recommendation**: This is appropriate (different failure modes for images), but ensure clear separation documented

---

## 4. INCOMPLETE IMPLEMENTATIONS

### ⚠️ Ascension Registry (Still a Stub)
- **File**: `src/features/ascension-registry/AscensionRegistryPage.tsx`
- **Status**: Placeholder UI only
- **Missing**:
  - No `useProgression()` hook
  - No `db.progression` table usage
  - No data sync from SyncService
- **Expected per Manifest**: Should read from `db.progression` (independent table, not `cache`)
- **Recommendation**: When implementing, use same useLiveQuery pattern but query `db.progression` table instead of cache

---

## 5. STORAGE SCHEMA REVIEW

**File**: `src/adapters/storage/db.ts`

Current tables:
- ✅ `cache` — worldstate + drop rates (SyncService writes here)
- ✅ `userMarks` — completion state (Dailies & Weeklies owns)
- ✅ `settings` — metadata (manifest ETag, etc.)
- ✅ `assetMeta` — asset sync engine records
- ✅ `syncErrors` — asset error log

**Issue**: There is no `db.progression` table defined yet (needed for Ascension Registry).

**Recommendation**: Add when implementing Ascension Registry:
```typescript
this.version(3).stores({
  settings: "key",
  cache: "key, expiresAt",
  userMarks: "++id, type, referenceId, [type+referenceId], updatedAt",
  assetMeta: "uniqueName, cacheKey, status, priority, lastAccessedAt",
  syncErrors: "++id, occurredAt, uniqueName",
  progression: "++id, type, missionName, rank, updatedAt",  // NEW
});
```

---

## 6. ACTION ITEMS

### ✅ COMPLETED
- [x] **LogParserService leak** — FIXED (2026-04-14)
  - Removed direct db.cache.put() from LogParserService
  - Added SyncService.updateUserInventory() gateway
  - Updated LogDropZone.tsx to use new method
  - All files refactored and tested

### HIGH (Before major release)
1. **Document independent pipes**: Add comments explaining why Drop Rates, Manifest, and Assets use separate fetch patterns
2. **Add db.progression**: Schema for Ascension Registry when ready to implement

### MEDIUM (Nice to have)
3. **Consider consolidating retry logic**: assetDownloader uses custom backoff; could reuse or document pattern
4. **Drop Rates synchronization**: Consider if it should respect worldstate sync cadence

---

## 7. COMPLIANCE MATRIX

| Component | File | Pattern | Compliant | Notes |
|-----------|------|---------|-----------|-------|
| SyncService | `src/services/SyncService.ts` | Single fetch, throttle, cache + inventory gateway | ✅ | Enforces Single Pipe for all writes |
| SyncService.updateUserInventory() | `src/services/SyncService.ts` | Gateway method, 24h TTL | ✅ | **NEW** — Fixed LogParserService leak |
| useWorldCycles | `src/features/celestial-pendulum/hooks/useWorldCycles.ts` | useLiveQuery + forceSync | ✅ | Follows pattern |
| useFissures | `src/features/void-reliquaries/hooks/useFissures.ts` | useLiveQuery + forceSync | ✅ | Follows pattern |
| useSolarRailFeed | `src/features/solar-rail-feed/hooks/useSolarRailFeed.ts` | useLiveQuery + forceSync | ✅ | Follows pattern |
| useDailiesWeeklies | `src/features/dailies-weeklies/hooks/useDailiesWeeklies.ts` | useLiveQuery + forceSync | ✅ | Follows pattern |
| **LogParserService** | `src/services/LogParserService.ts` | Pure parseLog() function | ✅ | **FIXED** — now side-effect-free, delegates to SyncService |
| LogDropZone | `src/components/Inventory/LogDropZone.tsx` | parseLog() + SyncService gateway | ✅ | **FIXED** — uses SyncService.updateUserInventory() |
| useDropRates | `src/hooks/useDropRates.ts` | Independent fetch | ⚠️ | Intentional, separate stream |
| manifestAdapter | `src/adapters/assets/manifestAdapter.ts` | Independent fetch | ⚠️ | Intentional, separate stream |
| assetDownloader | `src/adapters/assets/assetDownloader.ts` | Independent fetch | ⚠️ | Intentional, separate stream |
| AscensionRegistry | `src/features/ascension-registry/AscensionRegistryPage.tsx` | Stub (incomplete) | ⚠️ | Awaiting implementation |

---

**Audit completed**: 2026-04-14  
**Auditor**: Claude Code  
**Next review**: After LogParserService refactor
