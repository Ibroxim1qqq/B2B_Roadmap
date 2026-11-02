import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { defineTest, SRC_ROOT } from './harness.ts';
import {
  analyzeAndSearchDatabase, filterPoolByPrompt, normalizeText, parseCriteria, resolveLocation,
  smartHeuristicBriefing, smartHeuristicPlanner
} from '../../src/lib/aiEngine.ts';

// ============================================================================
// TIER 19: AI assistant answers must come from the data and respect every filter
// ============================================================================

const meta = (feature: string, description: string) => ({ tier: 19, milestone: 19, feature, description });

const dshk: any[] = JSON.parse(fs.readFileSync(path.join(SRC_ROOT, 'lib/real-sheets-data.json'), 'utf-8')).rows;
const uysotRaw = JSON.parse(fs.readFileSync(path.join(SRC_ROOT, 'lib/uysot-domtut-data.json'), 'utf-8'));
const uysot: any[] = Array.isArray(uysotRaw) ? uysotRaw : uysotRaw.rows;

const askDshk = (q: string, lat?: number, lng?: number) => analyzeAndSearchDatabase(q, dshk, 'Sinov', lat, lng, false);
const askUysot = (q: string) => analyzeAndSearchDatabase(q, uysot, 'UYSOT', undefined, undefined, true);
const byId = (pool: any[], id: string) => pool.find(o => String(o.source_id) === id);

defineTest('Apostrophe variants read the same', meta('AI_NORMALIZE', "ko'p, ko‘p, ko`p"), () => {
  assert.equal(normalizeText("Ko'p"), normalizeText('ko‘p'));
  assert.equal(parseCriteria('yo‘nalish tuz').wantsRoute, true);
  assert.equal(resolveLocation("Mirzo Ulug‘bekdagi uylar")?.shortName, "Mirzo Ulug'bek");
});

defineTest('The most specific location wins and every district is known', meta('AI_LOCATION', 'registry plus all regions'), () => {
  assert.equal(resolveLocation('Samarqand viloyati')?.name, 'Samarqand viloyati');
  assert.equal(resolveLocation('Samarqand tumani')?.name, 'Samarqand tumani');
  assert.ok(resolveLocation('Andijon viloyati')?.isRegion);
  assert.equal(resolveLocation('Qibray tumanidagi binolar')?.name, 'Qibray tumani');
  assert.equal(resolveLocation('salom'), null);
});

defineTest('Counts in a question are not confused with limits', meta('AI_LIMIT', 'filters versus result size'), () => {
  assert.equal(parseCriteria('5 ta bino').limit, 5);
  assert.equal(parseCriteria('Urgutdagi 12 ta uy').limit, 12);
  const c = parseCriteria("100 tadan ko'p xonadonli binolar");
  assert.equal(c.minApartments, 100);
  assert.equal(c.limit, 5);
  assert.equal(parseCriteria('100 ta bino').limit, 20);
});

defineTest('A short word does not match the whole database', meta('AI_NO_FALSE_MATCH', '"ta" and common words are not search terms'), () => {
  assert.deepEqual(parseCriteria('5 ta bino korsat').terms, []);
  assert.deepEqual(parseCriteria('Urgutdagi 5 ta borilmagan bino').terms, []);
  const r = askDshk('xyzqwerty123 degan bino');
  assert.equal(r.suggestedObjects.length, 0);
  assert.match(r.replyText, /topilmadi/);
});

defineTest('Greeting gets help, not search results', meta('AI_GREETING', 'salom'), () => {
  for (const q of ['salom', 'Assalomu alaykum', 'rahmat', '']) {
    const r = askDshk(q);
    assert.equal(r.suggestedObjects.length, 0, q);
    assert.match(r.replyText, /yordam beraman/, q);
  }
});

defineTest('District statistics count only that district', meta('AI_STATS_SCOPE', '"Urgutda nechta" is not the whole base'), () => {
  const r = askDshk('Urgutda nechta bino bor?');
  const expected = dshk.filter(o => String(o.district_soato) === '1718238').length;
  assert.ok(expected > 0);
  assert.match(r.replyText, /Urgut tumani/);
  assert.equal(r.matchedCount, expected);
  assert.equal(askDshk('jami nechta obyekt bor').matchedCount, dshk.length);
  const region = askDshk('Samarqand viloyati statistikasi');
  assert.match(region.replyText, /statistika/);
  assert.equal(region.matchedCount, dshk.filter(o => String(o.region_soato) === '1718').length);
});

defineTest('Every suggested object satisfies every filter', meta('AI_HARD_FILTERS', 'no silent relaxing'), () => {
  const r = askDshk("Urgutdagi 10 qavatdan baland 5 ta bino");
  assert.ok(r.suggestedObjects.length > 0);
  for (const s of r.suggestedObjects) {
    const o = byId(dshk, s.source_id);
    assert.equal(String(o.district_soato), '1718238');
    assert.ok(Math.max(...String(o.floors).match(/\d+/g)!.map(Number)) >= 10, o.floors);
  }
  const apts = askDshk("200 tadan ko'p xonadonli binolar");
  assert.ok(apts.suggestedObjects.length > 0);
  for (const s of apts.suggestedObjects) assert.ok(parseInt(s.apartment_count, 10) >= 200);
});

