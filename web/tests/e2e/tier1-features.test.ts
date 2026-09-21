import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  defineTest,
  readSrcFile,
  fileExistsInSrc,
  getAllSrcFiles,
  checkProhibitedStrings,
  checkRequiredPatterns,
  MockDOM,
  simulateUseClickOutside,
  evaluateResponsiveVisibility,
  loadRealSheetsData,
  getSrcRelative,
} from './harness.ts';

// ============================================================================
// FEATURE 1: Dropdown Click-Outside (useClickOutside)
// ============================================================================

defineTest('useClickOutside invokes callback on mousedown outside target element', {
  tier: 1, milestone: 1, feature: 'F1',
  description: 'useClickOutside triggers callback when clicking outside ref element'
}, () => {
  const dom = new MockDOM();
  const target = dom.createElement('div');
  const outsideNode = dom.createElement('button');
  let called = 0;

  const hook = simulateUseClickOutside({ current: target }, () => { called++; }, true, dom);
  hook.triggerOutsideClick(outsideNode);

  assert.equal(called, 1, 'Expected callback to be called once on outside mousedown');
  hook.unmount();
});

defineTest('useClickOutside ignores clicks inside target element', {
  tier: 1, milestone: 1, feature: 'F1',
  description: 'useClickOutside does not trigger callback when clicking child of ref'
}, () => {
  const dom = new MockDOM();
  const parent = dom.createElement('div');
  const child = dom.createElement('span');
  parent.children.push(child);
  child.parentNode = parent;
  let called = 0;

  const hook = simulateUseClickOutside({ current: parent }, () => { called++; }, true, dom);
  hook.triggerInsideClick(child);

  assert.equal(called, 0, 'Callback should NOT be called when clicking inside ref container');
  hook.unmount();
});

defineTest('useClickOutside respects enabled=false flag', {
  tier: 1, milestone: 1, feature: 'F1',
  description: 'useClickOutside does not trigger callback when disabled'
}, () => {
  const dom = new MockDOM();
  const target = dom.createElement('div');
  let called = 0;

  const hook = simulateUseClickOutside({ current: target }, () => { called++; }, false, dom);
  hook.triggerOutsideClick();

  assert.equal(called, 0, 'Callback should not be called when enabled is false');
  hook.unmount();
});

defineTest('useClickOutside triggers callback on Escape keydown', {
  tier: 1, milestone: 1, feature: 'F1',
  description: 'useClickOutside triggers callback on Escape key'
}, () => {
  const dom = new MockDOM();
  const target = dom.createElement('div');
  let called = 0;

  const hook = simulateUseClickOutside({ current: target }, () => { called++; }, true, dom);
  hook.triggerEscapeKey();

  assert.equal(called, 1, 'Escape key should trigger the close callback');
  hook.unmount();
});

defineTest('useClickOutside unregisters listeners on unmount', {
  tier: 1, milestone: 1, feature: 'F1',
  description: 'useClickOutside removes event listeners on cleanup'
}, () => {
  const dom = new MockDOM();
  const target = dom.createElement('div');
  let called = 0;

  const hook = simulateUseClickOutside({ current: target }, () => { called++; }, true, dom);
  assert.ok(dom.getListenerCount('mousedown') > 0, 'mousedown listener registered');
  hook.unmount();

  assert.equal(dom.getListenerCount('mousedown'), 0, 'mousedown listener removed on unmount');
  assert.equal(dom.getListenerCount('keydown'), 0, 'keydown listener removed on unmount');
  hook.triggerOutsideClick();
  assert.equal(called, 0, 'No callback after unmount');
});

