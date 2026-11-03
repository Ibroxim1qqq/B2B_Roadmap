import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { defineTest, SRC_ROOT } from './harness.ts';
import { db } from '../../src/lib/db.ts';
import { safeExternalUrl } from '../../src/lib/utils.ts';
import { filterPoolByPrompt, parseCriteria, smartHeuristicPlanner } from '../../src/lib/aiEngine.ts';
import {
  brandOptions, clientOwnerOptions, countActiveFilters, DEFAULT_CLIENT_OWNERS, INITIAL_ADVANCED_FILTERS, matchesObjectFilters, normalizeFilterText, companyOptions, tjmOptions
} from '../../src/lib/filters.ts';

// ============================================================================
// TIER 21: Brand name and the TJM, brand and MChJ filters
// ============================================================================

const meta = (feature: string, description: string) => ({ tier: 21, milestone: 21, feature, description });
const unique = () => `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const advanced = (patch: object) => ({ advanced: { ...INITIAL_ADVANCED_FILTERS, ...patch } });

const llc: any = {
  source_id: '100', object_name: "Ko'p qavatli uy", tjm_name: 'Samarqand Residence', brand_name: 'Golden House',
  builder: '"TXTGROUP" MAS\'ULIYATI CHEKLANGAN JAMIYAT', customer: '"ARCH BUILD" MAS`ULIYATI CHEKLANGAN JAMIYATI', region_soato: '1718'
};
const domtut: any = { source_id: 'domtut_1', object_name: 'ЖК «Yulduzi»', tjm_name: '', builder: 'Xon Saroy', customer: '—', region_soato: '1726' };
const plain: any = { source_id: '200', object_name: 'Boshqa bino', tjm_name: '', builder: '—', customer: '—', region_soato: '1718' };

defineTest('A brand name is saved, read back and cleared', meta('BRAND_STORAGE', 'brand_name lifecycle'), async () => {
  const company = (await db.createCompany(`Co ${unique()}`)).company_id;
  const source = (await db.getObjects(undefined, false)).find(o => !o.is_custom_tjm);
  const id = String(source.source_id);

  await db.updateCompanyData(company, 'u1', id, { brand_name: 'Golden House' });
  const [saved] = await db.getObjects(company, undefined, id);
  assert.equal(saved.brand_name, 'Golden House');
  assert.deepEqual(saved.custom_values?.brand_name, undefined);

  // A later save that leaves the brand out must keep it.
  await db.updateCompanyData(company, 'u1', id, { phone: '555' });
  assert.equal((await db.getObjects(company, undefined, id))[0].brand_name, 'Golden House');

  const [other] = await db.getObjects((await db.createCompany(`Co ${unique()}`)).company_id, undefined, id);
  assert.ok(!other.brand_name, "another company must not see this company's brand");

  await db.clearCompanyData(company, id);
  assert.ok(!(await db.getObjects(company, undefined, id))[0].brand_name);
});

defineTest('A company-created object keeps its brand', meta('BRAND_CUSTOM_OBJECT', 'created with a brand'), async () => {
  const company = `comp_${unique()}`;
  const id = `custom_${unique()}`;
  await db.createCompanyCustomTJM(company, 'u1', id, { object_name: 'Bino', brand_name: 'Mening Brendim', latitude: 41, longitude: 69 });
  assert.equal((await db.getObjectById(id, company)).brand_name, 'Mening Brendim');
});

defineTest('The MChJ long form, quotes and case do not change a match', meta('FILTER_NORMALIZE', 'normalizeFilterText'), () => {
  assert.equal(normalizeFilterText('"TXTGROUP" MAS\'ULIYATI CHEKLANGAN JAMIYAT'), 'txtgroup mchj');
  assert.equal(normalizeFilterText('txtgroup  MCHJ'), 'txtgroup mchj');
  assert.equal(normalizeFilterText('ЖК «Yulduzi»'), 'жк yulduzi');
});

defineTest('TJM, brand and MChJ filters each read their own data', meta('FILTER_NAMES', 'name filters'), () => {
  assert.equal(matchesObjectFilters(llc, advanced({ tjmName: 'samarqand residence' })), true);
  assert.equal(matchesObjectFilters(llc, advanced({ tjmName: "Ko'p qavatli uy" })), false, "the source's object name is not an entered TJM");
  assert.equal(matchesObjectFilters({ ...llc, tjm_name: 'Samarqand Residence 2' }, advanced({ tjmName: 'Samarqand Residence' })), false);

  assert.equal(matchesObjectFilters(llc, advanced({ brandName: 'golden house' })), true);
  assert.equal(matchesObjectFilters(llc, advanced({ brandName: 'TXTGROUP MCHJ' })), false, 'a company is not a brand');
  assert.equal(matchesObjectFilters(domtut, advanced({ brandName: 'xon saroy' })), false, 'a builder is not an entered brand');

  assert.equal(matchesObjectFilters(llc, advanced({ companyName: 'TXTGROUP MCHJ' })), true, 'builder, long and short form');
  assert.equal(matchesObjectFilters(llc, advanced({ companyName: 'ARCH BUILD MCHJ' })), true, 'customer');
  assert.equal(matchesObjectFilters(llc, advanced({ companyName: 'Golden House' })), false);
  assert.equal(matchesObjectFilters(llc, advanced({ brandName: 'golden house', companyName: 'nobody' })), false, 'filters combine');
});

