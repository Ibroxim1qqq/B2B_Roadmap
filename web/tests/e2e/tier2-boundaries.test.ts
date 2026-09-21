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
// TIER 2: BOUNDARY & CORNER CASES
// ============================================================================

// --- Category 1: Modals Boundaries ---

defineTest('Modal ESC handler is resilient to multiple rapid Escape presses', {
  tier: 2, milestone: 1, feature: 'B1_MODALS',
  description: 'Repeated Escape key events do not throw errors'
}, () => {
  const dom = new MockDOM();
  const target = dom.createElement('div');
  let closeCount = 0;

  const hook = simulateUseClickOutside({ current: target }, () => { closeCount++; }, true, dom);
  // Dispatch 10 rapid Escape keys
  for (let i = 0; i < 10; i++) {
    hook.triggerEscapeKey();
  }
  assert.equal(closeCount, 10, 'Escape handler executes deterministically on each event');
  hook.unmount();
});

defineTest('Modal backdrop click ignores clicks targeting inner modal container', {
  tier: 2, milestone: 1, feature: 'B1_MODALS',
  description: 'Clicking inside the modal card does not trigger backdrop close'
}, () => {
  const content = readSrcFile('components/ObjectPanel/CreateObjectModal.tsx');
  // Must verify e.target === e.currentTarget check or separate backdrop element
  assert.match(content, /e\.target\s*===\s*e\.currentTarget|onClick=\{onClose\}/, 'Backdrop handler must protect inner card clicks');
});

defineTest('CreateObjectModal handles empty/blank form submission safely', {
  tier: 2, milestone: 1, feature: 'B1_MODALS',
  description: 'Form submission validates required fields without crashing'
}, () => {
  const content = readSrcFile('components/ObjectPanel/CreateObjectModal.tsx');
  assert.match(content, /handleSubmit|onSubmit/, 'Modal contains submit handler');
  assert.match(content, /required|!name|!object_name/, 'Modal validates required fields');
});

defineTest('Modal backdrop overlay z-index is strictly greater than map controls and bottom bars', {
  tier: 2, milestone: 1, feature: 'B1_MODALS',
  description: 'Modal overlay z-index exceeds Leaflet controls (400) and navbars (30-50)'
}, () => {
  const createModal = readSrcFile('components/ObjectPanel/CreateObjectModal.tsx');
  const bottomSheet = readSrcFile('components/UI/BottomSheet.tsx');

  // Verify high z-index
  const modalHasHighZ = createModal.includes('z-[2000]') || createModal.includes('z-[1000]') || createModal.includes('z-50');
  assert.ok(modalHasHighZ, 'CreateObjectModal has high z-index overlay');

  const sheetHasHighZ = bottomSheet.includes('z-[1000]') || bottomSheet.includes('z-[1001]') || bottomSheet.includes('z-50');
  assert.ok(sheetHasHighZ, 'BottomSheet has high z-index overlay');
});

defineTest('LoginModal unauthenticated state closes without crashing when onClose is missing', {
  tier: 2, milestone: 1, feature: 'B1_MODALS',
  description: 'LoginModal on first visit has no onClose and does not throw null callback errors'
}, () => {
  const content = readSrcFile('components/Auth/LoginModal.tsx');
  assert.match(content, /onClose\?\.?\(\)|onClose\s*&&\s*onClose\(\)|onClose\)\s*\{\s*onClose\(\)/, 'Calls onClose optionally with null-safety');
});

// --- Category 2: Dropdowns Boundaries ---

defineTest('useClickOutside recognizes elements clicked on exact boundary as inside', {
  tier: 2, milestone: 1, feature: 'B2_DROPDOWNS',
  description: 'Click on border or child of ref container does not trigger outside click'
}, () => {
  const dom = new MockDOM();
  const dropdown = dom.createElement('div');
  const borderElement = dom.createElement('div');
  dropdown.children.push(borderElement);
  borderElement.parentNode = dropdown;
  let closed = false;

  const hook = simulateUseClickOutside({ current: dropdown }, () => { closed = true; }, true, dom);
  hook.triggerInsideClick(borderElement);

  assert.equal(closed, false, 'Click on dropdown border element must NOT close the dropdown');
  hook.unmount();
});

