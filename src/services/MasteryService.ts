/**
 * MasteryService — Single-pipe writer for the `progression` Dexie table.
 *
 * Rules:
 *  - This is the ONLY place in the app that writes to db.progression.
 *  - All reads happen through useProgression (useLiveQuery).
 *  - The service itself is pure async logic; it has no React dependencies.
 */

import { db } from '@/adapters/storage/db';
import {
  ProgressionStatus,
  type ManifestItem,
  type CategoryProgress,
} from '@/core/domain/progression';
import type { ItemCategory } from '@/core/domain/items';

// ---------------------------------------------------------------------------
// Master Item Manifest (stub)
//
// In production this will be generated at build time from @wfcd/items.
// logKey = the last path-segment that LogParserService currently extracts.
// ---------------------------------------------------------------------------

const MASTER_MANIFEST: ManifestItem[] = [
  // Warframes
  { uniqueName: '/Lotus/Powersuits/Ninja/Ninja',             name: 'Ash',         category: 'Warframes', logKey: 'Ninja'          },
  { uniqueName: '/Lotus/Powersuits/Banshee/Banshee',         name: 'Banshee',     category: 'Warframes', logKey: 'Banshee'        },
  { uniqueName: '/Lotus/Powersuits/Chroma/Chroma',           name: 'Chroma',      category: 'Warframes', logKey: 'Chroma'         },
  { uniqueName: '/Lotus/Powersuits/Ember/Ember',             name: 'Ember',       category: 'Warframes', logKey: 'Ember'          },
  { uniqueName: '/Lotus/Powersuits/Excalibur/Excalibur',     name: 'Excalibur',   category: 'Warframes', logKey: 'Excalibur'      },
  { uniqueName: '/Lotus/Powersuits/Frost/Frost',             name: 'Frost',       category: 'Warframes', logKey: 'Frost'          },
  { uniqueName: '/Lotus/Powersuits/Loki/Loki',               name: 'Loki',        category: 'Warframes', logKey: 'Loki'           },
  { uniqueName: '/Lotus/Powersuits/Mag/Mag',                 name: 'Mag',         category: 'Warframes', logKey: 'Mag'            },
  { uniqueName: '/Lotus/Powersuits/Mesa/Mesa',               name: 'Mesa',        category: 'Warframes', logKey: 'Mesa'           },
  { uniqueName: '/Lotus/Powersuits/Nova/Nova',               name: 'Nova',        category: 'Warframes', logKey: 'Nova'           },
  { uniqueName: '/Lotus/Powersuits/Nyx/Nyx',                 name: 'Nyx',         category: 'Warframes', logKey: 'Nyx'            },
  { uniqueName: '/Lotus/Powersuits/Oberon/Oberon',           name: 'Oberon',      category: 'Warframes', logKey: 'Oberon'         },
  { uniqueName: '/Lotus/Powersuits/Rhino/Rhino',             name: 'Rhino',       category: 'Warframes', logKey: 'Rhino'          },
  { uniqueName: '/Lotus/Powersuits/Saryn/Saryn',             name: 'Saryn',       category: 'Warframes', logKey: 'Saryn'          },
  { uniqueName: '/Lotus/Powersuits/Trinity/Trinity',         name: 'Trinity',     category: 'Warframes', logKey: 'Trinity'        },
  { uniqueName: '/Lotus/Powersuits/Valkyr/Valkyr',          name: 'Valkyr',      category: 'Warframes', logKey: 'Valkyr'         },
  { uniqueName: '/Lotus/Powersuits/Volt/Volt',               name: 'Volt',        category: 'Warframes', logKey: 'Volt'           },
  { uniqueName: '/Lotus/Powersuits/Zephyr/Zephyr',          name: 'Zephyr',      category: 'Warframes', logKey: 'Zephyr'         },

  // Primary
  { uniqueName: '/Lotus/Weapons/Tenno/Rifle/BootlegBraton',  name: 'Braton',      category: 'Primary',   logKey: 'BootlegBraton'  },
  { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Boltor',         name: 'Boltor',      category: 'Primary',   logKey: 'Boltor'         },
  { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Soma',           name: 'Soma',        category: 'Primary',   logKey: 'Soma'           },
  { uniqueName: '/Lotus/Weapons/Corpus/LongGuns/Opticor',   name: 'Opticor',     category: 'Primary',   logKey: 'Opticor'        },
  { uniqueName: '/Lotus/Weapons/Tenno/Shotgun/Hek',          name: 'Hek',         category: 'Primary',   logKey: 'Hek'            },
  { uniqueName: '/Lotus/Weapons/Tenno/Rifle/Grakata',        name: 'Grakata',     category: 'Primary',   logKey: 'Grakata'        },
  { uniqueName: '/Lotus/Weapons/Tenno/Bow/Dread',            name: 'Dread',       category: 'Primary',   logKey: 'Dread'          },
  { uniqueName: '/Lotus/Weapons/Grineer/LongGuns/Hind',      name: 'Hind',        category: 'Primary',   logKey: 'Hind'           },

  // Secondary
  { uniqueName: '/Lotus/Weapons/Tenno/Pistols/Lato',         name: 'Lato',        category: 'Secondary', logKey: 'Lato'           },
  { uniqueName: '/Lotus/Weapons/Tenno/Pistols/Lex',          name: 'Lex',         category: 'Secondary', logKey: 'Lex'            },
  { uniqueName: '/Lotus/Weapons/Tenno/Pistols/Furis',        name: 'Furis',       category: 'Secondary', logKey: 'Furis'          },
  { uniqueName: '/Lotus/Weapons/Corpus/Pistols/Staticor',    name: 'Staticor',    category: 'Secondary', logKey: 'Staticor'       },
  { uniqueName: '/Lotus/Weapons/Tenno/Pistols/Despair',      name: 'Despair',     category: 'Secondary', logKey: 'Despair'        },

  // Melee
  { uniqueName: '/Lotus/Weapons/Tenno/Melee/Sword/Skana',    name: 'Skana',       category: 'Melee',     logKey: 'Skana'          },
  { uniqueName: '/Lotus/Weapons/Tenno/Melee/Sword/HeatSword', name: 'Heat Sword', category: 'Melee',     logKey: 'HeatSword'      },
  { uniqueName: '/Lotus/Weapons/Tenno/Melee/Scythe/Hate',    name: 'Hate',        category: 'Melee',     logKey: 'Hate'           },
  { uniqueName: '/Lotus/Weapons/Tenno/Melee/Machete/Ack',    name: 'Ack & Brunt', category: 'Melee',     logKey: 'Ack'            },
  { uniqueName: '/Lotus/Weapons/Tenno/Melee/Nikana/Dragon',  name: 'Dragon Nikana', category: 'Melee',   logKey: 'Dragon'         },
  { uniqueName: '/Lotus/Weapons/Tenno/Melee/Staff/BoStaff',  name: 'Bo',          category: 'Melee',     logKey: 'BoStaff'        },

  // Archwing
  { uniqueName: '/Lotus/Powersuits/Archwing/Itzal/Itzal',   name: 'Itzal',       category: 'Archwing',  logKey: 'Itzal'          },
  { uniqueName: '/Lotus/Powersuits/Archwing/Elytron/Elytron', name: 'Elytron',   category: 'Archwing',  logKey: 'Elytron'        },
  { uniqueName: '/Lotus/Powersuits/Archwing/Odonata/Odonata', name: 'Odonata',   category: 'Archwing',  logKey: 'Odonata'        },
];

// Build a fast lookup: logKey → ManifestItem
const MANIFEST_BY_LOG_KEY = new Map<string, ManifestItem>(
  MASTER_MANIFEST.map(item => [item.logKey, item]),
);

// ---------------------------------------------------------------------------
// MasteryService
// ---------------------------------------------------------------------------

export const MasteryService = {
  /**
   * Reconcile a list of log-parsed item tokens against the manifest.
   *
   * For each token that matches a manifest entry:
   *  - If the item is not yet in the progression table → insert as IN_PROGRESS.
   *  - If the item is already MASTERED → skip (mastery is never downgraded).
   *  - Otherwise → upgrade status to IN_PROGRESS.
   *
   * This is the ONLY function that writes to db.progression.
   *
   * @param logItems - Raw tokens from LogParserService.parseLog()
   */
  async reconcileInventory(logItems: string[]): Promise<void> {
    const now = Date.now();

    // Batch-load all existing progression rows keyed by itemId for O(1) lookup
    const existing = await db.progression.toArray();
    const byItemId = new Map(existing.map(r => [r.itemId, r]));

    const upserts = logItems.flatMap(token => {
      const manifest = MANIFEST_BY_LOG_KEY.get(token);
      if (!manifest) return []; // Unknown item — ignore until manifest is updated

      const current = byItemId.get(manifest.uniqueName);

      // Never downgrade a MASTERED item
      if (current?.status === ProgressionStatus.MASTERED) return [];

      return [{
        ...(current ?? {}),               // carry existing id so Dexie does an update
        itemId:      manifest.uniqueName,
        itemName:    manifest.name,
        category:    manifest.category,
        status:      ProgressionStatus.IN_PROGRESS,
        lastUpdated: now,
      }];
    });

    if (upserts.length > 0) {
      await db.progression.bulkPut(upserts);
    }
  },

  /**
   * Mark a single item as MASTERED.
   * Called from the UI when the user manually confirms rank-30.
   *
   * @param itemId - uniqueName of the item (primary progression key)
   */
  async markMastered(itemId: string): Promise<void> {
    const now = Date.now();
    const existing = await db.progression.where('itemId').equals(itemId).first();
    if (!existing) return;

    await db.progression.update(existing.id!, {
      status:      ProgressionStatus.MASTERED,
      lastUpdated: now,
    });
  },

  /**
   * Seed the progression table with MISSING entries for every manifest item
   * that does not yet have a row. Safe to call multiple times (idempotent).
   *
   * Intended to be called once on first launch so the Registry shows all items,
   * not only those that have appeared in the log.
   */
  async seedMissingEntries(): Promise<void> {
    const now = Date.now();
    const existing = await db.progression.toArray();
    const knownIds = new Set(existing.map(r => r.itemId));

    const seeds = MASTER_MANIFEST
      .filter(item => !knownIds.has(item.uniqueName))
      .map(item => ({
        itemId:      item.uniqueName,
        itemName:    item.name,
        category:    item.category,
        status:      ProgressionStatus.MISSING,
        lastUpdated: now,
      }));

    if (seeds.length > 0) {
      await db.progression.bulkAdd(seeds);
    }
  },

  /**
   * Compute per-category mastery statistics from the current progression table.
   *
   * @returns Array of CategoryProgress, sorted alphabetically by category name.
   */
  async getProgressStats(): Promise<CategoryProgress[]> {
    const all = await db.progression.toArray();

    // Group by category
    const grouped = new Map<ItemCategory, { mastered: number; total: number }>();

    for (const row of all) {
      const entry = grouped.get(row.category) ?? { mastered: 0, total: 0 };
      entry.total++;
      if (row.status === ProgressionStatus.MASTERED) entry.mastered++;
      grouped.set(row.category, entry);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, { mastered, total }]) => ({
        category,
        mastered,
        total,
        pct:   total > 0 ? mastered / total : 0,
        label: `${category}: ${mastered}/${total} Mastered`,
      }));
  },
};
