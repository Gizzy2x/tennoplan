// Simulate a call to the worker to check KV status
async function checkKvStatus() {
  try {
    const res = await fetch('https://app.tennoplan.workers.dev/v1/health');
    const data = await res.json();
    console.log('Health endpoint response:');
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Health check error:', e.message);
  }
}

checkKvStatus();
