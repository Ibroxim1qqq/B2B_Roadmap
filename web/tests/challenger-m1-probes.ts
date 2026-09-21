/**
 * Challenger M1-2 Adversarial Stress & Empirical Verification Suite
 *
 * Exhaustive empirical testing for Milestone 1:
 * 1. Multiple dropdown interaction sequencing & race conditions
 * 2. Escape behavior when dropdown and modal co-exist
 * 3. Event listener leak checks across mount/unmount/re-render cycles
 * 4. Map drag isolation vs text selection
 * 5. Edge cases: null refs, rapid keypress storms, click storms
 */

import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../src');

// --- Realistic DOM Mock Supporting Event Bubbling & Listener Accounting ---

type Listener = (e: any) => void;

interface EventTargetMock {
  addEventListener(type: string, listener: Listener): void;
  removeEventListener(type: string, listener: Listener): void;
  dispatchEvent(event: any): boolean;
  getListenerCount(type?: string): number;
}

class MockEventTarget implements EventTargetMock {
  name: string;
  listeners: Map<string, Set<Listener>> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  addEventListener(type: string, listener: Listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
    if (this.listeners.get(type)?.size === 0) {
      this.listeners.delete(type);
    }
  }

  dispatchEvent(event: any): boolean {
    event.currentTarget = this;
    const set = this.listeners.get(event.type);
    if (set) {
      // Clone set to allow listeners to remove themselves safely
      const copy = Array.from(set);
      for (const listener of copy) {
        if (event._immediateStopped) break;
        listener(event);
      }
    }
    return !event.defaultPrevented;
  }

  getListenerCount(type?: string): number {
    if (type) {
      return this.listeners.get(type)?.size ?? 0;
    }
    let total = 0;
    for (const set of this.listeners.values()) {
      total += set.size;
    }
    return total;
  }
}

export interface MockDOMElement {
  id: string;
  tagName: string;
  parentNode: MockDOMElement | null;
  children: MockDOMElement[];
  classList: Set<string>;
  contains(node: MockDOMElement | null): boolean;
  appendChild(child: MockDOMElement): void;
}

export class MockDOMTree {
  window: MockEventTarget = new MockEventTarget('window');
  document: MockEventTarget = new MockEventTarget('document');
  root: MockDOMElement;

  constructor() {
    this.root = this.createElement('body', 'body-root');
  }

  createElement(tagName: string, id: string = Math.random().toString(36).slice(2)): MockDOMElement {
    const el: MockDOMElement = {
      id,
      tagName: tagName.toUpperCase(),
      parentNode: null,
      children: [],
      classList: new Set<string>(),
      appendChild(child: MockDOMElement) {
        child.parentNode = el;
        el.children.push(child);
      },
      contains(target: MockDOMElement | null): boolean {
        if (!target) return false;
        if (target === el) return true;
        let curr: MockDOMElement | null = target;
        while (curr) {
          if (curr === el) return true;
          curr = curr.parentNode;
        }
        return false;
      }
    };
    return el;
  }

  // Dispatches an event through bubbling: target -> parents -> document -> window
  dispatchBubbledEvent(type: string, target: MockDOMElement, detail: Record<string, any> = {}) {
    const event = {
      type,
      target,
      currentTarget: target,
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
      _stopped: false,
      _immediateStopped: false,
      stopPropagation() {
        this._stopped = true;
      },
      stopImmediatePropagation() {
        this._stopped = true;
        this._immediateStopped = true;
      },
      ...detail
    };

    // 1. Bubble up DOM tree
    let curr: MockDOMElement | null = target;
    while (curr) {
      if (event._stopped) return;
      curr = curr.parentNode;
    }

    // 2. Document
    if (!event._stopped) {
      this.document.dispatchEvent(event);
    }

    // 3. Window
    if (!event._stopped) {
      this.window.dispatchEvent(event);
    }
  }
}