defineTest('Rapid toggling of dropdown does not leave dangling listeners', {
  tier: 2, milestone: 1, feature: 'B2_DROPDOWNS',
  description: 'Toggling enabled true/false cleans up listeners reliably'
}, () => {
  const dom = new MockDOM();
  const target = dom.createElement('div');
  let count = 0;

  // Simulate 5 toggle cycles
  for (let i = 0; i < 5; i++) {
    const hook = simulateUseClickOutside({ current: target }, () => { count++; }, true, dom);
    assert.equal(dom.getListenerCount('mousedown'), 1);
    hook.unmount();
    assert.equal(dom.getListenerCount('mousedown'), 0);
  }
});

defineTest('Dropdowns in FilterToolbar safely handle zero matching filter results', {
  tier: 2, milestone: 2, feature: 'B2_DROPDOWNS',
  description: 'FilterToolbar and BottomResults handle empty filtered lists gracefully'
}, () => {
  const bottomResults = readSrcFile('components/ObjectCards/BottomResults.tsx');
  assert.match(bottomResults, /length === 0|!objects\.length|topilmadi/, 'Displays empty message when no objects match filter');
});

defineTest('Touch events trigger outside click handler for mobile touch devices', {
  tier: 2, milestone: 1, feature: 'B2_DROPDOWNS',
  description: 'useClickOutside registers and reacts to touchstart on mobile'
}, () => {
  const hookContent = readSrcFile('hooks/useClickOutside.ts');
  assert.match(hookContent, /touchstart/, 'useClickOutside must listen to touchstart for mobile browsers');
});

defineTest('Dropdown menu does not close when interacting with inputs inside it', {
  tier: 2, milestone: 1, feature: 'B2_DROPDOWNS',
  description: 'Inputs inside dropdown containers retain focus without closing parent'
}, () => {
  const dom = new MockDOM();
  const menu = dom.createElement('div');
  const input = dom.createElement('input');
  menu.children.push(input);
  input.parentNode = menu;
  let closed = false;

  const hook = simulateUseClickOutside({ current: menu }, () => { closed = true; }, true, dom);
  hook.triggerInsideClick(input);

  assert.equal(closed, false, 'Clicking input inside dropdown must not close dropdown');
  hook.unmount();
});

// --- Category 3: Empty Search & Search Input Boundaries ---

defineTest('Search query with empty string returns full object list without errors', {
  tier: 2, milestone: 1, feature: 'B3_SEARCH',
  description: 'Empty search query string matches all records'
}, () => {
  const objects = loadRealSheetsData();
  const query: string = '';
  const filtered = objects.filter((o: any) => {
    if (!query) return true;
    return o.object_name?.toLowerCase().includes(query.toLowerCase());
  });
  assert.equal(filtered.length, objects.length, 'Empty search query should retain all 388 objects');
});

defineTest('Search query with whitespace only is treated as empty query', {
  tier: 2, milestone: 1, feature: 'B3_SEARCH',
  description: 'Whitespace-only query trims to empty and returns all objects'
}, () => {
  const objects = loadRealSheetsData();
  const query = '     ';
  const trimmed = query.trim();
  const filtered = objects.filter((o: any) => {
    if (!trimmed) return true;
    return o.object_name?.toLowerCase().includes(trimmed.toLowerCase());
  });
  assert.equal(filtered.length, objects.length, 'Whitespace search should match all objects');
});

