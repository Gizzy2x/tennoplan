// Test if we can fetch calamity files
const files = [
  'ExportWarframes.json',
  'ExportWeapons.json',
];

const baseUrl = 'https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/master/';

async function testFetch() {
  for (const file of files) {
    const url = baseUrl + file;
    try {
      const res = await fetch(url, { timeout: 30000 });
      console.log(`${file}: ${res.status}`);
      if (!res.ok) {
        const text = await res.text();
        console.log(`  Error: ${text.slice(0, 200)}`);
      } else {
        const data = await res.json();
        console.log(`  Size: ${JSON.stringify(data).length} bytes`);
      }
    } catch (e) {
      console.log(`${file}: ERROR - ${e.message}`);
    }
  }
}

testFetch().catch(console.error);
