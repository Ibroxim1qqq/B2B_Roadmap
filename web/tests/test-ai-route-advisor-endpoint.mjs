import fs from 'fs';
import path from 'path';

// Load .env.local
const root = 'd:/b2b Samarqand/web';
const envContent = fs.readFileSync(path.join(root, '.env.local'), 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[match[1]] = val;
  }
});

// Import route handler
const routeModule = await import('../src/app/api/ai/route-advisor/route.ts');
const { POST } = routeModule;

async function testEndpoint() {
  console.log('Testing POST /api/ai/route-advisor handler...');

  const req = new Request('http://localhost:3000/api/ai/route-advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'chat',
      message: 'Yunusobotdagi 5ta menga eng yaqin uyni korsat'
    })
  });

  const res = await POST(req);
  const json = await res.json();

  console.log('Response status:', res.status);
  console.log('Success:', json.success);
  console.log('Reply text:\n', json.data?.text);
  console.log('Suggested objects count:', json.data?.suggested_objects?.length);
  console.log('Suggested objects:', json.data?.suggested_objects?.map(o => ({
    name: o.object_name,
    district: o.district_name,
    distance_km: o.dist_km,
    source_id: o.source_id
  })));
  console.log('Actions count:', json.data?.actions?.length);
  console.log('Actions:', json.data?.actions?.map(a => a.label));

  if (!json.success) throw new Error('API returned success: false');
  if (json.data?.suggested_objects?.length !== 5) {
    throw new Error(`Expected 5 objects, got ${json.data?.suggested_objects?.length}`);
  }
  const first = json.data?.suggested_objects[0];
  if (parseFloat(first.dist_km) > 5) {
    throw new Error(`Expected nearest object to be within Yunusobod (<5km), got ${first.dist_km} km`);
  }

  console.log('\n>>> SUCCESS: All AI advisor Yunusobod assertions passed! <<<');
}

testEndpoint().catch(err => {
  console.error('Test FAILED:', err);
  process.exit(1);
});