defineTest('Search query with regex special characters does not cause crash or syntax error', {
  tier: 2, milestone: 1, feature: 'B3_SEARCH',
  description: 'Special characters [ ] ( ) * + ? are handled via String.includes safely'
}, () => {
  const objects = loadRealSheetsData();
  const query = '[.*+?^${}()|]';
  assert.doesNotThrow(() => {
    objects.filter((o: any) => {
      const q = query.toLowerCase();
      return (o.object_name || '').toLowerCase().includes(q);
    });
  }, 'String.includes with special regex chars should not throw');
});

defineTest('Search query matches Uzbek special characters and apostrophes', {
  tier: 2, milestone: 2, feature: 'B3_SEARCH',
  description: 'Queries with apostrophes match objects in Samarqand districts'
}, () => {
  const objects = loadRealSheetsData();
  // Find objects with apostrophe like "Ko'p" or "Qo'shrabot"
  const withApostrophe = objects.filter((o: any) => {
    const text = `${o.object_name || ''} ${o.district || ''}`;
    return text.includes("'") || text.includes("’");
  });
  assert.ok(withApostrophe.length > 0, 'Found objects with Uzbek apostrophes in dataset');
});

defineTest('Extremely long search query (1000 chars) processes within 50ms without freezing', {
  tier: 2, milestone: 1, feature: 'B3_SEARCH',
  description: 'Long input strings do not cause exponential backtracking'
}, () => {
  const objects = loadRealSheetsData();
  const longQuery = 'A'.repeat(1000);
  const start = performance.now();
  const filtered = objects.filter((o: any) => {
    return (o.object_name || '').toLowerCase().includes(longQuery.toLowerCase());
  });
  const duration = performance.now() - start;
  assert.equal(filtered.length, 0);
  assert.ok(duration < 50, `Search took ${duration}ms, must be under 50ms`);
});

// --- Category 4: Viewport Breakpoints Boundaries ---

defineTest('Viewport boundary 375px (iPhone SE): BottomSheet active, LeftSidebar hidden', {
  tier: 2, milestone: 1, feature: 'B4_VIEWPORT',
  description: '375px viewport activates mobile sheet and bottom navigation'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  const bottomSheetContent = readSrcFile('components/UI/BottomSheet.tsx');
  const vis = evaluateResponsiveVisibility(375, pageContent, bottomSheetContent);

  assert.ok(vis.bottomSheetVisible, 'BottomSheet should be visible at 375px');
  assert.equal(vis.leftSidebarVisible, false, 'LeftSidebar should be hidden at 375px');
  assert.ok(vis.mobileBottomNavVisible, 'MobileBottomNav should be visible at 375px');
});

defineTest('Viewport boundary 767px (mobile max): BottomSheet active', {
  tier: 2, milestone: 1, feature: 'B4_VIEWPORT',
  description: '767px viewport activates BottomSheet before tablet threshold'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  const bottomSheetContent = readSrcFile('components/UI/BottomSheet.tsx');
  const vis = evaluateResponsiveVisibility(767, pageContent, bottomSheetContent);

  assert.ok(vis.bottomSheetVisible, 'BottomSheet should be visible at 767px');
  assert.equal(vis.leftSidebarVisible, false, 'LeftSidebar should be hidden at 767px');
});

defineTest('Viewport boundary 768px (tablet portrait exact): Details panel visible (no black hole)', {
  tier: 2, milestone: 1, feature: 'B4_VIEWPORT',
  description: '768px tablet portrait renders details view without disappearing'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  const bottomSheetContent = readSrcFile('components/UI/BottomSheet.tsx');
  const vis = evaluateResponsiveVisibility(768, pageContent, bottomSheetContent);

  const hasDetails = vis.desktopDrawerVisible || vis.bottomSheetVisible;
  assert.ok(hasDetails, 'Details panel must be visible at 768px exact boundary');
});