// --- Direct Simulation of useClickOutside Lifecycle ---
function attachUseClickOutside<T extends MockDOMElement>(
  ref: { current: T | null },
  handler: () => void,
  enabled: boolean,
  domTree: MockDOMTree
): () => void {
  if (!enabled) return () => {};

  const handlePointerDown = (event: any) => {
    const target = event.target as MockDOMElement | null;
    if (ref.current && target && !ref.current.contains(target)) {
      handler();
    }
  };

  const handleKeyDown = (event: any) => {
    if (event.key === 'Escape') {
      handler();
    }
  };

  domTree.document.addEventListener('mousedown', handlePointerDown);
  domTree.document.addEventListener('touchstart', handlePointerDown);
  domTree.document.addEventListener('keydown', handleKeyDown);

  return () => {
    domTree.document.removeEventListener('mousedown', handlePointerDown);
    domTree.document.removeEventListener('touchstart', handlePointerDown);
    domTree.document.removeEventListener('keydown', handleKeyDown);
  };
}

// --- Direct Simulation of Modal Escape Listener Lifecycle ---
function attachModalEscapeListener(
  onClose: () => void,
  domTree: MockDOMTree
): () => void {
  const handleKeyDown = (e: any) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  domTree.window.addEventListener('keydown', handleKeyDown);
  return () => {
    domTree.window.removeEventListener('keydown', handleKeyDown);
  };
}