defineTest('Filter lists show only the right source for each name', meta('FILTER_OPTIONS', 'option sources'), () => {
  const objects = [llc, { ...llc, source_id: '101' }, domtut, plain];
  assert.deepEqual(tjmOptions(objects), ['Samarqand Residence'], 'only entered names, never object names');
  assert.deepEqual(brandOptions(objects), ['Golden House'], 'only entered brands, never builders');
  const companies = companyOptions(objects);
  assert.equal(companies.length, 3, 'builder, customer and the Domtut builder, once each');
  assert.ok(companies.some(c => c.includes('TXTGROUP')) && companies.some(c => c.includes('ARCH BUILD')));
  assert.ok(!companies.includes('—'), 'an empty value is not an option');
  const messy: any[] = [{ builder: '-' }, { builder: ',,Zeta MCHJ' }, { builder: '"Alfa" MCHJ' }, { builder: ' ' }];
  assert.deepEqual(companyOptions(messy), ['"Alfa" MCHJ', ',,Zeta MCHJ'], 'no placeholders, and punctuation does not decide the order');
});

defineTest('Search finds a brand, and the name filters count as active', meta('FILTER_SEARCH_COUNT', 'search and count'), () => {
  assert.equal(matchesObjectFilters(llc, { ...advanced({}), search: 'golden' }), true);
  assert.equal(matchesObjectFilters(plain, { ...advanced({}), search: 'golden' }), false);
  assert.equal(countActiveFilters({ ...INITIAL_ADVANCED_FILTERS, tjmName: 'a', brandName: 'b', companyName: 'c' }), 3);
  assert.equal(countActiveFilters({ ...INITIAL_ADVANCED_FILTERS, brandName: '   ' }), 0);
});

defineTest('Whose client it is can be saved and filtered', meta('CLIENT_OWNER', 'client_owner'), async () => {
  const company = (await db.createCompany(`Co ${unique()}`)).company_id;
  const source = (await db.getObjects(undefined, false)).find(o => !o.is_custom_tjm);
  const id = String(source.source_id);
  await db.updateCompanyData(company, 'u1', id, { client_owner: 'Bizniki' });
  const [saved] = await db.getObjects(company, undefined, id);
  assert.equal(saved.client_owner, 'Bizniki');
  assert.equal(saved.custom_values?.client_owner, undefined);

  assert.equal(matchesObjectFilters(saved, advanced({ clientOwner: 'bizniki' })), true);
  assert.equal(matchesObjectFilters(saved, advanced({ clientOwner: 'raqib' })), false);
  assert.equal(matchesObjectFilters(plain, advanced({ clientOwner: 'bizniki' })), false);
  assert.equal(countActiveFilters({ ...INITIAL_ADVANCED_FILTERS, clientOwner: 'x' }), 1);
  assert.ok((await db.getCustomFields()).some(f => f.field_name === 'client_owner'), 'it belongs to the general field list');
  assert.ok((await db.getCustomFields()).some(f => f.field_name === 'brand_name'));
});

defineTest('A saved route keeps the points between A and B', meta('ROUTE_VIA_POINTS', 'via_points'), async () => {
  const via = JSON.stringify([{ lat: 40, lng: 67, name: 'Oraliq' }]);
  const company = `c_${unique()}`;
  await db.saveRoute({ company_id: company, start_lat: 1, start_lng: 1, end_lat: 2, end_lng: 2, via_points: via });
  assert.equal((await db.getRoutes(company))[0].via_points, via);
});

const pool: any[] = [
  { source_id: 'a', object_name: 'Katta bino', apartment_count: '150', floors: '12', latitude: 39.6, longitude: 66.9, difficulty: 'III-toifa', client_owner: 'Bizniki', builder: '"TXTGROUP" MCHJ', brand_name: 'Golden House' },
  { source_id: 'b', object_name: 'Kichik bino', apartment_count: '40', floors: '5', latitude: 39.7, longitude: 66.9, difficulty: 'II-toifa', tjm_name: 'Bahor', builder: 'Boshqa', manager_name: 'Ali' },
  { source_id: 'c', object_name: 'Orta bino', apartment_count: '90', floors: '9', latitude: 39.8, longitude: 66.9, difficulty: 'II-toifa', builder: 'Boshqa' }
];
const ids = (prompt: string) => filterPoolByPrompt(pool, prompt).scope.map(o => o.source_id).sort().join();

