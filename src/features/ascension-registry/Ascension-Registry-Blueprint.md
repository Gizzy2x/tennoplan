---
type: architecture-node
module: Ascension-Registry
status: stub
tags: [tennoplan, somatic-link, mastery, progression]
---

# Ascension Registry Feature Blueprint

## Purpose
Mastery & Progression Tracker — MR rank, unlock/check off Warframes, weapons, companions, archwings, etc.

## Data Flow
- **Source:** Drop rate data + user progression state
- **Persistence:** Dexie IndexedDB
- **State Management:** Zustand

## Key Files
- `AscensionRegistry.tsx` — Main page component (stub)

## Future Development
- Warframe/weapon/companion checklist UI
- Mastery rank display
- Drop rate integration
