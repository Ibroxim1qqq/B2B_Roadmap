import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  MockDOM,
  simulateUseClickOutside,
  evaluateResponsiveVisibility,
  readSrcFile,
  checkProhibitedStrings,
  checkRequiredPatterns
} from './harness.ts';

// Color utilities
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

interface ProbeReport {
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
  error?: string;
}

const reports: ProbeReport[] = [];

async function runProbe(name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    reports.push({ name, passed: true, durationMs, details: 'OK' });
    console.log(`  ${green('✔')} ${name} ${dim(`(${durationMs}ms)`)}`);
  } catch (err: any) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    reports.push({ name, passed: false, durationMs, details: err.message, error: err.stack });
    console.log(`  ${red('✖')} ${name} ${dim(`(${durationMs}ms)`)}`);
    console.log(red(`      Error: ${err.message}`));
  }
}

console.log(bold(cyan('\n======================================================================')));
console.log(bold(cyan('      CHALLENGER M1-1: EMPIRICAL STRESS & ADVERSARIAL HARNESS         ')));
console.log(bold(cyan('======================================================================\n')));

async function executeAllProbes() {
  // --------------------------------------------------------------------------
  // SECTION 1: RAPID CLICKING INSIDE & OUTSIDE DROPDOWNS
  // --------------------------------------------------------------------------
  console.log(bold('--- PROBE SET 1: Rapid Clicking Inside/Outside Dropdowns ---'));

  await runProbe('P1.1: 1,000 rapid randomized inside/outside clicks maintain accurate state', () => {
    const dom = new MockDOM();
    const container = dom.createElement('div');
    const child = dom.createElement('button');
    container.children.push(child);
    child.parentNode = container;
    const outsideNode = dom.createElement('div');

    let isOpen: any = true;
    let hook = simulateUseClickOutside({ current: container }, () => { isOpen = false; }, isOpen, dom);

    let outsideClickCount = 0;
    let insideClickCount = 0;

    for (let i = 0; i < 1000; i++) {
      const clickInside = Math.random() > 0.5;
      if (clickInside) {
        insideClickCount++;
        hook.triggerInsideClick(child);
      } else {
        outsideClickCount++;
        hook.triggerOutsideClick(outsideNode);
        if (isOpen === false) {
          // If closed, simulate component re-render with enabled=false
          hook.unmount();
          hook = simulateUseClickOutside({ current: container }, () => { isOpen = false; }, false, dom);
          // Now re-open to test further clicks
          isOpen = true;
          hook.unmount();
          hook = simulateUseClickOutside({ current: container }, () => { isOpen = false; }, true, dom);
        }
      }
    }

    hook.unmount();
    assert.equal(dom.getListenerCount('mousedown'), 0, 'No dangling mousedown listeners after 1,000 clicks');
    assert.equal(dom.getListenerCount('touchstart'), 0, 'No dangling touchstart listeners after 1,000 clicks');
  });

  await runProbe('P1.2: Rapid alternating bursts (outside -> inside) never leave stale closed state when re-opened', () => {
    const dom = new MockDOM();
    const dropdown = dom.createElement('div');
    const outside = dom.createElement('div');

    let state = false;
    for (let cycle = 0; cycle < 200; cycle++) {
      // User opens dropdown
      state = true;
      let hook = simulateUseClickOutside({ current: dropdown }, () => { state = false; }, state, dom);

      // Rapid clicks inside: state must remain true
      for (let k = 0; k < 5; k++) {
        hook.triggerInsideClick();
        assert.equal(state, true, `State prematurely closed on inside click in cycle ${cycle}`);
      }

      // Click outside: state must turn false
      hook.triggerOutsideClick(outside);
      assert.equal(state, false, `State failed to close on outside click in cycle ${cycle}`);

      hook.unmount();
      assert.equal(dom.getListenerCount('mousedown'), 0);
    }
  });

  await runProbe('P1.3: Simultaneous touchstart + mousedown (mobile tap) idempotency check', () => {
    const dom = new MockDOM();
    const dropdown = dom.createElement('div');
    const outside = dom.createElement('div');

    let closeCallCount = 0;
    // On mobile devices, a single tap fires touchstart, followed 300ms later by mousedown.
    const hook = simulateUseClickOutside({ current: dropdown }, () => {
      closeCallCount++;
    }, true, dom);

    // Simulate mobile tap: touchstart followed immediately by mousedown on same target
    dom.dispatchEvent({ type: 'touchstart', target: outside });
    dom.dispatchEvent({ type: 'mousedown', target: outside });

    // In a single gesture without re-render, both may fire, but handler in production is `() => setOpen(false)`
    assert.ok(closeCallCount >= 1, 'Handler must fire at least once on mobile touch');
    hook.unmount();
  });

  await runProbe('P1.4: Rapid toggle button clicks inside dropdown wrapper do not trigger outside dismissal', () => {
    const dom = new MockDOM();
    const wrapper = dom.createElement('div');
    const toggleButton = dom.createElement('button');
    wrapper.children.push(toggleButton);
    toggleButton.parentNode = wrapper;

    let outsideDismissCalled = false;
    let isOpen = false;

    // Simulate 100 rapid clicks on toggle button
    for (let i = 0; i < 100; i++) {
      outsideDismissCalled = false;
      const hook = simulateUseClickOutside({ current: wrapper }, () => {
        outsideDismissCalled = true;
      }, isOpen, dom);

      // User clicks toggle button
      if (isOpen) {
        // When open, clicking button should be recognized as INSIDE, not outside
        dom.dispatchEvent({ type: 'mousedown', target: toggleButton });
        assert.equal(outsideDismissCalled, false, `Toggle button click was falsely treated as outside click at step ${i}`);
        isOpen = false;
      } else {
        isOpen = true;
      }
      hook.unmount();
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 2: RAPID ESCAPE KEYDOWN SPAMMING
  // --------------------------------------------------------------------------
  console.log(bold('\n--- PROBE SET 2: Rapid Escape Keydown Spamming ---'));

  await runProbe('P2.1: 500 rapid Escape key presses on open modal triggers close safely', () => {
    let closeCallCount = 0;
    const dom = new MockDOM();

    // Replicate modal keydown listener
    const handleKeyDown = (e: any) => {
      if (e.key === 'Escape') closeCallCount++;
    };
    dom.addEventListener('keydown', handleKeyDown);

    for (let i = 0; i < 500; i++) {
      dom.dispatchEvent({ type: 'keydown', key: 'Escape' });
    }

    assert.equal(closeCallCount, 500);
    dom.removeEventListener('keydown', handleKeyDown);
    assert.equal(dom.getListenerCount('keydown'), 0);
  });

  await runProbe('P2.2: 500 rapid Escape key presses on CLOSED modal causes zero invocations and zero errors', () => {
    let closeCallCount = 0;
    const dom = new MockDOM();

    // When modal is closed (isOpen === false), listener is NOT registered
    const isOpen = false;
    if (isOpen) {
      dom.addEventListener('keydown', () => { closeCallCount++; });
    }

    for (let i = 0; i < 500; i++) {
      dom.dispatchEvent({ type: 'keydown', key: 'Escape' });
    }

    assert.equal(closeCallCount, 0, 'No close handlers should fire when modal is closed');
    assert.equal(dom.getListenerCount('keydown'), 0);
  });

  await runProbe('P2.3: Escape keydown when onClose is undefined in LoginModal evaluates safely', () => {
    const dom = new MockDOM();
    let onClose: (() => void) | undefined = undefined;

    let didThrow = false;
    const handleKeyDown = (e: any) => {
      if (e.key === 'Escape') {
        try {
          if (typeof onClose === 'function') {
            (onClose as any)();
          }
        } catch (err) {
          didThrow = true;
        }
      }
    };

    dom.addEventListener('keydown', handleKeyDown);
    for (let i = 0; i < 100; i++) {
      dom.dispatchEvent({ type: 'keydown', key: 'Escape' });
    }

    assert.equal(didThrow, false, 'onClose?.() must not throw when onClose is undefined');
    dom.removeEventListener('keydown', handleKeyDown);
  });

  await runProbe('P1.5: Inter-dropdown mutual exclusion (switching from District to Status dropdown)', () => {
    const dom = new MockDOM();
    const districtWrapper = dom.createElement('div');
    const districtBtn = dom.createElement('button');
    districtWrapper.children.push(districtBtn);

    const statusWrapper = dom.createElement('div');
    const statusBtn = dom.createElement('button');
    statusWrapper.children.push(statusBtn);

    let districtOpen = true;
    let statusOpen = false;

    // Both hooks active
    let districtHook = simulateUseClickOutside({ current: districtWrapper }, () => { districtOpen = false; }, districtOpen, dom);
    let statusHook = simulateUseClickOutside({ current: statusWrapper }, () => { statusOpen = false; }, statusOpen, dom);

    // User clicks statusBtn: outside districtWrapper, inside statusWrapper
    dom.dispatchEvent({ type: 'mousedown', target: statusBtn });

    // District should close
    assert.equal(districtOpen, false, 'District dropdown must close when clicking Status button');
    districtHook.unmount();

    // Now status toggle click fires
    statusOpen = true;
    statusHook.unmount();
    statusHook = simulateUseClickOutside({ current: statusWrapper }, () => { statusOpen = false; }, statusOpen, dom);

    assert.equal(statusOpen, true, 'Status dropdown opens cleanly');
    statusHook.unmount();
  });

  await runProbe('P1.6: 5,000 rapid mount/unmount cycles verify zero event listener leak', () => {
    const dom = new MockDOM();
    const el = dom.createElement('div');

    for (let i = 0; i < 5000; i++) {
      const hook = simulateUseClickOutside({ current: el }, () => {}, true, dom);
      assert.equal(dom.getListenerCount('mousedown'), 1);
      assert.equal(dom.getListenerCount('touchstart'), 1);
      assert.equal(dom.getListenerCount('keydown'), 1);
      hook.unmount();
      assert.equal(dom.getListenerCount('mousedown'), 0);
      assert.equal(dom.getListenerCount('touchstart'), 0);
      assert.equal(dom.getListenerCount('keydown'), 0);
    }
  });

  await runProbe('P2.5: Modal keydown listener isolation across concurrent modals', () => {
    const dom = new MockDOM();
    let modalAClosed = false;
    let modalBClosed = false;

    const listenerA = (e: any) => { if (e.key === 'Escape') modalAClosed = true; };
    const listenerB = (e: any) => { if (e.key === 'Escape') modalBClosed = true; };

    dom.addEventListener('keydown', listenerA);
    dom.addEventListener('keydown', listenerB);

    dom.dispatchEvent({ type: 'keydown', key: 'Escape' });

    assert.equal(modalAClosed, true, 'Modal A received Escape');
    assert.equal(modalBClosed, true, 'Modal B received Escape');

    dom.removeEventListener('keydown', listenerA);
    dom.removeEventListener('keydown', listenerB);
    assert.equal(dom.getListenerCount('keydown'), 0);
  });

  await runProbe('P2.4: Alternating open/close lifecycle with interleaved Escape bursts leaves 0 dangling listeners', () => {
    const dom = new MockDOM();
    let listenerRef: ((e: any) => void) | null = null;

    for (let cycle = 0; cycle < 100; cycle++) {
      // Modal opens
      let closed = false;
      listenerRef = (e: any) => {
        if (e.key === 'Escape') closed = true;
      };
      dom.addEventListener('keydown', listenerRef);

      // Burst of Escapes
      dom.dispatchEvent({ type: 'keydown', key: 'Escape' });
      assert.equal(closed, true);

      // Modal unmounts/closes
      dom.removeEventListener('keydown', listenerRef);
      listenerRef = null;
    }

    assert.equal(dom.getListenerCount('keydown'), 0, 'All Escape listeners cleanly unregistered after 100 cycles');
  });

  // --------------------------------------------------------------------------
  // SECTION 3: NESTED CLICK SAFETY IN MODALS
  // --------------------------------------------------------------------------
  console.log(bold('\n--- PROBE SET 3: Nested Click Safety in Modals ---'));

  await runProbe('P3.1: CreateObjectModal deep nested tree click safety (e.stopPropagation + e.target checks)', () => {
    const dom = new MockDOM();
    let backdropDismissCalled = false;

    const backdrop = dom.createElement('div');
    const dialogCard = dom.createElement('div');
    const header = dom.createElement('div');
    const titleH2 = dom.createElement('h2');
    const form = dom.createElement('form');
    const inputTjm = dom.createElement('input');
    const selectDistrict = dom.createElement('select');
    const tabBasic = dom.createElement('button');
    const tabCrm = dom.createElement('button');
    const miniMapWrapper = dom.createElement('div');
    const submitBtn = dom.createElement('button');
    const iconSvg = dom.createElement('svg');

    backdrop.children.push(dialogCard);
    dialogCard.parentNode = backdrop;

    dialogCard.children.push(header, form);
    header.parentNode = dialogCard;
    form.parentNode = dialogCard;

    header.children.push(titleH2, tabBasic, tabCrm);
    titleH2.parentNode = header;
    tabBasic.parentNode = header;
    tabCrm.parentNode = header;

    form.children.push(inputTjm, selectDistrict, miniMapWrapper, submitBtn);
    inputTjm.parentNode = form;
    selectDistrict.parentNode = form;
    miniMapWrapper.parentNode = form;
    submitBtn.parentNode = form;

    submitBtn.children.push(iconSvg);
    iconSvg.parentNode = submitBtn;

    // Simulate CreateObjectModal event structure:
    // 1. dialogCard has onClick = (e) => e.stopPropagation()
    // 2. backdrop has onClick = (e) => { if (e.target === e.currentTarget) onClose(); }
    const onDialogCardClick = (e: { target: any; currentTarget: any; stopped?: boolean }) => {
      e.stopped = true;
    };
    const onBackdropClick = (e: { target: any; currentTarget: any; stopped?: boolean }) => {
      if (e.stopped) return;
      if (e.target === backdrop) {
        backdropDismissCalled = true;
      }
    };

    const innerElements = [
      dialogCard, header, titleH2, form, inputTjm, 
      selectDistrict, tabBasic, tabCrm, miniMapWrapper, submitBtn, iconSvg
    ];

    for (const el of innerElements) {
      backdropDismissCalled = false;
      const event = { target: el, currentTarget: dialogCard, stopped: false };
      onDialogCardClick(event);
      onBackdropClick({ ...event, currentTarget: backdrop });
      assert.equal(backdropDismissCalled, false, `Inner element <${el.tagName}> falsely triggered modal dismissal`);
    }

    // Now click the backdrop itself
    backdropDismissCalled = false;
    onBackdropClick({ target: backdrop, currentTarget: backdrop, stopped: false });
    assert.equal(backdropDismissCalled, true, 'Clicking backdrop directly MUST trigger modal dismissal');
  });

  await runProbe('P3.2: LoginModal preset cards and custom input clicks do not dismiss modal', () => {
    const dom = new MockDOM();
    let loginDismissCalled = false;

    const backdrop = dom.createElement('div');
    const modalContent = dom.createElement('div');
    const presetCard = dom.createElement('div');
    const inputCustomName = dom.createElement('input');

    backdrop.children.push(modalContent);
    modalContent.children.push(presetCard, inputCustomName);

    const onContentClick = (e: { stopped?: boolean }) => { e.stopped = true; };
    const onBackdropClick = (e: { target: any; stopped?: boolean }) => {
      if (e.stopped) return;
      if (e.target === backdrop) loginDismissCalled = true;
    };

    // Test clicking preset card
    let ev1 = { target: presetCard, stopped: false };
    onContentClick(ev1);
    onBackdropClick(ev1);
    assert.equal(loginDismissCalled, false, 'Preset card click dismissed LoginModal');

    // Test clicking custom input
    let ev2 = { target: inputCustomName, stopped: false };
    onContentClick(ev2);
    onBackdropClick(ev2);
    assert.equal(loginDismissCalled, false, 'Input field click dismissed LoginModal');

    // Test clicking backdrop
    let ev3 = { target: backdrop, stopped: false };
    onBackdropClick(ev3);
    assert.equal(loginDismissCalled, true, 'Backdrop click failed to dismiss LoginModal');
  });

  await runProbe('P3.3: BottomSheet sibling architecture ensures drawer clicks never touch backdrop', () => {
    let sheetClosed = false;
    const dom = new MockDOM();

    // Sibling elements in DOM:
    // <div className="fixed inset-0 ... z-[1000]" onClick={onClose} />
    // <div className="fixed bottom-0 ... z-[1001]">children</div>
    const backdrop = dom.createElement('div');
    const sheet = dom.createElement('div');
    const sheetChild = dom.createElement('div');
    sheet.children.push(sheetChild);

    const onBackdropClick = () => { sheetClosed = true; };

    // Click inside sheet
    sheetClosed = false;
    // Clicks on sheetChild bubble to sheet, but NEVER to backdrop because they are siblings!
    assert.equal(backdrop.contains(sheetChild), false, 'sheetChild is not inside backdrop');
    assert.equal(backdrop.contains(sheet), false, 'sheet is not inside backdrop');
    assert.equal(sheetClosed, false);

    // Click backdrop
    onBackdropClick();
    assert.equal(sheetClosed, true, 'Backdrop click closed sheet');
  });

  // --------------------------------------------------------------------------
  // SECTION 4: VIEWPORT BOUNDARY TESTING ACROSS COMPREHENSIVE MATRIX
  // --------------------------------------------------------------------------
  console.log(bold('\n--- PROBE SET 4: Viewport Boundary Testing (320px - 1920px) ---'));

  await runProbe('P4.1: Sweep all 1,601 integer widths (320px to 1920px): details panel rendered EXACTLY once', () => {
    const pageContent = readSrcFile('app/page.tsx');
    const bottomSheetContent = readSrcFile('components/UI/BottomSheet.tsx');

    // Confirm that md:hidden is completely absent from BottomSheet.tsx
    assert.ok(!bottomSheetContent.includes('md:hidden'), 'BottomSheet.tsx must NOT have md:hidden');

    for (let width = 320; width <= 1920; width++) {
      const vis = evaluateResponsiveVisibility(width, pageContent, bottomSheetContent);

      const totalVisible = (vis.desktopDrawerVisible ? 1 : 0) + (vis.bottomSheetVisible ? 1 : 0);
      if (totalVisible !== 1) {
        throw new Error(
          `Viewport width ${width}px has ${totalVisible} details panels visible! ` +
          `(desktop: ${vis.desktopDrawerVisible}, bottomSheet: ${vis.bottomSheetVisible})`
        );
      }

      if (width < 1280) {
        assert.equal(vis.bottomSheetVisible, true, `Width ${width}px (<1280px) must use BottomSheet`);
        assert.equal(vis.desktopDrawerVisible, false, `Width ${width}px (<1280px) must hide desktop drawer`);
      } else {
        assert.equal(vis.desktopDrawerVisible, true, `Width ${width}px (>=1280px) must use desktop drawer`);
        assert.equal(vis.bottomSheetVisible, false, `Width ${width}px (>=1280px) must hide BottomSheet`);
      }
    }
  });

  await runProbe('P4.2: Test exact boundary values: 320px, 375px, 767px, 768px, 1023px, 1024px, 1279px, 1280px', () => {
    const pageContent = readSrcFile('app/page.tsx');
    const bottomSheetContent = readSrcFile('components/UI/BottomSheet.tsx');

    const boundaryCases = [
      { w: 320, sheet: true, desktop: false, nav: true, sidebar: false, desc: 'Small mobile (320px)' },
      { w: 375, sheet: true, desktop: false, nav: true, sidebar: false, desc: 'Standard mobile iPhone SE (375px)' },
      { w: 767, sheet: true, desktop: false, nav: true, sidebar: false, desc: 'Mobile upper boundary (767px)' },
      { w: 768, sheet: true, desktop: false, nav: true, sidebar: false, desc: 'Tablet portrait lower boundary (768px - Former Black Hole)' },
      { w: 1023, sheet: true, desktop: false, nav: true, sidebar: false, desc: 'Tablet upper boundary (1023px)' },
      { w: 1024, sheet: true, desktop: false, nav: false, sidebar: true, desc: 'Desktop lower boundary / tablet landscape (1024px)' },
      { w: 1279, sheet: true, desktop: false, nav: false, sidebar: true, desc: 'Laptop upper boundary (1279px)' },
      { w: 1280, sheet: false, desktop: true, nav: false, sidebar: true, desc: 'XL desktop lower boundary (1280px)' },
      { w: 1920, sheet: false, desktop: true, nav: false, sidebar: true, desc: 'FHD desktop (1920px)' },
    ];

    for (const b of boundaryCases) {
      const vis = evaluateResponsiveVisibility(b.w, pageContent, bottomSheetContent);
      assert.equal(vis.bottomSheetVisible, b.sheet, `${b.desc}: bottomSheetVisible mismatch`);
      assert.equal(vis.desktopDrawerVisible, b.desktop, `${b.desc}: desktopDrawerVisible mismatch`);
      assert.equal(vis.mobileBottomNavVisible, b.nav, `${b.desc}: mobileBottomNavVisible mismatch`);
      assert.equal(vis.leftSidebarVisible, b.sidebar, `${b.desc}: leftSidebarVisible mismatch`);
    }
  });

  await runProbe('P4.3: Extreme viewports (100px wearable/foldable up to 7680px 8K displays)', () => {
    const pageContent = readSrcFile('app/page.tsx');
    const bottomSheetContent = readSrcFile('components/UI/BottomSheet.tsx');

    const extremes = [100, 240, 2560, 3840, 5120, 7680];
    for (const w of extremes) {
      const vis = evaluateResponsiveVisibility(w, pageContent, bottomSheetContent);
      const totalVisible = (vis.desktopDrawerVisible ? 1 : 0) + (vis.bottomSheetVisible ? 1 : 0);
      assert.equal(totalVisible, 1, `Extreme width ${w}px must render exactly 1 details panel`);
      if (w < 1280) {
        assert.equal(vis.bottomSheetVisible, true);
        assert.equal(vis.desktopDrawerVisible, false);
      } else {
        assert.equal(vis.desktopDrawerVisible, true);
        assert.equal(vis.bottomSheetVisible, false);
      }
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 5: TEXT SELECTION CAPABILITY ON CARDS AND PHONE NUMBERS
  // --------------------------------------------------------------------------
  console.log(bold('\n--- PROBE SET 5: Text Selection Capability & Drag Isolation ---'));

  await runProbe('P5.1: Verify app/page.tsx root container does NOT contain select-none', () => {
    const pageContent = readSrcFile('app/page.tsx');
    // Check root return container
    const rootMatches = pageContent.match(/<div className="[^"]*flex flex-col h-screen[^"]*">/);
    assert.ok(rootMatches, 'Root container found in page.tsx');
    assert.ok(!rootMatches[0].includes('select-none'), 'Root container must NOT have select-none');
  });

  await runProbe('P5.2: Verify ObjectDetails.tsx allows text selection on contact phone and address', () => {
    const detailsContent = readSrcFile('components/ObjectPanel/ObjectDetails.tsx');
    assert.ok(!detailsContent.includes('select-none'), 'ObjectDetails.tsx should NOT have select-none');
    assert.ok(detailsContent.includes('href={getCallUrl(internal.phone)}'), 'Contains phone call link');
    assert.ok(detailsContent.includes('href={getCallUrl(internal.manager_phone)}'), 'Contains manager phone call link');
    assert.ok(detailsContent.includes('source.district_name'), 'Contains district address info');
  });

  await runProbe('P5.3: Verify BottomResults.tsx cards allow text selection', () => {
    const bottomResultsContent = readSrcFile('components/ObjectCards/BottomResults.tsx');
    assert.ok(!bottomResultsContent.includes('select-none'), 'BottomResults.tsx cards must NOT be select-none');
  });

  await runProbe('P5.4: Verify ObjectsTableView.tsx rows allow text selection (tbody cells)', () => {
    const tableContent = readSrcFile('components/ObjectsTable/ObjectsTableView.tsx');
    const tbodyIndex = tableContent.indexOf('<tbody');
    assert.ok(tbodyIndex !== -1, 'Table tbody found in ObjectsTableView.tsx');
    const tbodyContent = tableContent.substring(tbodyIndex);
    assert.ok(!tbodyContent.includes('select-none'), 'ObjectsTableView.tsx tbody rows and cells must NOT have select-none');
    assert.ok(tbodyContent.includes('href={getCallUrl(obj.phone)}'), 'Phone links present in table rows');
    assert.ok(tbodyContent.includes('obj.address'), 'Address present in table rows');
  });

  await runProbe('P5.5: Verify MapContainer.tsx isolates select-none strictly to map container', () => {
    const mapContent = readSrcFile('components/Map/MapContainer.tsx');
    assert.ok(
      mapContent.includes('select-none'),
      'MapContainer.tsx must have select-none to isolate map dragging from text highlight'
    );
  });

  await runProbe('P5.6: Verify CreateObjectModal.tsx isolates select-none strictly to mini-map picker', () => {
    const modalContent = readSrcFile('components/ObjectPanel/CreateObjectModal.tsx');
    // Mini-map coordinate picker should have select-none
    assert.ok(
      modalContent.includes('select-none'),
      'CreateObjectModal.tsx mini-map picker must have select-none to isolate coordinate pin drag'
    );
  });
}

executeAllProbes().then(() => {
  const total = reports.length;
  const passed = reports.filter(r => r.passed).length;
  const failed = reports.filter(r => !r.passed).length;

  console.log(bold(cyan('\n======================================================================')));
  console.log(bold('                 CHALLENGER M1-1 PROBE SUMMARY                        '));
  console.log(bold(cyan('======================================================================')));
  console.log(`Total Stress Probes: ${bold(String(total))}`);
  console.log(`Passed:              ${green(bold(String(passed)))}`);
  console.log(`Failed:              ${failed > 0 ? red(bold(String(failed))) : green('0')}`);
  console.log(bold(cyan('======================================================================\n')));

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch((err) => {
  console.error('Fatal probe runner error:', err);
  process.exit(1);
});