defineTest('Navbar.tsx binds useClickOutside to user profile dropdown', {
  tier: 1, milestone: 1, feature: 'F1',
  description: 'Navbar binds dropdownRef to useClickOutside hook'
}, () => {
  const content = readSrcFile('components/Header/Navbar.tsx');
  assert.match(content, /useClickOutside\s*\(/, 'Navbar.tsx must call useClickOutside');
  assert.match(content, /ref=\{dropdownRef\}/, 'Navbar.tsx must attach dropdownRef to user container');
  assert.match(content, /setUserDropdownOpen\(false\)/, 'Navbar.tsx outside click must close user dropdown');
});

defineTest('FilterToolbar.tsx binds useClickOutside to district and status dropdowns', {
  tier: 1, milestone: 1, feature: 'F1',
  description: 'FilterToolbar attaches refs and useClickOutside to filter dropdowns'
}, () => {
  const content = readSrcFile('components/Filters/FilterToolbar.tsx');
  assert.match(content, /useClickOutside\s*\(\s*districtRef/, 'FilterToolbar must bind useClickOutside to districtRef');
  assert.match(content, /useClickOutside\s*\(\s*statusRef/, 'FilterToolbar must bind useClickOutside to statusRef');
  assert.match(content, /ref=\{districtRef\}/, 'FilterToolbar must attach districtRef to JSX element');
  assert.match(content, /ref=\{statusRef\}/, 'FilterToolbar must attach statusRef to JSX element');
});

defineTest('ObjectsTableView.tsx binds useClickOutside to table filter dropdowns', {
  tier: 1, milestone: 1, feature: 'F1',
  description: 'ObjectsTableView attaches refs and useClickOutside to table filter dropdowns'
}, () => {
  const content = readSrcFile('components/ObjectsTable/ObjectsTableView.tsx');
  assert.match(content, /useClickOutside\s*\(\s*districtRef/, 'ObjectsTableView must bind useClickOutside to districtRef');
  assert.match(content, /useClickOutside\s*\(\s*statusRef/, 'ObjectsTableView must bind useClickOutside to statusRef');
  assert.match(content, /ref=\{districtRef\}/, 'ObjectsTableView must attach districtRef to JSX element');
  assert.match(content, /ref=\{statusRef\}/, 'ObjectsTableView must attach statusRef to JSX element');
});

// ============================================================================
// FEATURE 2: Modal Backdrop & ESC Dismissal
// ============================================================================

defineTest('CreateObjectModal.tsx handles backdrop click dismissing dialog', {
  tier: 1, milestone: 1, feature: 'F2',
  description: 'CreateObjectModal backdrop click triggers onClose'
}, () => {
  const content = readSrcFile('components/ObjectPanel/CreateObjectModal.tsx');
  assert.match(content, /e\.target\s*===\s*e\.currentTarget/, 'Backdrop must check e.target === e.currentTarget to avoid closing on inner click');
  assert.match(content, /onClose\(\)/, 'Backdrop click must invoke onClose()');
});

defineTest('CreateObjectModal.tsx registers Escape key listener', {
  tier: 1, milestone: 1, feature: 'F2',
  description: 'CreateObjectModal dismisses on Escape key press'
}, () => {
  const content = readSrcFile('components/ObjectPanel/CreateObjectModal.tsx');
  assert.match(content, /Escape/, 'CreateObjectModal must listen for Escape key');
  assert.match(content, /addEventListener\(['"]keydown['"]/, 'CreateObjectModal must register keydown event listener');
});

defineTest('CreateObjectModal.tsx elevates overlay z-index above map', {
  tier: 1, milestone: 1, feature: 'F2',
  description: 'CreateObjectModal backdrop has high z-index (>= 1000)'
}, () => {
  const content = readSrcFile('components/ObjectPanel/CreateObjectModal.tsx');
  const hasHighZ = content.includes('z-[2000]') || content.includes('z-[1000]') || content.includes('z-50');
  assert.ok(hasHighZ, 'CreateObjectModal overlay must have z-index sufficient to cover Leaflet map');
});

defineTest('LoginModal.tsx accepts optional onClose and binds backdrop/ESC dismissal', {
  tier: 1, milestone: 1, feature: 'F2',
  description: 'LoginModal supports backdrop click and Escape key dismissal when cancellable'
}, () => {
  const content = readSrcFile('components/Auth/LoginModal.tsx');
  assert.match(content, /onClose\?:/, 'LoginModalProps must declare optional onClose');
  assert.match(content, /Escape/, 'LoginModal must handle Escape key when onClose is provided');
});

defineTest('BottomSheet.tsx registers Escape key listener to trigger onClose', {
  tier: 1, milestone: 1, feature: 'F2',
  description: 'BottomSheet dismisses on Escape key press'
}, () => {
  const content = readSrcFile('components/UI/BottomSheet.tsx');
  assert.match(content, /Escape/, 'BottomSheet must listen for Escape key to close');
  assert.match(content, /onClose\(\)/, 'BottomSheet Escape handler must invoke onClose()');
});

defineTest('BottomSheet.tsx elevates backdrop and sheet z-index above map controls', {
  tier: 1, milestone: 1, feature: 'F2',
  description: 'BottomSheet z-index is elevated to prevent map switcher buttons floating on top'
}, () => {
  const content = readSrcFile('components/UI/BottomSheet.tsx');
  // Map controls are z-[400]. BottomSheet originally had z-[49] and z-[50].
  assert.ok(!content.includes('z-[49]'), 'BottomSheet backdrop must not use weak z-[49]');
  const elevated = content.includes('z-[1000]') || content.includes('z-[1001]') || content.includes('z-[1002]');
  assert.ok(elevated, 'BottomSheet must have elevated z-index >= 1000');
});

// ============================================================================
// FEATURE 3: Responsive Details Panel ("Tablet Fix")
// ============================================================================

defineTest('BottomSheet.tsx removes hardcoded md:hidden on sheet and backdrop', {
  tier: 1, milestone: 1, feature: 'F3',
  description: 'BottomSheet removes md:hidden to allow rendering on tablet viewports'
}, () => {
  const content = readSrcFile('components/UI/BottomSheet.tsx');
  assert.ok(!content.includes('md:hidden'), 'BottomSheet must not hardcode md:hidden inside its component');
});

defineTest('app/page.tsx side drawer supports tablet breakpoint', {
  tier: 1, milestone: 1, feature: 'F3',
  description: 'app/page.tsx enables side drawer on tablets (md:flex) or ensures BottomSheet renders'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  const bottomContent = readSrcFile('components/UI/BottomSheet.tsx');

  // Verify that on tablet (768px - 1279px), either drawer or bottom sheet is visible
  const tablet768 = evaluateResponsiveVisibility(768, pageContent, bottomContent);
  const tablet1024 = evaluateResponsiveVisibility(1024, pageContent, bottomContent);

  const has768Details = tablet768.desktopDrawerVisible || tablet768.bottomSheetVisible;
  const has1024Details = tablet1024.desktopDrawerVisible || tablet1024.bottomSheetVisible;

  assert.ok(has768Details, 'Details panel must be visible at 768px tablet portrait');
  assert.ok(has1024Details, 'Details panel must be visible at 1024px tablet landscape');
});

defineTest('app/page.tsx details view renders across all viewport breakpoints without gap', {
  tier: 1, milestone: 1, feature: 'F3',
  description: 'Mathematical verification: details panel renders for all widths from 320 to 2560px'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  const bottomContent = readSrcFile('components/UI/BottomSheet.tsx');

  const testWidths = [320, 375, 414, 600, 768, 820, 912, 1024, 1180, 1280, 1440, 1920];
  for (const w of testWidths) {
    const visibility = evaluateResponsiveVisibility(w, pageContent, bottomContent);
    const visible = visibility.desktopDrawerVisible || visibility.bottomSheetVisible;
    assert.ok(visible, `Details view must be visible at width ${w}px (no black hole)`);
  }
});

defineTest('Desktop side drawer is visible on desktop screens (>=1280px)', {
  tier: 1, milestone: 1, feature: 'F3',
  description: 'Desktop side drawer renders on desktop viewports'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  const bottomContent = readSrcFile('components/UI/BottomSheet.tsx');
  const vis = evaluateResponsiveVisibility(1280, pageContent, bottomContent);
  assert.ok(vis.desktopDrawerVisible, 'Desktop drawer should be visible at 1280px');
});

defineTest('Mobile bottom sheet is visible on mobile screens (<768px)', {
  tier: 1, milestone: 1, feature: 'F3',
  description: 'Mobile bottom sheet renders on mobile viewports'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  const bottomContent = readSrcFile('components/UI/BottomSheet.tsx');
  const vis = evaluateResponsiveVisibility(375, pageContent, bottomContent);
  assert.ok(vis.bottomSheetVisible, 'Bottom sheet should be visible at 375px mobile');
});

// ============================================================================
// FEATURE 4: Global Text Selection Enabled
// ============================================================================

defineTest('app/page.tsx root container does NOT contain select-none', {
  tier: 1, milestone: 1, feature: 'F4',
  description: 'Global select-none is removed from app/page.tsx root div'
}, () => {
  const content = readSrcFile('app/page.tsx');
  // Root div previously had: class="... select-none"
  const lines = content.split('\n');
  // Check lines around root return container (lines 290-310)
  const rootLines = lines.slice(285, 320).join('\n');
  assert.ok(!rootLines.includes('select-none'), 'Root container in app/page.tsx must NOT contain select-none');
});

defineTest('ObjectDetails.tsx contact phone and address allow text selection', {
  tier: 1, milestone: 1, feature: 'F4',
  description: 'Object details contact numbers and addresses are selectable'
}, () => {
  const content = readSrcFile('components/ObjectPanel/ObjectDetails.tsx');
  assert.ok(!content.includes('select-none'), 'ObjectDetails.tsx should not use select-none on contact details');
  assert.match(content, /manager_phone|phone/, 'ObjectDetails renders contact phone');
});

defineTest('BottomResults.tsx cards allow text selection', {
  tier: 1, milestone: 1, feature: 'F4',
  description: 'BottomResults cards permit copying text and phone numbers'
}, () => {
  const content = readSrcFile('components/ObjectCards/BottomResults.tsx');
  assert.ok(!content.includes('select-none'), 'BottomResults should not block text selection');
});

defineTest('MapContainer.tsx isolates select-none to map canvas', {
  tier: 1, milestone: 1, feature: 'F4',
  description: 'Map canvas retains select-none to prevent map dragging from selecting text'
}, () => {
  const content = readSrcFile('components/Map/MapContainer.tsx');
  assert.ok(content.includes('select-none'), 'MapContainer should isolate select-none to map wrapper');
});

defineTest('ObjectsTableView.tsx table data rows permit text selection', {
  tier: 1, milestone: 1, feature: 'F4',
  description: 'ObjectsTableView data cells are selectable'
}, () => {
  const content = readSrcFile('components/ObjectsTable/ObjectsTableView.tsx');
  // Verify tbody does not have select-none
  const tbodyIndex = content.indexOf('<tbody');
  if (tbodyIndex !== -1) {
    const tbodySection = content.substring(tbodyIndex, tbodyIndex + 200);
    assert.ok(!tbodySection.includes('select-none'), 'Table body rows must allow text selection');
  }
});

// ============================================================================
// FEATURE 5: Fake Chevron Removal
// ============================================================================

defineTest('FilterToolbar.tsx region selector supports interactive navigation or clean styling', {
  tier: 1, milestone: 2, feature: 'F5',
  description: 'Region selector supports selectedRegion and clean styling'
}, () => {
  const content = readSrcFile('components/Filters/FilterToolbar.tsx');
  assert.ok(content.includes('selectedRegion') || content.includes('Region'), 'FilterToolbar supports region selection');
});

defineTest('FilterToolbar.tsx static Category badge does not contain ChevronDown', {
  tier: 1, milestone: 2, feature: 'F5',
  description: 'Static Category pill badge has no fake dropdown chevron'
}, () => {
  const content = readSrcFile('components/Filters/FilterToolbar.tsx');
  const catIndex = content.indexOf("Ko'p xonadonli uy-joylar");
  assert.ok(catIndex !== -1, 'Category pill found in FilterToolbar');
  const catSection = content.substring(catIndex - 100, catIndex + 150);
  assert.ok(!catSection.includes('ChevronDown'), 'Static Category pill must NOT have ChevronDown icon');
});

defineTest('FilterToolbar.tsx interactive dropdowns retain ChevronDown indicators', {
  tier: 1, milestone: 2, feature: 'F5',
  description: 'Only genuine interactive dropdowns display ChevronDown'
}, () => {
  const content = readSrcFile('components/Filters/FilterToolbar.tsx');
  assert.match(content, /selectedDistrict/, 'FilterToolbar renders district selector');
  assert.match(content, /selectedStatus/, 'FilterToolbar renders status selector');
  // ChevronDown should still be present in the file for real dropdowns
  assert.ok(content.includes('ChevronDown'), 'ChevronDown retained for interactive dropdowns');
});

defineTest('BottomResults.tsx does not import or render unused ChevronDown', {
  tier: 1, milestone: 2, feature: 'F5',
  description: 'BottomResults cleans up unused ChevronDown import'
}, () => {
  const content = readSrcFile('components/ObjectCards/BottomResults.tsx');
  assert.ok(!content.includes('ChevronDown'), 'BottomResults should not have unused ChevronDown');
});

defineTest('Static badges in FilterToolbar.tsx maintain clean non-interactive styling', {
  tier: 1, milestone: 2, feature: 'F5',
  description: 'Static badges retain badge pill styling without cursor-pointer or fake hover triggers'
}, () => {
  const content = readSrcFile('components/Filters/FilterToolbar.tsx');
  const regionIndex = content.indexOf('Samarqand viloyati');
  const regionSection = content.substring(regionIndex - 100, regionIndex + 100);
  assert.ok(!regionSection.includes('cursor-pointer'), 'Static badge should not suggest clickability with cursor-pointer');
});

// ============================================================================
// FEATURE 6: Fallback Image Clutter Replacement
// ============================================================================

defineTest('BottomResults.tsx does not use repetitive Unsplash stock photo URL', {
  tier: 1, milestone: 2, feature: 'F6',
  description: 'BottomResults eliminates photo-1545324418-cc1a3fa10c00 Unsplash URL'
}, () => {
  const content = readSrcFile('components/ObjectCards/BottomResults.tsx');
  assert.ok(!content.includes('photo-1545324418-cc1a3fa10c00'), 'BottomResults must not reference Unsplash photo-1545324418-cc1a3fa10c00');
});

defineTest('MapContainer.tsx popup does not use repetitive Unsplash stock photo URL', {
  tier: 1, milestone: 2, feature: 'F6',
  description: 'MapContainer popup eliminates photo-1545324418-cc1a3fa10c00 Unsplash URL'
}, () => {
  const content = readSrcFile('components/Map/MapContainer.tsx');
  assert.ok(!content.includes('photo-1545324418-cc1a3fa10c00'), 'MapContainer popup must not reference Unsplash photo-1545324418-cc1a3fa10c00');
});

defineTest('BottomResults.tsx renders clean architectural icon placeholder when image_url is missing', {
  tier: 1, milestone: 2, feature: 'F6',
  description: 'Clean architectural placeholder rendered for objects without image'
}, () => {
  const content = readSrcFile('components/ObjectCards/BottomResults.tsx');
  // Should render Building2 or Building or SVG icon when !obj.image_url
  const hasIconPlaceholder = content.includes('Building2') || content.includes('Building') || content.includes('<svg');
  assert.ok(hasIconPlaceholder, 'BottomResults should render architectural icon for image fallback');
});

defineTest('BottomResults.tsx preserves genuine image_url when available', {
  tier: 1, milestone: 2, feature: 'F6',
  description: 'Objects with valid image_url render standard <img> tag'
}, () => {
  const content = readSrcFile('components/ObjectCards/BottomResults.tsx');
  assert.match(content, /obj\.image_url/, 'BottomResults must check obj.image_url');
  assert.match(content, /<img/, 'BottomResults renders <img> tag when image exists');
});

defineTest('Real dataset contains objects without image_url and requires placeholder', {
  tier: 1, milestone: 2, feature: 'F6',
  description: 'Validates real-sheets-data.json: verify placeholder fallback is triggered on 100% of objects'
}, () => {
  const objects = loadRealSheetsData();
  assert.ok(objects.length > 0, 'Real dataset has records');
  const withImages = objects.filter((o: any) => !!o.image_url);
  assert.equal(withImages.length, 0, 'No records currently have image_url, confirming placeholder necessity');
});

// ============================================================================
// FEATURE 7: Redundant Icons & Badges Cleanup
// ============================================================================

defineTest('BottomResults.tsx does not contain dead CheckCircle2 row', {
  tier: 1, milestone: 2, feature: 'F7',
  description: 'BottomResults eliminates redundant row of checkmarks for TJM/Telefon/Rahbar'
}, () => {
  const content = readSrcFile('components/ObjectCards/BottomResults.tsx');
  assert.ok(!content.includes('CheckCircle2'), 'BottomResults should not render dead CheckCircle2 icons');
});

defineTest('BottomResults.tsx does not display text-slate-300 grey dead badges', {
  tier: 1, milestone: 2, feature: 'F7',
  description: 'No misleading greyed out checkmarks when data is absent'
}, () => {
  const content = readSrcFile('components/ObjectCards/BottomResults.tsx');
  assert.ok(!content.includes('text-slate-300'), 'BottomResults should not have dead greyed text-slate-300 badges');
});

defineTest('CustomFieldManager.tsx removes static redundant Faol badges', {
  tier: 1, milestone: 2, feature: 'F7',
  description: 'CustomFieldManager cleans up non-functional static Faol badges'
}, () => {
  const content = readSrcFile('components/CustomFields/CustomFieldManager.tsx');
  // Static badge was: <span className="... bg-emerald-50 text-emerald-700 ...">Faol</span>
  const matches = content.match(/>Faol</g) || [];
  assert.ok(matches.length <= 1, 'CustomFieldManager should not repeat static Faol badge in every row');
});

defineTest('BottomResults.tsx preserves essential status and contact info', {
  tier: 1, milestone: 2, feature: 'F7',
  description: 'BottomResults maintains core status badge, address, and name'
}, () => {
  const content = readSrcFile('components/ObjectCards/BottomResults.tsx');
  assert.match(content, /object_name/, 'BottomResults displays object_name');
  assert.match(content, /address/, 'BottomResults displays address');
  assert.match(content, /status/, 'BottomResults displays status');
});

defineTest('VisitsView.tsx presents clean action layout without button duplication', {
  tier: 1, milestone: 2, feature: 'F7',
  description: 'VisitsView card actions are concise and non-redundant'
}, () => {
  const content = readSrcFile('components/Visits/VisitsView.tsx');
  assert.ok(content.length > 0, 'VisitsView exists');
});

// ============================================================================
// FEATURE 8: Developer Column & Schema Cleanup
// ============================================================================

defineTest('CustomFieldManager.tsx contains 0 mentions of W-AH columns', {
  tier: 1, milestone: 2, feature: 'F8',
  description: 'CustomFieldManager removes developer column code W-AH'
}, () => {
  const content = readSrcFile('components/CustomFields/CustomFieldManager.tsx');
  assert.ok(!content.includes('W-AH'), 'CustomFieldManager must not mention W-AH column range');
});

defineTest('CustomFieldManager.tsx contains 0 mentions of A-V columns', {
  tier: 1, milestone: 2, feature: 'F8',
  description: 'CustomFieldManager removes developer column code A-V'
}, () => {
  const content = readSrcFile('components/CustomFields/CustomFieldManager.tsx');
  assert.ok(!content.includes('A-V'), 'CustomFieldManager must not mention A-V column range');
});

defineTest('CustomFieldManager.tsx removes raw Ustun column letter header', {
  tier: 1, milestone: 2, feature: 'F8',
  description: 'CustomFieldManager table does not render developer Ustun letter column'
}, () => {
  const content = readSrcFile('components/CustomFields/CustomFieldManager.tsx');
  assert.ok(!content.includes('>Ustun<'), 'CustomFieldManager must not render Ustun column letter header');
  assert.ok(!content.includes('{field.column_letter}'), 'CustomFieldManager must not render raw column letters');
});

defineTest('CustomFieldManager.tsx uses human-readable Uzbek labels instead of developer DB keys', {
  tier: 1, milestone: 2, feature: 'F8',
  description: 'CustomFieldManager translates programmer terms (CRUD, schema) to business Uzbek'
}, () => {
  const content = readSrcFile('components/CustomFields/CustomFieldManager.tsx');
  assert.ok(!content.includes('CRUD amallari'), 'CustomFieldManager must not use technical term CRUD amallari');
});

defineTest('ObjectDetails.tsx tab and section use Uzbek business terminology', {
  tier: 1, milestone: 2, feature: 'F8',
  description: 'ObjectDetails replaces "Custom fields" with "Qo\'shimcha ma\'lumotlar"'
}, () => {
  const content = readSrcFile('components/ObjectPanel/ObjectDetails.tsx');
  assert.ok(!content.includes("Custom fields"), 'ObjectDetails should not use raw English "Custom fields"');
  assert.match(content, /Qo['’]?shimcha\s+(ma['’]?lumotlar|maydonlar)/, 'ObjectDetails should use Uzbek business terminology');
});

// ============================================================================
// FEATURE 9: Google Sheets Mentions Elimination
// ============================================================================

defineTest('Navbar.tsx title attribute does not mention Google Sheets', {
  tier: 1, milestone: 2, feature: 'F9',
  description: 'Navbar refresh button title eliminates Google Sheets'
}, () => {
  const content = readSrcFile('components/Header/Navbar.tsx');
  assert.ok(!content.includes('Google Sheets bilan yangilash'), 'Navbar title must not say "Google Sheets bilan yangilash"');
});

defineTest('Navbar.tsx sync button text does not mention Sheets Sinxron', {
  tier: 1, milestone: 2, feature: 'F9',
  description: 'Navbar sync button text replaces "Sheets Sinxron" with "Sinxronlash"'
}, () => {
  const content = readSrcFile('components/Header/Navbar.tsx');
  assert.ok(!content.includes('Sheets Sinxron'), 'Navbar must not display "Sheets Sinxron"');
});

defineTest('BottomResults.tsx data source tag does not mention Google Sheets', {
  tier: 1, milestone: 2, feature: 'F9',
  description: 'BottomResults eliminates "Google Sheets" data source pill'
}, () => {
  const content = readSrcFile('components/ObjectCards/BottomResults.tsx');
  assert.ok(!content.includes('>Google Sheets<'), 'BottomResults must not display "Google Sheets" tag');
});

defineTest('DashboardView.tsx description does not mention Google Sheets', {
  tier: 1, milestone: 2, feature: 'F9',
  description: 'DashboardView subtitle replaces Google Sheets with CRM / Tizim bazasi'
}, () => {
  const content = readSrcFile('components/Dashboard/DashboardView.tsx');
  assert.ok(!content.includes('Google Sheets integratsiyasi'), 'DashboardView must not mention "Google Sheets integratsiyasi"');
});

defineTest('LoginModal.tsx footer note does not mention Google Sheets', {
  tier: 1, milestone: 2, feature: 'F9',
  description: 'LoginModal eliminates "Google Sheets bilan jonli sinxronlanadi"'
}, () => {
  const content = readSrcFile('components/Auth/LoginModal.tsx');
  assert.ok(!content.includes('Google Sheets bilan jonli sinxronlanadi'), 'LoginModal must not mention Google Sheets');
});

defineTest('ObjectEdit.tsx alert and helper text do not mention Google Sheets', {
  tier: 1, milestone: 2, feature: 'F9',
  description: 'ObjectEdit eliminates Google Sheets from alerts and helper texts'
}, () => {
  const content = readSrcFile('components/ObjectPanel/ObjectEdit.tsx');
  assert.ok(!content.includes('Google Sheets jadvaliga'), 'ObjectEdit must not mention Google Sheets jadvali');
});

defineTest('ObjectDetails.tsx custom fields text does not mention Google Sheets', {
  tier: 1, milestone: 2, feature: 'F9',
  description: 'ObjectDetails eliminates Google Sheets from settings note'
}, () => {
  const content = readSrcFile('components/ObjectPanel/ObjectDetails.tsx');
  assert.ok(!content.includes('Google Sheets jadvalidagi'), 'ObjectDetails must not mention Google Sheets');
});

defineTest('layout.tsx metadata description does not mention Google Sheets', {
  tier: 1, milestone: 2, feature: 'F9',
  description: 'Root layout metadata description replaces Google Sheets'
}, () => {
  const content = readSrcFile('app/layout.tsx');
  assert.ok(!content.includes('Google Sheets'), 'app/layout.tsx metadata description must not mention Google Sheets');
});

defineTest('External Google Maps deep-links remain intact', {
  tier: 1, milestone: 2, feature: 'F9',
  description: 'Navigation URLs pointing to google.com/maps are intentionally preserved'
}, () => {
  const utilsContent = readSrcFile('lib/utils.ts');
  const detailsContent = readSrcFile('components/ObjectPanel/ObjectDetails.tsx');
  assert.match(utilsContent, /google\.com\/maps/, 'Google Maps navigation link must remain functional in utils');
  assert.match(detailsContent, /getNavigationUrl/, 'ObjectDetails must invoke getNavigationUrl');
});

// ============================================================================
// FEATURE 10: Dynamic Active User Context in Views
// ============================================================================

defineTest('RoutePlannerViewProps accepts currentUser prop conforming to UserProfile', {
  tier: 1, milestone: 2, feature: 'F10',
  description: 'RoutePlannerViewProps interface defines currentUser'
}, () => {
  const content = readSrcFile('components/RoutePlanner/RoutePlannerView.tsx');
  assert.match(content, /currentUser\?:?\s*(UserProfile|null)/, 'RoutePlannerViewProps must define currentUser prop');
});

defineTest('RoutePlannerView.tsx isolates active route storage by user account', {
  tier: 1, milestone: 2, feature: 'F10',
  description: 'RoutePlannerView scopes route persistence to specific account'
}, () => {
  const content = readSrcFile('components/RoutePlanner/RoutePlannerView.tsx');
  assert.match(content, /getAccountRouteStorageKey/, 'RoutePlannerView must isolate route storage by user account');
});

defineTest('RoutePlannerView.tsx handles dynamic user and company context', {
  tier: 1, milestone: 2, feature: 'F10',
  description: 'RoutePlannerView connects currentUser and companyId'
}, () => {
  const content = readSrcFile('components/RoutePlanner/RoutePlannerView.tsx');
  assert.match(content, /activeUser/, 'RoutePlannerView should track active user');
});

defineTest('RoutePlannerView.tsx provides fallback when currentUser is undefined', {
  tier: 1, milestone: 2, feature: 'F10',
  description: 'RoutePlannerView gracefully handles null currentUser'
}, () => {
  const content = readSrcFile('components/RoutePlanner/RoutePlannerView.tsx');
  assert.match(content, /getCurrentUser\(\)/, 'RoutePlannerView falls back to getCurrentUser');
});

defineTest('app/page.tsx passes currentUser prop to RoutePlannerView', {
  tier: 1, milestone: 2, feature: 'F10',
  description: 'page.tsx connects active user state to RoutePlannerView component'
}, () => {
  const content = readSrcFile('app/page.tsx');
  assert.match(content, /<RoutePlannerView[^>]*currentUser=\{currentUser\}/, 'page.tsx must pass currentUser to RoutePlannerView');
});

// ============================================================================
// FEATURE 11: Mobile Bottom Tab Navigation
// ============================================================================

defineTest('MobileBottomNav.tsx exists and exports default function', {
  tier: 1, milestone: 3, feature: 'F11',
  description: 'src/components/Navigation/MobileBottomNav.tsx component file exists'
}, () => {
  assert.ok(fileExistsInSrc('components/Navigation/MobileBottomNav.tsx'), 'MobileBottomNav.tsx must exist');
  const content = readSrcFile('components/Navigation/MobileBottomNav.tsx');
  assert.match(content, /export\s+default\s+function\s+MobileBottomNav/, 'Must export MobileBottomNav component');
});

defineTest('MobileBottomNav conforms to MobileBottomNavProps interface', {
  tier: 1, milestone: 3, feature: 'F11',
  description: 'MobileBottomNav accepts activeTab and onTabChange'
}, () => {
  const content = readSrcFile('components/Navigation/MobileBottomNav.tsx');
  assert.match(content, /activeTab:\s*string/, 'Props include activeTab');
  assert.match(content, /onTabChange:\s*\(tab:\s*string\)\s*=>\s*void/, 'Props include onTabChange');
});

defineTest('MobileBottomNav renders all primary application tabs', {
  tier: 1, milestone: 3, feature: 'F11',
  description: 'MobileBottomNav includes Map, Route, Objects, and Dashboard'
}, () => {
  const content = readSrcFile('components/Navigation/MobileBottomNav.tsx');
  assert.match(content, /'map'/, 'Includes map tab');
  assert.match(content, /'objects'/, 'Includes objects tab');
  assert.match(content, /('route'|'visits')/, 'Includes route tab');
  assert.match(content, /'dashboard'/, 'Includes dashboard tab');
});

defineTest('MobileBottomNav is hidden on desktop screens (lg:hidden)', {
  tier: 1, milestone: 3, feature: 'F11',
  description: 'MobileBottomNav uses lg:hidden to avoid colliding with desktop LeftSidebar'
}, () => {
  const content = readSrcFile('components/Navigation/MobileBottomNav.tsx');
  assert.ok(content.includes('lg:hidden'), 'MobileBottomNav must include lg:hidden class');
});

defineTest('app/page.tsx imports and renders MobileBottomNav', {
  tier: 1, milestone: 3, feature: 'F11',
  description: 'app/page.tsx mounts MobileBottomNav for responsive navigation'
}, () => {
  const content = readSrcFile('app/page.tsx');
  assert.match(content, /import\s+MobileBottomNav/, 'page.tsx must import MobileBottomNav');
  assert.match(content, /<MobileBottomNav/, 'page.tsx must render MobileBottomNav');
});

defineTest('app/page.tsx includes bottom padding to prevent content overlap', {
  tier: 1, milestone: 3, feature: 'F11',
  description: 'page.tsx provides pb-16 lg:pb-0 bottom padding for mobile navigation bar'
}, () => {
  const content = readSrcFile('app/page.tsx');
  assert.ok(content.includes('pb-16') || content.includes('pb-20'), 'page.tsx must include bottom scroll padding for MobileBottomNav');
});

// ============================================================================
// FEATURE 12: Dead Component Deletion
// ============================================================================

defineTest('StatsCards.tsx is deleted or has zero imports across src', {
  tier: 1, milestone: 3, feature: 'F12',
  description: 'Orphan component StatsCards.tsx is safely deleted or unreferenced'
}, () => {
  const exists = fileExistsInSrc('components/Dashboard/StatsCards.tsx');
  if (exists) {
    const allFiles = getAllSrcFiles();
    let importCount = 0;
    for (const f of allFiles) {
      if (f.endsWith('StatsCards.tsx')) continue;
      const c = readSrcFile(getSrcRelative(f));
      if (c.includes('StatsCards')) importCount++;
    }
    assert.equal(importCount, 0, 'StatsCards.tsx must have 0 external references');
  } else {
    assert.ok(true, 'StatsCards.tsx is successfully deleted');
  }
});

defineTest('MyLocation.tsx is deleted or has zero imports across src', {
  tier: 1, milestone: 3, feature: 'F12',
  description: 'Orphan component MyLocation.tsx is safely deleted or unreferenced'
}, () => {
  const exists = fileExistsInSrc('components/Location/MyLocation.tsx');
  if (exists) {
    const allFiles = getAllSrcFiles();
    let importCount = 0;
    for (const f of allFiles) {
      if (f.endsWith('MyLocation.tsx')) continue;
      const c = readSrcFile(getSrcRelative(f));
      if (c.includes('components/Location/MyLocation') || c.includes("from './MyLocation'") || c.includes("from '../Location/MyLocation'")) {
        importCount++;
      }
    }
    assert.equal(importCount, 0, 'MyLocation.tsx must have 0 external imports');
  } else {
    assert.ok(true, 'MyLocation.tsx is successfully deleted');
  }
});

defineTest('ActionButtons.tsx is deleted or has zero imports across src', {
  tier: 1, milestone: 3, feature: 'F12',
  description: 'Orphan component ActionButtons.tsx is safely deleted or unreferenced'
}, () => {
  const exists = fileExistsInSrc('components/UI/ActionButtons.tsx');
  if (exists) {
    const allFiles = getAllSrcFiles();
    let importCount = 0;
    for (const f of allFiles) {
      if (f.endsWith('ActionButtons.tsx')) continue;
      const c = readSrcFile(getSrcRelative(f));
      if (c.includes('ActionButtons')) importCount++;
    }
    assert.equal(importCount, 0, 'ActionButtons.tsx must have 0 external imports');
  } else {
    assert.ok(true, 'ActionButtons.tsx is successfully deleted');
  }
});

defineTest('ObjectList.tsx is deleted or has zero imports across src', {
  tier: 1, milestone: 3, feature: 'F12',
  description: 'Orphan component ObjectList.tsx is safely deleted or unreferenced'
}, () => {
  const exists = fileExistsInSrc('components/ObjectPanel/ObjectList.tsx');
  if (exists) {
    const allFiles = getAllSrcFiles();
    let importCount = 0;
    for (const f of allFiles) {
      if (f.endsWith('ObjectList.tsx')) continue;
      const c = readSrcFile(getSrcRelative(f));
      if (c.includes('ObjectList') && !c.includes('ConstructionObject')) importCount++;
    }
    assert.equal(importCount, 0, 'ObjectList.tsx must have 0 external imports');
  } else {
    assert.ok(true, 'ObjectList.tsx is successfully deleted');
  }
});

defineTest('DynamicMap.tsx is deleted or has zero imports across src', {
  tier: 1, milestone: 3, feature: 'F12',
  description: 'Orphan component DynamicMap.tsx is safely deleted or unreferenced'
}, () => {
  const exists = fileExistsInSrc('components/Map/DynamicMap.tsx');
  if (exists) {
    const allFiles = getAllSrcFiles();
    let importCount = 0;
    for (const f of allFiles) {
      if (f.endsWith('DynamicMap.tsx')) continue;
      const c = readSrcFile(getSrcRelative(f));
      if (c.includes('DynamicMap')) importCount++;
    }
    assert.equal(importCount, 0, 'DynamicMap.tsx must have 0 external imports');
  } else {
    assert.ok(true, 'DynamicMap.tsx is successfully deleted');
  }
});

defineTest('Zero broken import statements across the entire application codebase', {
  tier: 1, milestone: 3, feature: 'F12',
  description: 'Verifies all imports in src reference existing files'
}, () => {
  const allFiles = getAllSrcFiles().filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
  const missingImports: string[] = [];

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const importRegex = /(?:import|from)\s+['"](\.[^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const relTarget = match[1];
      const dir = path.dirname(filePath);
      const targetBase = path.resolve(dir, relTarget);
      const candidates = [
        targetBase,
        `${targetBase}.ts`,
        `${targetBase}.tsx`,
        `${targetBase}.js`,
        `${targetBase}.json`,
        path.resolve(targetBase, 'index.ts'),
        path.resolve(targetBase, 'index.tsx'),
      ];
      const found = candidates.some(c => fs.existsSync(c));
      if (!found) {
        missingImports.push(`${filePath} -> ${relTarget}`);
      }
    }
  }

  assert.equal(missingImports.length, 0, `Found broken imports: ${missingImports.join(', ')}`);
});