defineTest('A range of floors matches only when the floor is inside it', meta('AI_FLOOR_RANGE', '9-16'), () => {
  const pool = [
    { source_id: 'a', object_name: 'A', floors: '9-16', latitude: 41, longitude: 69, region_soato: '1726' },
    { source_id: 'b', object_name: 'B', floors: '20', latitude: 41, longitude: 69, region_soato: '1726' }
  ];
  const r = analyzeAndSearchDatabase('12 qavatli binolar', pool, 'T');
  assert.deepEqual(r.suggestedObjects.map(s => s.source_id), ['a']);
  const none = analyzeAndSearchDatabase('50 qavatli binolar', pool, 'T');
  assert.equal(none.suggestedObjects.length, 0);
  assert.match(none.replyText, /topilmadi/);
});

defineTest('Not visited excludes visited objects', meta('AI_NOT_VISITED', 'in chat and in the planner'), () => {
  const pool = [
    { source_id: 'v', object_name: 'V', last_visit: '2026-01-01', latitude: 39.6, longitude: 66.9, region_soato: '1718' },
    { source_id: 'n', object_name: 'N', latitude: 39.6, longitude: 66.9, region_soato: '1718' }
  ];
  assert.deepEqual(analyzeAndSearchDatabase('borilmagan binolar', pool, 'T').suggestedObjects.map(s => s.source_id), ['n']);
  assert.deepEqual(analyzeAndSearchDatabase('borilmagan binolarga marshrut', pool, 'T').routeStops.map(s => s.source_id), ['n']);
  const onlyVisited = [pool[0]];
  assert.equal(smartHeuristicPlanner(onlyVisited, undefined, undefined, true).recommended_stops.length, 0);
});

defineTest('A place outside the dataset is reported, not filled with other objects', meta('AI_OTHER_DATASET', 'UYSOT asked about Samarqand'), () => {
  const r = askUysot('Urgutdagi binolar');
  assert.equal(r.suggestedObjects.length, 0);
  assert.match(r.replyText, /obyekt yo'q/);
});

defineTest('Name search needs every word and reads Russian data from Latin text', meta('AI_NAME_SEARCH', 'precision'), () => {
  const r = askUysot('City Tower');
  assert.ok(r.suggestedObjects.length > 0);
  assert.match(r.suggestedObjects[0].object_name, /City Tower/i);
  assert.ok(askUysot('komfort').matchedCount > 0, 'komfort must match Комфорт');
});

defineTest('Route answers respect the location and give a working action', meta('AI_ROUTE', 'Urgut route stays in Urgut'), () => {
  const r = askDshk('Urgutdagi 4 ta binoga marshrut tuz');
  assert.equal(r.routeStops.length, 4);
  for (const s of r.routeStops) assert.equal(String(byId(dshk, s.source_id).district_soato), '1718238');
  const action = r.actions.find(a => a.type === 'apply_route');
  assert.equal(action?.route_stops?.length, 4);
  for (const s of r.routeStops) assert.ok(Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
});

defineTest('Nearest uses the user position', meta('AI_NEAREST', 'closest first'), () => {
  const r = askDshk('menga eng yaqin 3 ta bino', 40.1, 65.4);
  assert.equal(r.suggestedObjects.length, 3);
  const km = r.suggestedObjects.map(s => parseFloat(s.dist_km));
  assert.ok(km[0] <= km[1] && km[1] <= km[2], km.join());
});

defineTest('District actions switch the map to the right region', meta('AI_FILTER_ACTION', 'region travels with the district'), () => {
  const r = askDshk('Urgutdagi binolar');
  assert.deepEqual(r.actions.find(a => a.type === 'apply_filter')?.filter, { region: '1718', district: 'Urgut' });
});

defineTest('Planner dialog prompt filters, and unreadable text keeps the pool', meta('AI_PLAN_PROMPT', 'filterPoolByPrompt'), () => {
  const { scope, center } = filterPoolByPrompt(dshk, 'Urgut tumanidagi binolar');
  assert.ok(scope.length > 0 && scope.length < dshk.length);
  assert.ok(center);
  assert.equal(filterPoolByPrompt(dshk, '').scope.length, dshk.length);
  assert.equal(filterPoolByPrompt(dshk, 'bugungi eng yaxshi reja').scope.length, dshk.length);
});

defineTest('Briefing never shows empty placeholders', meta('AI_BRIEFING', 'unknown values are not printed'), () => {
  const b = smartHeuristicBriefing({ source_id: '1', object_name: 'Bino', floors: '—', apartment_count: '0', builder: '—' });
  const text = JSON.stringify(b);
  assert.ok(!text.includes('— qavatli'));
  assert.ok(!text.includes('0 ta xonadon'));
  assert.ok(!text.includes('undefined'));
  assert.equal(b.selling_points.length, 3);
});
