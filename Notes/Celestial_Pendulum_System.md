# Celestial Pendulum — Comprehensive World Management System

**Date:** 2026-04-17  
**Status:** Phase 1 (live timers) complete | Phases 2+ in planning

---

## What It Is

**Celestial Pendulum** is the **unified hub for all world-related gameplay** in Tennoplan. It consolidates world states, bounties, farming opportunities, and cycle-dependent loot into a single, explorable interface.

---

## Core Tracking & Features

### 1. **World States & Live Cycles**
- Current state of each explorable world (Cetus, Plains of Eidolon, Cambion Drift, Zariman, etc.)
- Day/night cycles, zone rotations, and time-to-next-cycle countdowns
- Which world is "active" for farming right now

### 2. **Bounties**
- All available bounties **per world**
- Bounty name, tier, required level, standing rewards
- Tied to current world state (some bounties only appear during specific cycles)
- Visual link to which world/cycle they belong to

### 3. **Drop Rates & Loot Tables**
- Mission-specific drop tables (e.g., "void fissure on Zariman drops X relics")
- Key resources tied to each world/mission type
- Rarity tiers and farming efficiency data
- Which cycles/times maximize specific drops

### 4. **Key Resources by Cycle**
- What resources are **best farmed during this cycle**
- Resource availability tied to world state (e.g., "Cetus Night = better fishing, Void Fissure active = void relic drops")
- Farming recommendations based on current state

### 5. **Completion Flagging** (Light Integration)
- Optional checkbox: "I've farmed this world this cycle"
- Small flag that can **link to or sync with Dailies & Weeklies** tab
- Completion state owned by Dailies & Weeklies; CP just references it

---

## Future Phases

### Phase 2: **Integrated Map**
- Visual map of each world
- Click-to-explore bounties/missions
- Show active zones, timers, and cycle status visually

### Phase 3: **Calendar / Cycle Planner**
- Forecast upcoming cycles (next 24h, next week)
- Plan farming routes based on future states
- Mark personal goals ("Want void fissures on Zariman Friday at 8pm")

---

## Data Sources & Architecture

**Primary API:** https://api.warframestat.us/
- Provides: worldstate, fissures, bounties, cycle timers

**Secondary:** https://api.warframe.market/v2/ or static game data
- Drop rates, loot tables, resource availability

**Dexie Storage:**
- Cache world states, bounty lists, drop rate tables
- Sync with server for real-time updates

---

## Design Principles

- **World-centric:** Everything organized around which world you're playing in
- **Cycle-aware:** All information contextual to current/future cycle state
- **Deep but scannable:** Rich data (drop rates, resources) but quick at-a-glance view
- **Completion integration:** Light tie to Dailies & Weeklies (never duplicate state)
- **Farmable:** Players use this to plan farming routes and optimize time

---

## User Journey

1. **Quick glance:** "What's active right now?" → See current world states + bounties
2. **Deep dive:** "What should I farm today?" → Check drop rates, key resources, and efficiency
3. **Plan ahead:** "When should I come back?" → Use calendar to forecast cycles
4. **Execute:** "Where do I go?" → Click into world → See map + bounties + gear up

---

## Technical Notes

- **Tab type:** Major vertical slice (not a simple side tab)
- **Ownership:** Celestial Pendulum owns all world/bounty/cycle data
- **Completion sync:** References Dailies & Weeklies state; never duplicates it
- **Data freshness:** Worldstate API calls on mount + periodic sync
- **Offline fallback:** Dexie cache for when API is unreachable