defineTest('AI route requests obey apartment and floor wording', meta('AI_ROUTE_SIZE', 'sizes in a prompt'), () => {
  assert.equal(ids("100 tadan ortiq xonadonli binolarga marshrut tuz"), 'a');
  assert.equal(ids('100 xonadondan kop binolar'), 'a');
  assert.equal(ids('100+ xonadon'), 'a');
  assert.equal(ids('80 xonadonli binolar'), 'a,c');
  assert.equal(ids('50 dan 100 gacha xonadonli'), 'c');
  assert.equal(ids('50-100 xonadonli'), 'c');
  assert.equal(ids('100 xonadongacha'), 'b,c');
  assert.equal(ids('6-10 qavatli binolar'), 'c');
  assert.equal(ids('5 qavatdan 9 qavatgacha'), 'b,c');
  assert.equal(parseCriteria('6-10 qavatli').exactFloor, null);
});

defineTest('AI route requests obey brand, MChJ, client, category and fill state', meta('AI_ROUTE_FIELDS', 'other filters in a prompt'), () => {
  assert.equal(ids('Golden House brendi binolari'), 'a');
  assert.equal(ids('TXTGROUP MCHJ binolari'), 'a');
  assert.equal(ids('bizning klientlarga marshrut'), 'a');
  assert.equal(ids('III toifali binolar'), 'a');
  assert.equal(ids("to'ldirilmagan binolar"), 'c');
  assert.equal(ids("ma'lumoti to'ldirilgan binolar"), 'a,b');
});

defineTest('AI combines every condition, and a written count sets the stops', meta('AI_ROUTE_COMBINE', 'combined prompt'), () => {
  assert.equal(ids('II toifali 50 tadan ortiq xonadonli binolar'), 'c');
  const { scope, limit } = filterPoolByPrompt(pool, '2 ta bino');
  assert.equal(limit, 2);
  assert.equal(smartHeuristicPlanner(scope, undefined, undefined, false, false, limit).recommended_stops.length, 2);
  assert.equal(filterPoolByPrompt(pool, 'binolar').limit, undefined);
  assert.equal(filterPoolByPrompt(pool, '150 ta xonadonli').limit, undefined, 'a building size is not a stop count');
});

defineTest('Filters reach the AI: ids from the client narrow the pool on the server', meta('AI_FILTER_SCOPE', 'scope_ids'), () => {
  const route = fs.readFileSync(path.join(SRC_ROOT, 'app/api/ai/route-advisor/route.ts'), 'utf-8');
  assert.match(route, /applyFilterScope\(companyPool, body\.scope_ids\)/);
  assert.match(fs.readFileSync(path.join(SRC_ROOT, 'lib/api.ts'), 'utf-8'), /scope_ids: params\.scopeIds/);
});

defineTest('Client options keep the standard list and add names already used', meta('CLIENT_OPTIONS', 'clientOwnerOptions'), () => {
  assert.deepEqual(clientOwnerOptions([]), DEFAULT_CLIENT_OWNERS);
  const used: any[] = [{ client_owner: 'Zeta' }, { client_owner: 'Alfa' }, { client_owner: ' uyqur ' }, { client_owner: 'alfa' }, {}];
  const options = clientOwnerOptions(used);
  assert.deepEqual(options.slice(0, 3), ['UYSOT CRM', 'UYSOT.UZ', 'UYQUR'], 'the same name in another case adds nothing');
  assert.equal(options.length, 5);
  assert.deepEqual(options.slice(3).map(o => o.toLowerCase()), ['alfa', 'zeta']);
});

defineTest('Choosing a client matches only that client', meta('CLIENT_FILTER_EXACT', 'exact match'), () => {
  const crm: any = { source_id: '1', client_owner: 'UYSOT CRM' };
  const site: any = { source_id: '2', client_owner: 'UYSOT.UZ' };
  assert.equal(matchesObjectFilters(crm, advanced({ clientOwner: 'UYSOT CRM' })), true);
  assert.equal(matchesObjectFilters(site, advanced({ clientOwner: 'UYSOT CRM' })), false);
  assert.equal(matchesObjectFilters(site, advanced({ clientOwner: 'uysot.uz' })), true);
});

defineTest('A CRM link is a general custom field stored with the object', meta('CRM_LINK', 'crm_link'), async () => {
  assert.ok((await db.getCustomFields()).some(f => f.field_name === 'crm_link' && f.field_type === 'url'));
  const company = (await db.createCompany(`Co ${unique()}`)).company_id;
  const source = (await db.getObjects(undefined, false)).find(o => !o.is_custom_tjm);
  await db.updateCompanyData(company, 'u1', String(source.source_id), { crm_link: 'https://crm.example.com/deal/1' });
  const [saved] = await db.getObjects(company, undefined, String(source.source_id));
  assert.equal(saved.custom_values?.crm_link, 'https://crm.example.com/deal/1');
});

defineTest('Only web links become clickable', meta('CRM_LINK_SAFE', 'safeExternalUrl'), () => {
  assert.equal(safeExternalUrl('https://crm.example.com/deal/1'), 'https://crm.example.com/deal/1');
  assert.equal(safeExternalUrl(' http://crm.example.com '), 'http://crm.example.com');
  assert.equal(safeExternalUrl('javascript:alert(1)'), null);
  assert.equal(safeExternalUrl('data:text/html,x'), null);
  assert.equal(safeExternalUrl('crm.example.com'), null);
  assert.equal(safeExternalUrl(''), null);
  assert.equal(safeExternalUrl(undefined), null);
});

