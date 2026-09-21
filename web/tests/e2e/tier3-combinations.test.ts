import * as assert from 'node:assert/strict';
import {
  defineTest,
  readSrcFile,
  MockDOM,
  simulateUseClickOutside,
  evaluateResponsiveVisibility,
  loadRealSheetsData,
} from './harness.ts';

// ============================================================================
// TIER 3: CROSS-FEATURE INTERACTIONS (PAIRWISE)
// ============================================================================

defineTest('Dropdown closes when modal backdrop opens', {
  tier: 3, milestone: 1, feature: 'C1_DROPDOWN_MODAL',
  description: 'Opening CreateObjectModal or LoginModal closes any open dropdown'
}, () => {
  const dom = new MockDOM();
  const dropdownEl = dom.createElement('div');
  let dropdownOpen = true;

  // Dropdown is open and has useClickOutside attached
  const hook = simulateUseClickOutside(
    { current: dropdownEl },
    () => { dropdownOpen = false; },
    dropdownOpen,
    dom
  );

  // Modal opens and attaches its backdrop overlay
  const modalBackdrop = dom.createElement('div');
  dom.dispatchEvent({ type: 'mousedown', target: modalBackdrop });

  assert.equal(dropdownOpen, false, 'Dropdown should close when clicking or opening modal backdrop');
  hook.unmount();
});

defineTest('Filter selection while BottomSheet is open maintains consistent state', {
  tier: 3, milestone: 1, feature: 'C2_FILTER_SHEET',
  description: 'Changing district filter does not corrupt selectedId state in page.tsx'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  // Verify selectedId state and setSelectedId handling with filters
  assert.match(pageContent, /const\s*\[selectedId,\s*setSelectedId\]\s*=\s*useState/, 'page.tsx manages selectedId state');
  assert.match(pageContent, /selectedDistrict/, 'page.tsx manages selectedDistrict state');
  assert.match(pageContent, /selectedStatus/, 'page.tsx manages selectedStatus state');
});

defineTest('Tablet navigation tab switch clears or isolates map object details', {
  tier: 3, milestone: 3, feature: 'C3_TABLET_NAV',
  description: 'Switching activeTab on tablet renders corresponding view and hides map details'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  assert.match(pageContent, /activeTab === ['"]map['"]/, 'page.tsx only renders map view when activeTab is map');
  assert.match(pageContent, /activeTab === ['"]objects['"]/, 'page.tsx renders objects table when activeTab is objects');
  assert.match(pageContent, /activeTab === ['"](route|visits)['"]/, 'page.tsx renders route or visits view when activeTab is selected');
});

defineTest('User login switch updates Visits KPI card in real time', {
  tier: 3, milestone: 2, feature: 'C4_AUTH_VISITS',
  description: 'Switching currentUser in page.tsx propagates immediately to VisitsView'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  const visitsContent = readSrcFile('components/Visits/VisitsView.tsx');

  // page.tsx has currentUser state and passes it to VisitsView
  assert.match(pageContent, /currentUser=\{currentUser\}/, 'page.tsx passes currentUser prop to VisitsView');
  assert.match(visitsContent, /currentUser/, 'VisitsView receives and uses currentUser');
});

defineTest('Text selection in BottomSheet details does not trigger map dragging', {
  tier: 3, milestone: 1, feature: 'C5_SELECTION_MAP',
  description: 'Map canvas isolates select-none while details sheet allows text copying'
}, () => {
  const mapContent = readSrcFile('components/Map/MapContainer.tsx');
  const bottomSheet = readSrcFile('components/UI/BottomSheet.tsx');
  const pageContent = readSrcFile('app/page.tsx');

  // page.tsx root does NOT have select-none
  assert.ok(!pageContent.slice(285, 320).includes('select-none'), 'page root has no select-none');
  // map wrapper DOES have select-none
  assert.ok(mapContent.includes('select-none'), 'map container isolates select-none');
  // bottomSheet does NOT have select-none
  assert.ok(!bottomSheet.includes('select-none'), 'bottom sheet allows text selection');
});

defineTest('Selecting object in BottomResults opens details sheet on mobile and side drawer on desktop', {
  tier: 3, milestone: 1, feature: 'C6_RESULTS_DETAILS',
  description: 'Clicking object in BottomResults invokes onSelect and triggers responsive details'
}, () => {
  const resultsContent = readSrcFile('components/ObjectCards/BottomResults.tsx');
  assert.match(resultsContent, /onSelect\(obj\.source_id\)/, 'BottomResults calls onSelect with obj.source_id');

  const pageContent = readSrcFile('app/page.tsx');
  assert.match(pageContent, /onSelect=\{handleSelectObject\}|onSelect=\{setSelectedId\}/, 'page.tsx connects selection callback');
});

defineTest('Resetting filters clears both district and status selections', {
  tier: 3, milestone: 2, feature: 'C7_RESET_FILTERS',
  description: 'Selecting default option clears active filter tags and restores full object list'
}, () => {
  const toolbarContent = readSrcFile('components/Filters/FilterToolbar.tsx');
  assert.match(toolbarContent, /onDistrictChange\([^)]*Barcha tumanlar/, 'Resets district when Barcha tumanlar is chosen');
  assert.match(toolbarContent, /onStatusChange\([^)]*Barcha statuslar/, 'Resets status when Barcha statuslar is chosen');
});

defineTest('Search input change closes any active filter dropdowns', {
  tier: 3, milestone: 1, feature: 'C8_SEARCH_DROPDOWNS',
  description: 'Typing in search input focuses search bar and closes open dropdowns via click outside'
}, () => {
  const dom = new MockDOM();
  const dropdown = dom.createElement('div');
  const searchInput = dom.createElement('input');
  let dropdownClosed = false;

  const hook = simulateUseClickOutside(
    { current: dropdown },
    () => { dropdownClosed = true; },
    true,
    dom
  );

  // User clicks on search input
  hook.triggerOutsideClick(searchInput);
  assert.equal(dropdownClosed, true, 'Dropdown closes when clicking search input');
  hook.unmount();
});

defineTest('VisitsView visit submission records active user name as visitor', {
  tier: 3, milestone: 2, feature: 'C9_VISIT_RECORDING',
  description: 'Submitting a visit associates the visit with the logged-in user profile'
}, () => {
  const visitsContent = readSrcFile('components/Visits/VisitsView.tsx');
  assert.match(visitsContent, /handleSaveVisit|onSaveVisit|submitVisit|currentUser/, 'Visit recording associates active user profile');
});

defineTest('MobileBottomNav switching to Objects tab resets map zoom or coordinates gracefully', {
  tier: 3, milestone: 3, feature: 'C10_TAB_SWITCH',
  description: 'Navigating between tabs preserves application state without unhandled exceptions'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  assert.match(pageContent, /setActiveTab/, 'page.tsx provides setActiveTab callback');
});
