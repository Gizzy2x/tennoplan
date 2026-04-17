# Solar Rail Feed — System Activity & Events Hub

**Date:** 2026-04-17  
**Status:** Placeholder | Phase 1 in planning

---

## What It Is

**Solar Rail Feed** is a **unified activity feed** of everything important happening in the Warframe system **that is NOT cycle-based**. It provides a real-time overview of all urgent, limited-time, and high-value events players should be aware of.

---

## What It Tracks

### 1. **Invasions**
- Active invasions (faction vs. faction)
- Invasion location, duration, progress
- Invasion rewards (Void Keys, resources, cosmetics)
- When invasion ends / switches side

### 2. **Alerts**
- Alert missions (one-time, limited-time)
- Alert type, location, difficulty requirement
- Rewards (credits, resources, blueprints, cosmetics)
- Time remaining before alert expires

### 3. **Events**
- Seasonal events, limited-time activities
- Event name, description, start/end dates
- Event-specific rewards and progression
- Event status (active, incoming, ended)

### 4. **Sorties**
- Daily 3-mission chain (varies in mission type/difficulty each day)
- High-value rewards (void key bundles, kuva, resources)
- Resets daily (~24h expiry)
- Shows current sortie squad difficulty & composition

### 5. **Archon Hunt**
- Weekly 3-mission chain + Archon boss encounter
- Archon Shard rewards (critical for endgame progression)
- Expires in ~7 days (weekly reset)
- Shows current week's Archon and reward structure

### 6. **Arbitrations**
- Rotating single mission with Vitus Essence rewards
- Changes frequently (rotates daily or per-mission-type)
- High-difficulty, endgame-focused content
- Shows current mission type, location, duration until rotation

### 7. **Persistent Enemies / Acolytes**
- Active enemy spawns (e.g., Acolytes, Sisters of Parvos variants)
- Unique high-value drops (Rivens, weapons, cosmetics)
- Spawn and despawn dynamically
- Track active enemies + estimated time until next rotation/despawn

### 8. **News**
- Official in-game news items and announcements
- Patch notes, event announcements, updates
- Pulled directly from Warframe's /news API endpoint
- Helps players stay informed about system changes and events

### 9. **Other System Events**
- Void Fissure tracking (separate from Celestial Pendulum world cycles)
- Baro Ki'Teer visits (void trader schedule)
- Prime Vault relics and rotations
- Nightwave/seasonal battle pass updates
- Any other time-sensitive game activities

---

## Key Distinction: Celestial Pendulum vs. Solar Rail Feed

| | **Celestial Pendulum** | **Solar Rail Feed** |
|---|---|---|
| **Focus** | World cycles & bounties | System events & activities |
| **Data** | World states, cycles, bounties, drop rates, resources | Invasions, alerts, events, limited-time activities |
| **Time Basis** | Cycle-dependent (day/night, zone rotations) | Event-dependent (alerts expire, invasions end) |
| **Planning** | "What should I farm right now?" | "What limited-time content shouldn't I miss?" |
| **Farming** | Long-term routing & cycle planning | Quick catch opportunities before expiry |

---

## Design Principles

- **Feed-like:** List view showing what's active NOW + what's coming soon
- **Non-cyclic:** Only tracks events outside the world cycle system
- **Scannable:** Quick visual hierarchy — most urgent/expiring soon at top
- **Actionable:** Click to see full details, rewards, or time remaining
- **Completable:** Light tie to Dailies & Weeklies (optional completion flags)

---

## Data Sources & Architecture

**Primary API:** https://api.warframestat.us/
- Provides: invasions, alerts, events, void trader, nightwave, void fissures

**Dexie Storage:**
- Cache current feed items
- Track which alerts/invasions user has seen
- Sync completion flags to Dailies & Weeklies if marked

---

## User Journey

1. **Open Solar Rail Feed:** See a feed of all active invasions, alerts, events
2. **Quick scan:** "What expires soon?" — visual indicators for urgent items
3. **Click into item:** See full details, rewards, time remaining, difficulty
4. **Optional flag:** Mark as "completed" or "watched" (syncs to Dailies & Weeklies if needed)
5. **Stay updated:** Feed refreshes as items expire and new ones arrive

---

## Technical Notes

- **Tab type:** Major vertical slice (complement to Celestial Pendulum)
- **Ownership:** Solar Rail Feed owns all non-cycle-based event data
- **Completion sync:** Light tie to Dailies & Weeklies (optional, never duplicates state)
- **Data freshness:** API calls on mount + periodic sync (alerts/invasions change frequently)
- **Offline fallback:** Dexie cache for when API is unreachable
- **Sort strategy:** By expiry time (most urgent first), then by reward value
