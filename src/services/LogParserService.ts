/**
 * LogParserService — pure functions for parsing EE.log files.
 * No Dexie imports; no side-effects.
 * Inventory persistence is handled by SyncService.updateUserInventory().
 */

export const LogParserService = {
  /**
   * Parse EE.log content and extract discovered item names.
   * @param content - Raw text content from EE.log file
   * @returns Array of unique item names found in the log
   */
  parseLog(content: string): string[] {
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
  }
};
