# System Research: Tennoplan Infrastructure V3

## Project Overview
Tennoplan is evolving from a standard web application into a Local-First Somatic Interface. The core objective is to move away from fragmented, component-level API calls toward a unified, high-integrity data pipeline that ensures offline availability and instantaneous UI updates.

---

## 1. The "Single Pipe" Architecture
Instead of multiple components (Fissures, Cycles, Syndicates) firing independent network requests, the system now utilizes a Single Pipe methodology.

- **Master Sync Controller:** A centralized `SyncService` is the only authorized actor for outbound network traffic.
- **The WorldState Proxy:** To bypass CORS issues and prevent "404 Storms" from the public API, we utilize a Vercel Serverless Proxy (`/api/worldstate`). This proxy acts as a "Shield," fetching raw JSON from the Warframe servers and returning it as a single, massive packet.
- **Performance Constraints:** A mandatory 60-second cooldown is enforced at the service level to prevent rate-limiting and unnecessary bandwidth usage.

---

## 2. The "Warehouse" Logic (Dexie & Storage)
Dexie.js (IndexedDB) serves as the "Chassis" of the application. The application does not store data in React state for persistence; it uses the browser's database.

- **Single Source of Truth:** The entire WorldState JSON is stored in a dedicated table entry called `worldstate_master`.
- **Subscriber Pattern:** UI hooks (e.g., `useFissures`, `useCetusCycle`) are refactored into Subscribers. They use `useLiveQuery` to watch the `worldstate_master` table.
- **The Benefit:** When `SyncService` updates the database, every component on the screen "snaps" to the new data simultaneously without a page reload.

---

## 3. Fault Tolerance & Safety Decisions
To solve the "Black Screen of Death" (`c.map is not a function`) and build errors, the following technical standards were established:

- **Optional Chaining Guard:** All UI rendering logic must use `?.map()` or `(data ?? []).map()`. This ensures that if the API returns an error or is empty, the UI renders a null state instead of crashing the React tree.
- **Decoupled Parsing:** The Vercel function was simplified into a "Pass-Through Proxy." By removing the heavy `warframe-worldstate-parser` from the backend, we eliminated Vercel memory-limit crashes (500 errors). Parsing is now handled on the client-side where resources are more flexible.
- **Ghost Purge:** Deletion of legacy `src/adapters/api` files to prevent the TypeScript compiler from referencing deleted libraries during the build process.

---

## 4. Item & Asset Management
- **Centralized Icon Resolver:** A dedicated utility (`src/utils/iconResolver.ts`) maps internal game paths (from `EE.log`) to the `cdn.warframestat.us` image library.
- **Fallback Assets:** Implementation of a "Broken Link" fallback icon that maintains the terminal/gold aesthetic if an asset is missing or 404s.

---

## 5. Deployment & Optimization
- **Vite Chunking:** To resolve "Large Chunk" warnings, Rollup configuration was updated to split `vendor`, `storage`, and `icons` into separate files, improving initial load speeds and cache-hit ratios on Vercel.

---

**Status: Ready for Nuclear Sweep Implementation.**
