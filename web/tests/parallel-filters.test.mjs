import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// Test dataset mimicking the real objects
const testMarkers = [
  {
    source_id: '1',
    object_name: 'Afrosiyob City 3 xonali zamonaviy majmua',
    district_name: 'Samarqand shahar',
    status: 'Qurilish jarayonida',
    floors: '9',
    apartment_count: '120',
    is_visited: true,
    has_internal: true,
    deadline: '2026-12-30'
  },
  {
    source_id: '2',
    object_name: 'Registon Plaza 2 xonali bino',
    district_name: 'Samarqand shahar',
    status: 'To\'xtatilgan',
    floors: '16',
    apartment_count: '240',
    is_visited: false,
    has_internal: false,
    deadline: '2025-06-15'
  },
  {
    source_id: '3',
    object_name: 'Bulung\'ur maskani 3 xonali',
    district_name: 'Bulung\'ur tumani',
    status: 'Qurilish jarayonida',
    floors: '5',
    apartment_count: '45',
    is_visited: false,
    has_internal: true,
    deadline: '2026-08-20'
  },
  {
    source_id: '4',
    object_name: 'Urgut City ko\'p qavatli',
    district_name: 'Urgut tumani',
    status: 'Topshirilgan',
    floors: '7',
    apartment_count: '70',
    is_visited: true,
    has_internal: true,
    deadline: '2024-11-10'
  }
];

