import { db } from '../adapters/storage/db';

export const LogParserService = {
  // This looks for "Inventory" or "Mission Reward" lines in the text
  parseLog(content: string) {
    const lines = content.split('\n');
    const discoveredItems: string[] = [];

    // We look for specific Warframe log patterns
    // Example: "/Lotus/Types/Items/MiscItems/OrokinCell"
    const itemRegex = /\/Lotus\/Types\/Items\/(\w+\/)*(\w+)/g;

    lines.forEach(line => {
      let match;
      while ((match = itemRegex.exec(line)) !== null) {
        discoveredItems.push(match[2]); // This grabs the item name (e.g., OrokinCell)
      }
    });

    return [...new Set(discoveredItems)]; // Return unique items found
  },

  async syncInventoryToDb(items: string[]) {
    // Save these to your Dexie database so the app "remembers" you have them
    await db.cache.put({
      key: 'user_inventory',
      data: items,
      updatedAt: Date.now(),
      expiresAt: Date.now() + (1000 * 60 * 60 * 24) // 24 hour "soft" expiry
    });
  }
};