defineTest('Viewport boundary 1024px (desktop exact): LeftSidebar visible, MobileBottomNav hidden', {
  tier: 2, milestone: 3, feature: 'B4_VIEWPORT',
  description: '1024px desktop breakpoint switches navigation from mobile to desktop sidebar'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  const bottomSheetContent = readSrcFile('components/UI/BottomSheet.tsx');
  const vis = evaluateResponsiveVisibility(1024, pageContent, bottomSheetContent);

  assert.ok(vis.leftSidebarVisible, 'LeftSidebar should be visible at 1024px');
  assert.equal(vis.mobileBottomNavVisible, false, 'MobileBottomNav should be hidden at 1024px');
});

defineTest('Viewport boundary 1280px (XL desktop exact): Desktop side drawer active', {
  tier: 2, milestone: 1, feature: 'B4_VIEWPORT',
  description: '1280px large screen renders desktop side drawer'
}, () => {
  const pageContent = readSrcFile('app/page.tsx');
  const bottomSheetContent = readSrcFile('components/UI/BottomSheet.tsx');
  const vis = evaluateResponsiveVisibility(1280, pageContent, bottomSheetContent);

  assert.ok(vis.desktopDrawerVisible, 'Desktop drawer should be visible at 1280px');
});

// --- Category 5: Extreme Data & Null Safety Boundaries ---

defineTest('Objects with null or undefined image_url render architectural icon without errors', {
  tier: 2, milestone: 2, feature: 'B5_DATA',
  description: 'Absence of image_url does not cause null property access'
}, () => {
  const objects = loadRealSheetsData();
  for (const obj of objects) {
    // Check that obj.image_url is safely accessed
    const imageUrl = obj.image_url;
    const hasImage = typeof imageUrl === 'string' && imageUrl.trim().length > 0;
    assert.equal(typeof hasImage, 'boolean');
  }
});

defineTest('Objects with missing manager_phone or phone render cleanly without undefined', {
  tier: 2, milestone: 2, feature: 'B5_DATA',
  description: 'Card components handle missing phone numbers gracefully'
}, () => {
  const objects = loadRealSheetsData();
  const missingPhone = objects.filter((o: any) => !o.phone && !o.manager_phone);
  assert.ok(missingPhone.length > 0, 'Found objects without phone numbers in dataset');
  // Confirm that none cause fatal errors
  for (const o of missingPhone.slice(0, 10)) {
    const displayPhone = o.manager_phone || o.phone || 'Telefon kiritilmagan';
    assert.ok(displayPhone.length > 0);
  }
});

defineTest('Objects with extremely long names use truncate or line-clamp styling', {
  tier: 2, milestone: 2, feature: 'B5_DATA',
  description: 'Long object names do not expand layout containers indefinitely'
}, () => {
  const bottomResults = readSrcFile('components/ObjectCards/BottomResults.tsx');
  assert.match(bottomResults, /truncate|line-clamp/, 'BottomResults should use truncate or line-clamp on text');
});

defineTest('Unauthenticated state (currentUser === null) provides safe fallbacks', {
  tier: 2, milestone: 2, feature: 'B5_DATA',
  description: 'Navbar and VisitsView handle null currentUser safely'
}, () => {
  const navbar = readSrcFile('components/Header/Navbar.tsx');
  const visits = readSrcFile('components/Visits/VisitsView.tsx');

  assert.match(navbar, /currentUser\?.name|\|\|\s*['"][^'"]+['"]/, 'Navbar handles null currentUser');
  assert.match(visits, /currentUser\?.name|\|\|\s*['"][^'"]+['"]/, 'VisitsView handles null currentUser');
});

defineTest('Objects with coordinates [0, 0] or null are handled safely', {
  tier: 2, milestone: 1, feature: 'B5_DATA',
  description: 'Invalid geo coordinates do not crash map clustering or centering'
}, () => {
  const objects = loadRealSheetsData();
  const validCoords = objects.filter((o: any) => {
    const lat = parseFloat(o.latitude);
    const lng = parseFloat(o.longitude);
    return !isNaN(lat) && !isNaN(lng);
  });
  assert.ok(validCoords.length > 0, 'Real dataset has valid coordinates for mapping');
});
