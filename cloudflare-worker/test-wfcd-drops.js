async function testWfcdDrops() {
  const primary = 'https://drops.warframestat.us/data/all.json';
  const fallback = 'https://raw.githubusercontent.com/WFCD/warframe-drop-data/master/data/all.json';

  console.log('Testing WFCD drops primary...');
  try {
    const res = await fetch(primary, { timeout: 30000 });
    console.log(`Primary: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`  Data size: ${JSON.stringify(data).length} bytes`);
      console.log(`  Sample keys: ${Object.keys(data).slice(0, 5).join(', ')}`);
    } else {
      const text = await res.text();
      console.log(`  Error: ${text.slice(0, 200)}`);
    }
  } catch (e) {
    console.log(`Primary: ERROR - ${e.message}`);
  }

  console.log('\nTesting WFCD drops fallback...');
  try {
    const res = await fetch(fallback, { timeout: 30000 });
    console.log(`Fallback: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`  Data size: ${JSON.stringify(data).length} bytes`);
      console.log(`  Sample keys: ${Object.keys(data).slice(0, 5).join(', ')}`);
    } else {
      const text = await res.text();
      console.log(`  Error: ${text.slice(0, 200)}`);
    }
  } catch (e) {
    console.log(`Fallback: ERROR - ${e.message}`);
  }
}

testWfcdDrops().catch(console.error);
