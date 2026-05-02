async function listCalamityFiles() {
  const baseUrl = 'https://api.github.com/repos/calamity-inc/warframe-public-export-plus/contents';
  
  try {
    const res = await fetch(baseUrl);
    const data = await res.json();
    
    console.log('Available files in calamity-inc/warframe-public-export-plus:');
    data.forEach(file => {
      if (file.name.endsWith('.json')) {
        console.log(`  ${file.name}`);
      }
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
}

listCalamityFiles();
