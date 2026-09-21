import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import {
  defineTest,
  readSrcFile,
  fileExistsInSrc,
  getAllSrcFiles,
  MockDOM,
  simulateUseClickOutside,
  evaluateResponsiveVisibility,
  loadRealSheetsData,
  getSrcRelative,
} from './harness.ts';

// ============================================================================
// TIER 4: REAL-WORLD SCENARIOS
// ============================================================================

// --- Scenario 1: Commercial Sales Agent Workflow ---

defineTest('Scenario 1: Commercial Sales Agent Workflow - Search, Inspect, Copy Phone, Log Visit', {
  tier: 4, milestone: 4, feature: 'S1_SALES_AGENT',
  description: 'Full sales agent journey: search object -> open details -> copy contact -> check visits KPI'
}, () => {
  // Step 1: User authentication representation
  const agentUser = {
    name: 'Aziz Karimov',
    role: 'B2B Sales Representative',
    phone: '+998 90 123 45 67',
    avatarInitials: 'AK',
  };

  // Step 2: Load real object database and search/filter
  const objects = loadRealSheetsData();
  assert.ok(objects.length > 0, 'Database contains objects');

  const query = 'Samarqand';
  const matched = objects.filter((o: any) => {
    const text = `${o.object_name || ''} ${o.district || ''} ${o.address || ''}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });
  assert.ok(matched.length > 0, 'Found objects matching search query');

  // Step 3: Select the first matching object
  const selectedObject = matched[0];
  assert.ok(selectedObject.source_id || selectedObject.id, 'Selected object has unique ID');

  // Step 4: Verify details view contract permits copying manager contact
  const pageContent = readSrcFile('app/page.tsx');
  // Confirm text selection is enabled globally
  const rootSnippet = pageContent.slice(285, 325);
  assert.ok(!rootSnippet.includes('select-none'), 'Text selection must be enabled so sales agent can copy phone number');

  // Step 5: Verify ObjectDetails renders contact information
  const detailsContent = readSrcFile('components/ObjectPanel/ObjectDetails.tsx');
  assert.match(detailsContent, /manager_name|manager_phone|phone/, 'Details view displays manager phone number');

  // Step 6: Verify VisitsView dynamic KPI card binding
  const visitsContent = readSrcFile('components/Visits/VisitsView.tsx');
  assert.match(visitsContent, /currentUser/, 'VisitsView receives currentUser');
  assert.ok(!visitsContent.includes('Ibroxim T. (Field Sales)'), 'VisitsView must not hardcode previous user name');

  // Step 7: Verify page.tsx links currentUser to VisitsView
  assert.match(pageContent, /currentUser=\{currentUser\}/, 'page.tsx dynamically binds active sales agent');
});

// --- Scenario 2: Mobile Field Inspector Workflow ---

defineTest('Scenario 2: Mobile Field Inspector Workflow - 390px Viewport Navigation & BottomSheet Dismissal', {
  tier: 4, milestone: 4, feature: 'S2_MOBILE_INSPECTOR',
  description: 'Mobile inspector workflow: mobile nav -> table view -> bottom sheet details -> ESC/backdrop dismiss'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  const bottomSheetContent = readSrcFile('components/UI/BottomSheet.tsx');

  // Step 1: Verify responsive visibility at 390px (iPhone 14)
  const mobileVis = evaluateResponsiveVisibility(390, pageContent, bottomSheetContent);
  assert.ok(mobileVis.bottomSheetVisible, 'BottomSheet must be active on 390px mobile device');
  assert.equal(mobileVis.leftSidebarVisible, false, 'Desktop sidebar must be hidden on mobile');
  assert.ok(mobileVis.mobileBottomNavVisible, 'MobileBottomNav must be visible on mobile');

  // Step 2: Verify BottomSheet contains backdrop click handler and Escape key listener
  assert.match(bottomSheetContent, /onClick=\{onClose\}/, 'BottomSheet backdrop has click dismiss handler');
  assert.match(bottomSheetContent, /Escape/, 'BottomSheet listens for Escape key dismissal');

  // Step 3: Verify BottomSheet z-index elevation above Leaflet controls
  const isElevated = bottomSheetContent.includes('z-[1000]') || bottomSheetContent.includes('z-[1001]');
  assert.ok(isElevated, 'BottomSheet z-index is >= 1000 so map controls do not bleed through');

  // Step 4: Verify BottomSheet removed md:hidden
  assert.ok(!bottomSheetContent.includes('md:hidden'), 'BottomSheet does not have hardcoded md:hidden');
});

// --- Scenario 3: UI Polish, Schema Integrity & Terminology Audit ---

defineTest('Scenario 3: Audit of UI Polish, Schema Integrity & System Terminology', {
  tier: 4, milestone: 4, feature: 'S3_AUDIT_POLISH',
  description: 'Full audit: 0 fake chevrons, 0 stock photos, 0 column letters, 0 Google Sheets strings, 0 dead files'
}, () => {
  // Check 1: Fake chevrons in FilterToolbar.tsx
  const filterContent = readSrcFile('components/Filters/FilterToolbar.tsx');
  const regionIndex = filterContent.indexOf('Samarqand viloyati');
  if (regionIndex !== -1) {
    const regionSection = filterContent.substring(regionIndex - 100, regionIndex + 150);
    assert.ok(!regionSection.includes('ChevronDown'), 'No fake ChevronDown on Samarqand viloyati badge');
  }

  // Check 2: Fallback photo in BottomResults.tsx
  const resultsContent = readSrcFile('components/ObjectCards/BottomResults.tsx');
  assert.ok(!resultsContent.includes('photo-1545324418-cc1a3fa10c00'), 'No repetitive Unsplash stock URL in BottomResults');

  // Check 3: Dead checkmark row in BottomResults.tsx
  assert.ok(!resultsContent.includes('CheckCircle2'), 'No dead CheckCircle2 checkmarks in BottomResults');

  // Check 4: Developer column codes in CustomFieldManager.tsx
  const customFieldsContent = readSrcFile('components/CustomFields/CustomFieldManager.tsx');
  assert.ok(!customFieldsContent.includes('W-AH'), 'No W-AH column letters in CustomFieldManager');
  assert.ok(!customFieldsContent.includes('A-V'), 'No A-V column letters in CustomFieldManager');
  assert.ok(!customFieldsContent.includes('>Ustun<'), 'No Ustun column letter header in CustomFieldManager');

  // Check 5: Google Sheets references across all UI components
  const navbarContent = readSrcFile('components/Header/Navbar.tsx');
  const dashboardContent = readSrcFile('components/Dashboard/DashboardView.tsx');
  const loginContent = readSrcFile('components/Auth/LoginModal.tsx');
  const layoutContent = readSrcFile('app/layout.tsx');

  assert.ok(!navbarContent.includes('Google Sheets'), 'No Google Sheets in Navbar');
  assert.ok(!navbarContent.includes('Sheets Sinxron'), 'No Sheets Sinxron in Navbar');
  assert.ok(!resultsContent.includes('>Google Sheets<'), 'No Google Sheets in BottomResults');
  assert.ok(!dashboardContent.includes('Google Sheets integratsiyasi'), 'No Google Sheets in Dashboard');
  assert.ok(!loginContent.includes('Google Sheets'), 'No Google Sheets in LoginModal');
  assert.ok(!layoutContent.includes('Google Sheets'), 'No Google Sheets in app/layout metadata');

  // Check 6: Dead components deletion or non-usage
  const deadComponents = [
    'components/Dashboard/StatsCards.tsx',
    'components/Location/MyLocation.tsx',
    'components/UI/ActionButtons.tsx',
    'components/ObjectPanel/ObjectList.tsx',
    'components/Map/DynamicMap.tsx'
  ];

  for (const comp of deadComponents) {
    if (fileExistsInSrc(comp)) {
      // If file still exists, must have 0 external imports
      const allFiles = getAllSrcFiles().filter(f => !f.endsWith(comp));
      const compName = path.basename(comp, '.tsx');
      let usages = 0;
      for (const f of allFiles) {
        const c = readSrcFile(getSrcRelative(f));
        if (c.includes(compName) && !c.includes('ConstructionObject')) usages++;
      }
      assert.equal(usages, 0, `Dead component ${comp} must have 0 imports`);
    }
  }
});