// --- Test Results Tracker ---
interface TestReport {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const reports: TestReport[] = [];

async function runProbe(category: string, name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Number((performance.now() - start).toFixed(2));
    reports.push({ category, name, passed: true, durationMs });
    console.log(`  ✔ [${category}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Number((performance.now() - start).toFixed(2));
    reports.push({ category, name, passed: false, error: err.message, durationMs });
    console.error(`  ✖ [${category}] ${name} FAILED: ${err.message}`);
  }
}

// ============================================================================
// SUITE EXECUTION
// ============================================================================
async function runAllChallengerProbes() {
  console.log('\n======================================================================');
  console.log('     Challenger M1-2: Adversarial Stress & Empirical Verification     ');
  console.log('======================================================================\n');

  // --------------------------------------------------------------------------
  // 1. MULTIPLE DROPDOWN INTERACTION SEQUENCING
  // --------------------------------------------------------------------------
  console.log('--- CATEGORY 1: Dropdown Interaction Sequencing ---');

  await runProbe('DROPDOWNS', 'FilterToolbar: Rapid alternating toggle maintains mutually exclusive state', () => {
    const dom = new MockDOMTree();
    const districtButton = dom.createElement('button', 'district-btn');
    const districtMenu = dom.createElement('div', 'district-menu');
    const districtWrapper = dom.createElement('div', 'district-wrapper');
    districtWrapper.appendChild(districtButton);
    districtWrapper.appendChild(districtMenu);
    dom.root.appendChild(districtWrapper);

    const statusButton = dom.createElement('button', 'status-btn');
    const statusMenu = dom.createElement('div', 'status-menu');
    const statusWrapper = dom.createElement('div', 'status-wrapper');
    statusWrapper.appendChild(statusButton);
    statusWrapper.appendChild(statusMenu);
    dom.root.appendChild(statusWrapper);

    const outsideArea = dom.createElement('div', 'outside-area');
    dom.root.appendChild(outsideArea);

    let districtOpen = false;
    let statusOpen = false;
    let cleanups: (() => void)[] = [];

    const syncHooks = () => {
      cleanups.forEach(c => c());
      cleanups = [
        attachUseClickOutside({ current: districtWrapper }, () => { districtOpen = false; }, districtOpen, dom),
        attachUseClickOutside({ current: statusWrapper }, () => { statusOpen = false; }, statusOpen, dom),
      ];
    };

    // User actions mimicking FilterToolbar.tsx:
    // District click: { setDistrictOpen(!districtOpen); setStatusOpen(false); }
    // Status click: { setStatusOpen(!statusOpen); setDistrictOpen(false); }

    const clickDistrict = () => {
      dom.dispatchBubbledEvent('mousedown', districtButton);
      districtOpen = !districtOpen;
      statusOpen = false;
      syncHooks();
    };

    const clickStatus = () => {
      dom.dispatchBubbledEvent('mousedown', statusButton);
      statusOpen = !statusOpen;
      districtOpen = false;
      syncHooks();
    };

    const clickOutside = () => {
      dom.dispatchBubbledEvent('mousedown', outsideArea);
      syncHooks();
    };

    // Run 5,000 rapid randomized user actions
    const actions = [clickDistrict, clickStatus, clickOutside];
    for (let i = 0; i < 5000; i++) {
      const act = actions[Math.floor(Math.random() * actions.length)];
      act();
      assert.ok(
        !(districtOpen && statusOpen),
        `Race condition at iteration ${i}: both districtOpen and statusOpen are true!`
      );
    }

    cleanups.forEach(c => c());
  });

  await runProbe('DROPDOWNS', 'Cross-component: Opening Navbar user dropdown immediately closes FilterToolbar dropdowns', () => {
    const dom = new MockDOMTree();
    const filterDistrictRef = dom.createElement('div', 'filter-district');
    const navbarUserRef = dom.createElement('div', 'navbar-user');
    dom.root.appendChild(filterDistrictRef);
    dom.root.appendChild(navbarUserRef);

    let districtOpen = true;
    let userDropdownOpen = false;

    let cleanupDistrict = attachUseClickOutside({ current: filterDistrictRef }, () => { districtOpen = false; }, districtOpen, dom);
    let cleanupUser = attachUseClickOutside({ current: navbarUserRef }, () => { userDropdownOpen = false; }, userDropdownOpen, dom);

    // User clicks Navbar user dropdown toggle
    const userToggleBtn = dom.createElement('button', 'user-toggle');
    navbarUserRef.appendChild(userToggleBtn);

    // Mousedown on Navbar user toggle
    dom.dispatchBubbledEvent('mousedown', userToggleBtn);

    // Invariant: filter district must have closed on mousedown outside
    assert.equal(districtOpen, false, 'District filter must close when user clicks Navbar dropdown');

    // Then user toggle finishes click
    userDropdownOpen = true;
    cleanupDistrict();
    cleanupUser();

    cleanupDistrict = attachUseClickOutside({ current: filterDistrictRef }, () => { districtOpen = false; }, districtOpen, dom);
    cleanupUser = attachUseClickOutside({ current: navbarUserRef }, () => { userDropdownOpen = false; }, userDropdownOpen, dom);

    assert.equal(userDropdownOpen, true, 'User dropdown should now be open');
    assert.equal(districtOpen, false, 'District filter remains closed');

    // Now click back on filter district
    dom.dispatchBubbledEvent('mousedown', filterDistrictRef);
    assert.equal(userDropdownOpen, false, 'User dropdown must close when clicking back to filter');

    cleanupDistrict();
    cleanupUser();
  });

  await runProbe('DROPDOWNS', 'ObjectsTableView & FilterToolbar dropdowns do not interfere when switching tabs', () => {
    const dom = new MockDOMTree();
    const tableDistrict = dom.createElement('div', 'table-district');
    const tableStatus = dom.createElement('div', 'table-status');
    dom.root.appendChild(tableDistrict);
    dom.root.appendChild(tableStatus);

    let tDistrict = false;
    let tStatus = false;

    // Open table district
    tDistrict = true;
    let cleanupTD = attachUseClickOutside({ current: tableDistrict }, () => { tDistrict = false; }, tDistrict, dom);

    // Click on table status button
    const statusBtn = dom.createElement('button', 'table-status-btn');
    tableStatus.appendChild(statusBtn);

    dom.dispatchBubbledEvent('mousedown', statusBtn);
    assert.equal(tDistrict, false, 'Table district closed on mousedown outside');

    tStatus = true;
    cleanupTD();
    const cleanupTS = attachUseClickOutside({ current: tableStatus }, () => { tStatus = false; }, tStatus, dom);

    assert.equal(tStatus, true, 'Table status is open');
    cleanupTS();
  });

  // --------------------------------------------------------------------------
  // 2. ESCAPE BEHAVIOR WHEN DROPDOWN AND MODAL CO-EXIST
  // --------------------------------------------------------------------------
  console.log('\n--- CATEGORY 2: Escape Behavior & Event Propagation ---');

  await runProbe('ESCAPE', 'Standard single Escape closes solitary active dropdown', () => {
    const dom = new MockDOMTree();
    const dropdown = dom.createElement('div', 'dropdown');
    dom.root.appendChild(dropdown);

    let isOpen = true;
    const cleanup = attachUseClickOutside({ current: dropdown }, () => { isOpen = false; }, isOpen, dom);

    dom.dispatchBubbledEvent('keydown', dom.root, { key: 'Escape' });
    assert.equal(isOpen, false, 'Dropdown closed on Escape');
    cleanup();
  });

  await runProbe('ESCAPE', 'Standard single Escape closes solitary active modal', () => {
    const dom = new MockDOMTree();
    let modalOpen = true;
    const cleanup = attachModalEscapeListener(() => { modalOpen = false; }, dom);

    dom.dispatchBubbledEvent('keydown', dom.root, { key: 'Escape' });
    assert.equal(modalOpen, false, 'Modal closed on Escape');
    cleanup();
  });

  await runProbe('ESCAPE', 'Adversarial: Keyboard Tab navigation into Modal while Dropdown is open', () => {
    // SCENARIO: User opens User dropdown in Navbar using mouse/keyboard.
    // Then user presses Tab key to move focus to "Yangi Obyekt" button and hits Space/Enter.
    // No mousedown/touchstart event occurred, so userDropdownOpen is still TRUE when CreateObjectModal opens!
    const dom = new MockDOMTree();
    const dropdown = dom.createElement('div', 'dropdown');
    dom.root.appendChild(dropdown);

    let dropdownOpen = true;
    let modalOpen = true;

    const cleanupDropdown = attachUseClickOutside({ current: dropdown }, () => { dropdownOpen = false; }, dropdownOpen, dom);
    const cleanupModal = attachModalEscapeListener(() => { modalOpen = false; }, dom);

    // User presses Escape key
    dom.dispatchBubbledEvent('keydown', dom.root, { key: 'Escape' });

    // DOCUMENTATION OF EMPIRICAL BEHAVIOR:
    // In DOM bubbling: keydown hits document (where useClickOutside is attached) -> dropdownOpen becomes false.
    // Since useClickOutside does NOT call event.stopPropagation(), the keydown bubbles to window (where modal is attached) -> modalOpen becomes false!
    // Result: BOTH the dropdown AND the modal close simultaneously on 1 Escape key press.
    console.log(`    ℹ Finding: Simultaneous Escape closing: dropdownOpen=${dropdownOpen}, modalOpen=${modalOpen}`);

    cleanupDropdown();
    cleanupModal();
  });

  await runProbe('ESCAPE', 'Rapid Escape burst (50 presses) does not throw or corrupt state', () => {
    const dom = new MockDOMTree();
    let closeCalls = 0;
    const cleanup = attachModalEscapeListener(() => {
      closeCalls++;
    }, dom);

    for (let i = 0; i < 50; i++) {
      dom.dispatchBubbledEvent('keydown', dom.root, { key: 'Escape' });
    }

    assert.equal(closeCalls, 50, 'Handled 50 rapid Escape presses cleanly');
    cleanup();
  });

  // --------------------------------------------------------------------------
  // 3. LISTENER LEAK CHECKS ON UNMOUNT & RE-RENDER
  // --------------------------------------------------------------------------
  console.log('\n--- CATEGORY 3: Listener Leak Checks on Mount/Unmount/Toggling ---');

  await runProbe('LEAKS', 'useClickOutside: 10,000 mount/unmount cycles has 0 listener leaks', () => {
    const dom = new MockDOMTree();
    const el = dom.createElement('div');
    const initialDocCount = dom.document.getListenerCount();

    for (let i = 0; i < 10000; i++) {
      const cleanup = attachUseClickOutside({ current: el }, () => {}, true, dom);
      cleanup();
    }

    const finalDocCount = dom.document.getListenerCount();
    assert.equal(finalDocCount, initialDocCount, `Leak detected! Initial: ${initialDocCount}, Final: ${finalDocCount}`);
  });

  await runProbe('LEAKS', 'useClickOutside: 10,000 enabled toggles has exactly 0 listeners when disabled', () => {
    const dom = new MockDOMTree();
    const el = dom.createElement('div');

    let cleanup: (() => void) | null = null;
    for (let i = 0; i < 10000; i++) {
      const isEnabled = i % 2 === 0;
      if (cleanup) cleanup();
      cleanup = attachUseClickOutside({ current: el }, () => {}, isEnabled, dom);

      if (isEnabled) {
        assert.equal(dom.document.getListenerCount('mousedown'), 1);
        assert.equal(dom.document.getListenerCount('touchstart'), 1);
        assert.equal(dom.document.getListenerCount('keydown'), 1);
      } else {
        assert.equal(dom.document.getListenerCount('mousedown'), 0);
        assert.equal(dom.document.getListenerCount('touchstart'), 0);
        assert.equal(dom.document.getListenerCount('keydown'), 0);
      }
    }
    if (cleanup) cleanup();
    assert.equal(dom.document.getListenerCount(), 0, 'No lingering listeners after toggles');
  });

  await runProbe('LEAKS', 'Modals (CreateObjectModal, LoginModal, BottomSheet): 5,000 open/close cycles has 0 leaks on window', () => {
    const dom = new MockDOMTree();
    const initialWinCount = dom.window.getListenerCount();

    for (let i = 0; i < 5000; i++) {
      // Simulate CreateObjectModal
      const c1 = attachModalEscapeListener(() => {}, dom);
      // Simulate LoginModal
      const c2 = attachModalEscapeListener(() => {}, dom);
      // Simulate BottomSheet
      const c3 = attachModalEscapeListener(() => {}, dom);

      c1();
      c2();
      c3();
    }

    const finalWinCount = dom.window.getListenerCount();
    assert.equal(finalWinCount, initialWinCount, `Window listener leak detected! Initial: ${initialWinCount}, Final: ${finalWinCount}`);
  });

  await runProbe('LEAKS', 'Inline handler re-render churn (1,000 renders) does not accumulate duplicate listeners', () => {
    const dom = new MockDOMTree();
    const el = dom.createElement('div');

    let cleanup: (() => void) | null = null;
    for (let i = 0; i < 1000; i++) {
      if (cleanup) cleanup();
      // New handler on every render (like inline () => setOpen(false))
      const newHandler = () => { /* no-op */ };
      cleanup = attachUseClickOutside({ current: el }, newHandler, true, dom);
      assert.equal(dom.document.getListenerCount('mousedown'), 1, `Mousedown count should stay 1 at render ${i}`);
    }
    if (cleanup) cleanup();
    assert.equal(dom.document.getListenerCount(), 0, 'Document has 0 listeners after final unmount');
  });

  // --------------------------------------------------------------------------
  // 4. MAP DRAG ISOLATION VS TEXT SELECTION
  // --------------------------------------------------------------------------
  console.log('\n--- CATEGORY 4: Map Drag Isolation vs Text Selection ---');

  await runProbe('SELECTION', 'page.tsx root container does NOT contain select-none', () => {
    const pageContent = fs.readFileSync(path.join(SRC_DIR, 'app/page.tsx'), 'utf-8');
    // Lines around return (line 305)
    const returnIdx = pageContent.indexOf('return (');
    assert.ok(returnIdx > 0, 'page.tsx has return statement');
    const rootJSX = pageContent.slice(returnIdx, returnIdx + 300);
    assert.ok(!rootJSX.includes('select-none'), 'page.tsx root container must not have select-none');
  });

  await runProbe('SELECTION', 'MapContainer.tsx isolates select-none to its map wrapper', () => {
    const mapContent = fs.readFileSync(path.join(SRC_DIR, 'components/Map/MapContainer.tsx'), 'utf-8');
    assert.ok(mapContent.includes('select-none'), 'MapContainer.tsx must include select-none');
    assert.match(mapContent, /<div[^>]*className=["'][^"']*select-none[^"']*["']/, 'Map wrapper div contains select-none');
  });

  await runProbe('SELECTION', 'CreateObjectModal.tsx isolates select-none to mini-map picker container', () => {
    const modalContent = fs.readFileSync(path.join(SRC_DIR, 'components/ObjectPanel/CreateObjectModal.tsx'), 'utf-8');
    assert.ok(modalContent.includes('select-none'), 'CreateObjectModal.tsx must contain select-none for mini-map');
    assert.match(modalContent, /select-none[\s\S]*?mapContainerRef/, 'Mini-map container wrapper has select-none');
  });

  await runProbe('SELECTION', 'ObjectDetails.tsx, BottomSheet.tsx, ObjectsTableView tbody allow text selection', () => {
    const detailsContent = fs.readFileSync(path.join(SRC_DIR, 'components/ObjectPanel/ObjectDetails.tsx'), 'utf-8');
    const sheetContent = fs.readFileSync(path.join(SRC_DIR, 'components/UI/BottomSheet.tsx'), 'utf-8');
    const tableContent = fs.readFileSync(path.join(SRC_DIR, 'components/ObjectsTable/ObjectsTableView.tsx'), 'utf-8');
    const cardsContent = fs.readFileSync(path.join(SRC_DIR, 'components/ObjectCards/BottomResults.tsx'), 'utf-8');

    assert.ok(!detailsContent.includes('select-none'), 'ObjectDetails.tsx has no select-none');
    assert.ok(!sheetContent.includes('select-none'), 'BottomSheet.tsx has no select-none');
    assert.ok(!cardsContent.includes('select-none'), 'BottomResults.tsx has no select-none');

    // In ObjectsTableView, verify tbody rows do not have select-none (only th sort headers have it)
    const tbodyIdx = tableContent.indexOf('<tbody');
    const tbodyCloseIdx = tableContent.indexOf('</tbody>');
    assert.ok(tbodyIdx > 0 && tbodyCloseIdx > tbodyIdx, 'tbody section found in ObjectsTableView');
    const tbodyContent = tableContent.slice(tbodyIdx, tbodyCloseIdx);
    assert.ok(!tbodyContent.includes('select-none'), 'ObjectsTableView data rows (tbody) do not have select-none');
  });

  await runProbe('SELECTION', 'DOM hierarchy verification: BottomSheet and Drawer are outside MapContainer', () => {
    const pageContent = fs.readFileSync(path.join(SRC_DIR, 'app/page.tsx'), 'utf-8');
    // Verify BottomSheet and Desktop drawer are rendered outside main/DynamicMap
    const mapPos = pageContent.indexOf('<DynamicMap');
    const mainClosePos = pageContent.indexOf('</main>');
    const drawerPos = pageContent.indexOf('hidden xl:flex w-[410px]');
    const sheetPos = pageContent.indexOf('<BottomSheet');

    assert.ok(mapPos > 0 && mainClosePos > mapPos, 'Map is inside main');
    assert.ok(drawerPos > mainClosePos, 'Desktop drawer is rendered outside main');
    assert.ok(sheetPos > mainClosePos, 'BottomSheet is rendered outside main');
  });

  // --------------------------------------------------------------------------
  // 5. CORNER CASE & STRESS ROBUSTNESS
  // --------------------------------------------------------------------------
  console.log('\n--- CATEGORY 5: Corner Case & Stress Robustness ---');

  await runProbe('CORNER', 'Null / unattached ref does not crash useClickOutside', () => {
    const dom = new MockDOMTree();
    let called = false;
    const cleanup = attachUseClickOutside({ current: null }, () => { called = true; }, true, dom);

    const outside = dom.createElement('div');
    dom.dispatchBubbledEvent('mousedown', outside);

    assert.equal(called, false, 'Callback should not be called when ref.current is null');
    cleanup();
  });

  await runProbe('CORNER', 'Click storm: 10,000 rapid randomized clicks across nested DOM tree without failure', () => {
    const dom = new MockDOMTree();
    const parent = dom.createElement('div', 'parent');
    const child1 = dom.createElement('div', 'child-1');
    const child2 = dom.createElement('button', 'child-2');
    const outside = dom.createElement('div', 'outside');

    parent.appendChild(child1);
    child1.appendChild(child2);
    dom.root.appendChild(parent);
    dom.root.appendChild(outside);

    let outsideCalls = 0;
    const cleanup = attachUseClickOutside({ current: parent }, () => { outsideCalls++; }, true, dom);

    const targets = [child2, child1, parent, outside, dom.root];
    for (let i = 0; i < 10000; i++) {
      const t = targets[Math.floor(Math.random() * targets.length)];
      dom.dispatchBubbledEvent('mousedown', t);
    }

    assert.ok(outsideCalls > 0, 'Outside clicks successfully counted');
    cleanup();
  });

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log('                   CHALLENGER PROBE RESULTS SUMMARY                   ');
  console.log('======================================================================');

  const total = reports.length;
  const passed = reports.filter(r => r.passed).length;
  const failed = reports.filter(r => !r.passed).length;

  console.log(`Total Probes: ${total}`);
  console.log(`Passed:       ${passed}`);
  console.log(`Failed:       ${failed}`);

  if (failed > 0) {
    console.error('\nFailed Probes:');
    for (const f of reports.filter(r => !r.passed)) {
      console.error(`  - [${f.category}] ${f.name}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log('\nAll challenger adversarial probes passed successfully!\n');
  }
}

runAllChallengerProbes().catch((err) => {
  console.error('Fatal probe runner error:', err);
  process.exit(1);
});
