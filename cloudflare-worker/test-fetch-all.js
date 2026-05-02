async function testAllFetches() {
  const files = [
    'ExportWarframes.json',
    'ExportWeapons.json',
    'ExportSentinels.json',
    'ExportAbilities.json',
    'ExportUpgrades.json',
    'ExportRecipes.json',
    'ExportRelics.json',
    'ExportArcanes.json',
    'ExportResources.json',
    'ExportKeys.json',
    'ExportFlavour.json',
    'ExportFusionBundles.json',
    'ExportGear.json',
  ];

  const baseUrl = 'https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/master/';
  let success = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const res = await fetch(baseUrl + file, { timeout: 30000 });
      if (res.ok) {
        success++;
        console.log(`✓ ${file}`);
      } else {
        failed++;
        console.log(`✗ ${file} (${res.status})`);
      }
    } catch (e) {
      failed++;
      console.log(`✗ ${file} (ERROR: ${e.message})`);
    }
  }

  console.log(`\nResult: ${success}/${files.length} files fetched successfully`);
  process.exit(failed > 0 ? 1 : 0);
}

testAllFetches();
