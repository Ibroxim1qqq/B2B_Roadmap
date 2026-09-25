import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../');

const uysotJson = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'src/lib/uysot-domtut-data.json'), 'utf-8'));
const uysotData = Array.isArray(uysotJson) ? uysotJson : uysotJson.rows || [];
const dshkData = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'src/lib/real-sheets-data.json'), 'utf-8')).rows;

console.log(`\n========================================`);
console.log(`🤖 VERIFYING FREE AI ROUTE ADVISOR & BRIEFING`);
console.log(`========================================`);

async function runTests() {
  const baseUrl = 'http://localhost:3001';

  // Test 1: AI Route Planning for Samarqand (DSHK)
  console.log(`\n1. Testing POST /api/ai/route-advisor (Samarqand pool)...`);
  const r1 = await fetch(`${baseUrl}/api/ai/route-advisor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'plan_route',
      user_lat: 39.6542,
      user_lng: 66.9597,
      prompt: 'Registon atrofidagi eng yaqin va borilmagan 5 ta TJM',
      unvisited_only: true,
      max_stops: 5,
      objects_pool: dshkData.slice(0, 50)
    })
  });

  if (!r1.ok) throw new Error(`HTTP error ${r1.status}`);
  const j1 = await r1.json();
  if (!j1.success || !j1.data) throw new Error('API returned failure for Samarqand route');
  console.log(`✅ Route generated: "${j1.data.route_name}"`);
  console.log(`✅ Engine used: ${j1.data.engine_used || 'heuristic'}`);
  console.log(`✅ Stops count: ${j1.data.recommended_stops?.length || 0}`);
  console.log(`   Sample Stop 1: ${j1.data.recommended_stops[0]?.object_name}`);
  console.log(`   Sample Reason: ${j1.data.recommended_stops[0]?.reason}`);
  console.log(`   Sample Pitch Tip: ${j1.data.recommended_stops[0]?.pitch_tip}`);

  // Test 2: AI Route Planning for UYSOT.UZ (Tashkent Domtut)
  console.log(`\n2. Testing POST /api/ai/route-advisor (UYSOT.UZ Tashkent pool)...`);
  const r2 = await fetch(`${baseUrl}/api/ai/route-advisor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'plan_route',
      company_id: 'uysot',
      user_lat: 41.2995,
      user_lng: 69.2401,
      prompt: 'Chilonzor va Yunusoboddagi yuqori ustuvorlikdagi TJMlar',
      high_priority_only: false,
      max_stops: 4,
      objects_pool: uysotData.slice(0, 30)
    })
  });

  if (!r2.ok) throw new Error(`HTTP error ${r2.status}`);
  const j2 = await r2.json();
  if (!j2.success || !j2.data) throw new Error('API returned failure for UYSOT route');
  console.log(`✅ UYSOT Route generated: "${j2.data.route_name}"`);
  console.log(`✅ Stops count: ${j2.data.recommended_stops?.length || 0}`);
  for (const s of j2.data.recommended_stops) {
    if (!String(s.source_id).startsWith('domtut_')) {
      throw new Error(`Data leakage! Found non-domtut object in UYSOT AI route: ${s.source_id}`);
    }
  }
  console.log(`✅ 100% Purity verified: All recommended stops belong strictly to UYSOT.UZ`);

  // Test 3: Pitch Briefing for a single complex
  console.log(`\n3. Testing POST /api/ai/route-advisor (action: pitch_briefing)...`);
  const sampleObj = dshkData[0];
  const r3 = await fetch(`${baseUrl}/api/ai/route-advisor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'pitch_briefing',
      target_object: sampleObj
    })
  });

  if (!r3.ok) throw new Error(`HTTP error ${r3.status}`);
  const j3 = await r3.json();
  if (!j3.success || !j3.data) throw new Error('API returned failure for pitch_briefing');
  console.log(`✅ Pitch briefing generated for: ${j3.data.object_name}`);
  console.log(`   Summary: ${j3.data.profile_summary}`);
  console.log(`   Selling Points (${j3.data.selling_points?.length || 0}):`);
  j3.data.selling_points?.forEach(p => console.log(`     - ${p}`));
  console.log(`   Strategy: ${j3.data.negotiation_strategy}`);

  console.log(`\n4. Testing POST /api/ai/route-advisor (action: chat, database statistics query)...`);
  const r4 = await fetch(`${baseUrl}/api/ai/route-advisor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'chat',
      message: 'Bazada jami nechta bino bor va statistika qanday?'
    })
  });
  if (!r4.ok) throw new Error(`HTTP error ${r4.status}`);
  const j4 = await r4.json();
  if (!j4.success || !j4.data?.text) throw new Error('API returned failure for chat stats query');
  console.log(`✅ AI Chat Stats Response:\n   ${j4.data.text.slice(0, 120)}...`);

  console.log(`\n5. Testing POST /api/ai/route-advisor (action: chat, nearest buildings with route action)...`);
  const r5 = await fetch(`${baseUrl}/api/ai/route-advisor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'chat',
      user_lat: 39.6542,
      user_lng: 66.9597,
      message: 'Eng yaqin 5 ta binoni topib ber'
    })
  });
  if (!r5.ok) throw new Error(`HTTP error ${r5.status}`);
  const j5 = await r5.json();
  if (!j5.success || !j5.data) throw new Error('API returned failure for chat nearest query');
  console.log(`✅ Suggested objects returned: ${j5.data.suggested_objects?.length || 0}`);
  console.log(`✅ Actions attached: ${j5.data.actions?.length || 0}`);
  if (j5.data.actions?.[0]?.type === 'apply_route') {
    console.log(`✅ Action type "apply_route" confirmed with ${j5.data.actions[0].route_stops?.length || 0} stops!`);
  }

  console.log(`\n6. Testing POST /api/ai/route-advisor (action: chat, UYSOT Toshkent district isolation)...`);
  const r6 = await fetch(`${baseUrl}/api/ai/route-advisor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'chat',
      company_id: 'uysot',
      message: 'Chilonzor tumanidagi binolar'
    })
  });
  if (!r6.ok) throw new Error(`HTTP error ${r6.status}`);
  const j6 = await r6.json();
  if (!j6.success || !j6.data) throw new Error('API returned failure for UYSOT chat query');
  console.log(`✅ UYSOT suggested objects: ${j6.data.suggested_objects?.length || 0}`);
  for (const s of j6.data.suggested_objects || []) {
    if (!String(s.source_id).startsWith('domtut_')) {
      throw new Error(`Data leakage in AI Chat! Found non-domtut ID: ${s.source_id}`);
    }
  }
  console.log(`✅ UYSOT strict company data isolation 100% verified in AI Chat!`);

  console.log(`\n🎉 ALL AI INTEGRATION & CHAT TESTS PASSED WITH 100% SUCCESS!`);
}

runTests().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