function applyParallelFilters(list, { selectedDistrict, selectedStatus, filters }) {
  return list.filter(m => {
    // 1. District Filter
    if (selectedDistrict && selectedDistrict !== 'Barcha tumanlar') {
      const dClean = selectedDistrict.toLowerCase().replace(/['`’‘]/g, '').replace(/(\s*tumani|\s*shahar|\s*shahri)$/i, '').trim();
      const mDist = (m.district_name || '').toLowerCase().replace(/['`’‘]/g, '').trim();
      const mAddr = (m.address || '').toLowerCase().replace(/['`’‘]/g, '').trim();
      const mName = (m.object_name || '').toLowerCase().replace(/['`’‘]/g, '').trim();
      const matches = (mDist && (mDist.includes(dClean) || dClean.includes(mDist))) || mAddr.includes(dClean) || mName.includes(dClean);
      if (!matches) return false;
    }

    // 2. Status Filter
    if (selectedStatus && selectedStatus !== 'Barcha statuslar') {
      const s = selectedStatus.toLowerCase().replace(/(da|ida)$/, '').trim();
      const mStatus = (m.status || '').toLowerCase().trim();
      if (!mStatus.includes(s) && !s.includes(mStatus)) return false;
    }

    // 3. Room count
    if (filters.roomCount && filters.roomCount.trim() !== '') {
      const query = filters.roomCount.trim();
      const rawName = ((m.object_name || '') + ' ' + (m.tjm_name || '')).toLowerCase();
      const numbers = query.match(/\d+/g) || [];
      if (numbers.length > 0) {
        const matches = numbers.some(num => {
          const word = num === '1' ? 'bir' : num === '2' ? 'ikki' : num === '3' ? 'uch' : num === '4' ? "to['`]?rt" : num;
          const regex = new RegExp('(^|\\D)' + num + '\\s*[-–]?\\s*xona|' + word + '\\s*xona', 'i');
          return regex.test(rawName);
        });
        if (!matches) return false;
      } else {
        if (!rawName.includes(query.toLowerCase())) return false;
      }
    }

    // 4. Floors
    if (filters.minFloors || filters.maxFloors) {
      const flMatch = String(m.floors || '').match(/\d+/);
      const cleanFloor = flMatch ? parseInt(flMatch[0], 10) : 0;
      const minFl = filters.minFloors ? parseInt(filters.minFloors, 10) : 0;
      const maxFl = filters.maxFloors ? parseInt(filters.maxFloors, 10) : Infinity;
      if (cleanFloor < minFl || cleanFloor > maxFl) return false;
    }

    // 5. Apartments
    if (filters.minApartments || filters.maxApartments) {
      const apMatch = String(m.apartment_count || '0').match(/\d+/);
      const cleanAp = apMatch ? parseInt(apMatch[0], 10) : 0;
      const minAp = filters.minApartments ? parseInt(filters.minApartments, 10) : 0;
      const maxAp = filters.maxApartments ? parseInt(filters.maxApartments, 10) : Infinity;
      if (cleanAp < minAp || cleanAp > maxAp) return false;
    }

    // 6. Visit status
    if (filters.visitStatus && filters.visitStatus !== 'all') {
      const isVisited = Boolean(m.is_visited || m.last_visit);
      if (filters.visitStatus === 'visited' && !isVisited) return false;
      if (filters.visitStatus === 'not_visited' && isVisited) return false;
    }

    // 7. CRM status
    if (filters.crmStatus && filters.crmStatus !== 'all') {
      const isFilled = Boolean(m.has_internal || m.phone || m.manager_name || m.tjm_name || m.sales_office);
      if (filters.crmStatus === 'filled' && !isFilled) return false;
      if (filters.crmStatus === 'empty' && isFilled) return false;
    }

    // 8. Deadline year
    if (filters.deadlineYear && filters.deadlineYear.trim() !== '' && filters.deadlineYear !== 'all') {
      const dline = (m.deadline || '').toLowerCase();
      if (!dline.includes(filters.deadlineYear.trim().toLowerCase())) return false;
    }

    return true;
  });
}

console.log('🧪 Testing parallel filters...');

// Test 1: District + Floors (Samarqand shahar + 9 to 16 floors)
const t1 = applyParallelFilters(testMarkers, {
  selectedDistrict: 'Samarqand shahar',
  selectedStatus: '',
  filters: { minFloors: '9', maxFloors: '16', roomCount: '', minApartments: '', maxApartments: '', visitStatus: 'all', crmStatus: 'all', deadlineYear: '' }
});
assert.strictEqual(t1.length, 2, 'Should match objects 1 and 2');
console.log('✅ Test 1 Passed: District + Floor range in parallel');

// Test 2: District + Status (Samarqand shahar + Jarayonda)
const t2 = applyParallelFilters(testMarkers, {
  selectedDistrict: 'Samarqand shahar',
  selectedStatus: 'Jarayonda',
  filters: { minFloors: '', maxFloors: '', roomCount: '', minApartments: '', maxApartments: '', visitStatus: 'all', crmStatus: 'all', deadlineYear: '' }
});
assert.strictEqual(t2.length, 1, 'Should match only object 1');
assert.strictEqual(t2[0].source_id, '1');
console.log('✅ Test 2 Passed: District + Status in parallel');

// Test 3: Status + VisitStatus (Jarayonda + Borilgan)
const t3 = applyParallelFilters(testMarkers, {
  selectedDistrict: '',
  selectedStatus: 'Jarayonda',
  filters: { minFloors: '', maxFloors: '', roomCount: '', minApartments: '', maxApartments: '', visitStatus: 'visited', crmStatus: 'all', deadlineYear: '' }
});
assert.strictEqual(t3.length, 1, 'Should match only object 1');
console.log('✅ Test 3 Passed: Status + VisitStatus in parallel');

// Test 4: RoomCount + DeadlineYear (3 xonali + 2026)
const t4 = applyParallelFilters(testMarkers, {
  selectedDistrict: '',
  selectedStatus: '',
  filters: { minFloors: '', maxFloors: '', roomCount: '3', minApartments: '', maxApartments: '', visitStatus: 'all', crmStatus: 'all', deadlineYear: '2026' }
});
assert.strictEqual(t4.length, 2, 'Should match objects 1 and 3');
console.log('✅ Test 4 Passed: RoomCount + DeadlineYear in parallel');

// Test 5: 4 Filters in Parallel (District + Status + Floor + CRMStatus)
const t5 = applyParallelFilters(testMarkers, {
  selectedDistrict: 'Samarqand shahar',
  selectedStatus: 'Jarayonda',
  filters: { minFloors: '8', maxFloors: '10', roomCount: '3', minApartments: '100', maxApartments: '200', visitStatus: 'visited', crmStatus: 'filled', deadlineYear: '2026' }
});
assert.strictEqual(t5.length, 1, 'Should match only object 1');
assert.strictEqual(t5[0].source_id, '1');
console.log('✅ Test 5 Passed: 4+ simultaneous parallel filters');

console.log('🎉 ALL PARALLEL FILTER TESTS PASSED WITH 100% SUCCESS!');
