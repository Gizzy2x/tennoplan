import { VercelRequest, VercelResponse } from '@vercel/node';
import { WorldState } from 'warframe-worldstate-parser';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Fetch the absolute raw data
    const response = await fetch('https://content.warframe.com/dynamic/worldState.php');
    const rawData = await response.text();

    // 2. Parse EVERYTHING using the community standard (must use async build())
    const ws = await WorldState.build(rawData);

    // 3. Set Cache Headers
    // Vercel caches for 60s; stale content served for up to 30s while revalidating
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

    // 4. Send the full "Everything" packet — all fields exposed by the parser
    return res.status(200).json({
      // Meta
      timestamp:            ws.timestamp,
      buildLabel:           ws.buildLabel,

      // News & Events
      news:                 ws.news,
      events:               ws.events,

      // Alerts & Missions
      alerts:               ws.alerts,
      sortie:               ws.sortie,
      archonHunt:           ws.archonHunt,       // weekly Archon Hunt
      arbitration:          ws.arbitration,
      kuva:                 ws.kuva,             // Kuva Siphon / Flood missions
      invasions:            ws.invasions,

      // Fissures
      fissures:             ws.fissures,         // ActiveMissions + VoidStorms combined

      // Syndicates
      syndicateMissions:    ws.syndicateMissions,
      darkSectors:          ws.darkSectors,

      // World Cycles
      earthCycle:           ws.earthCycle,
      cetusCycle:           ws.cetusCycle,
      vallisCycle:          ws.vallisCycle,
      cambionCycle:         ws.cambionCycle,
      zarimanCycle:         ws.zarimanCycle,
      duviriCycle:          ws.duviriCycle,      // Duviri circuit rotation

      // Traders
      voidTraders:          ws.voidTraders,      // full array (Baro + any others)
      vaultTrader:          ws.vaultTrader,      // Varzia — Prime Resurgence

      // Nightwave & Challenges
      nightwave:            ws.nightwave,
      weeklyChallenges:     ws.weeklyChallenges,
      conclaveChallenges:   ws.conclaveChallenges,

      // Economy & Sales
      dailyDeals:           ws.dailyDeals,       // Darvo deals
      flashSales:           ws.flashSales,
      globalUpgrades:       ws.globalUpgrades,

      // Progression & Enemies
      steelPath:            ws.steelPath,
      persistentEnemies:    ws.persistentEnemies,
      constructionProgress: ws.constructionProgress, // Fomorian / Razorback %
      simaris:              ws.simaris,          // Sanctuary synthesis target

      // New / Misc
      archimedeas:          ws.archimedeas,      // EDA (Elite Deep Archimedea)
      calendar:             ws.calendar,         // 1999 seasonal calendar
      sentientOutposts:     ws.sentientOutposts,
      kinepage:             ws.kinepage,
      faceoffBonus:         ws.faceoffBonus,
      questToConquerCancer: ws.questToConquerCancer,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch Worldstate' });
  }
}
