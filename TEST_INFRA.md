# Test Infrastructure & Verification Architecture: B2B Samarqand

## 1. Test Philosophy & Core Principles

The test suite for the B2B Samarqand Construction Map web application is established under four foundational principles:

1. **Opaque-Box & Requirement-Driven**: Tests are designed directly from the user requirements in `ORIGINAL_REQUEST.md` and the feature contracts in `PROJECT.md`. Tests verify observable external behaviors, DOM structure, component interfaces, responsive styling classes, event handlers, and data integrity.
2. **Zero Tolerance for Facade Tests**: Every test executes genuine assertions against actual application code, runtime hooks, DOM trees, and data structures. Hardcoded passes, empty assertions, and mock-only facades that do not exercise real logic are strictly forbidden.
3. **Progressive Testability & Milestone Awareness**: Tests are organized by both verification tier (Tiers 1–4) and milestone implementation phase (M1: F1–F4, M2: F5–F10, M3: F11–F12, M4: Full Integration). Tests provide clear diagnostics indicating whether a feature has passed or is pending implementation.
4. **Deterministic & Isolated**: Every test case initializes its own state, executes without side effects on subsequent tests, and runs cleanly across local environments using standard Node.js and TypeScript tooling without requiring external network dependencies.

---

## 2. Feature Inventory Coverage Mapping

| Feature ID | Name | Milestone | Tier 1 (Core) | Tier 2 (Boundary) | Tier 3 (Cross) | Tier 4 (Scenario) |
|---|---|---|---|---|---|---|
| **F1** | Dropdown Click-Outside (`useClickOutside`) | M1 | 5 tests | 5 tests | 2 tests | S1, S2 |
| **F2** | Modal Backdrop & ESC Dismissal | M1 | 5 tests | 5 tests | 2 tests | S1, S2 |
| **F3** | Responsive Details Panel ("Tablet Fix") | M1 | 5 tests | 5 tests | 2 tests | S1, S2 |
| **F4** | Global Text Selection Enabled | M1 | 5 tests | 3 tests | 2 tests | S1 |
| **F5** | Fake Chevron Removal | M2 | 5 tests | 2 tests | 1 test | S3 |
| **F6** | Fallback Stock Image Clutter Replacement | M2 | 5 tests | 3 tests | 1 test | S3 |
| **F7** | Redundant Icons & Badges Cleanup | M2 | 5 tests | 2 tests | 1 test | S3 |
| **F8** | Developer Column & Schema Cleanup | M2 | 5 tests | 3 tests | 1 test | S3 |
| **F9** | Google Sheets Mentions Elimination | M2 | 8 tests | 2 tests | 1 test | S3 |
| **F10** | Dynamic Active User in Visits KPI | M2 | 5 tests | 3 tests | 2 tests | S1 |
| **F11** | Mobile Bottom Tab Navigation | M3 | 6 tests | 4 tests | 2 tests | S2 |
| **F12** | Dead Component Deletion | M3 | 6 tests | 2 tests | 1 test | S3 |

---

## 3. Test Suite Architecture

```
d:/b2b Samarqand/
├── TEST_INFRA.md                          # Test infrastructure specification (this document)
├── TEST_READY.md                          # Test readiness declaration and execution summary
└── web/
    └── tests/
        └── e2e/
            ├── harness.ts                 # Shared assertions, DOM mock, AST helpers, viewport simulator
            ├── tier1-features.test.ts     # Tier 1: Feature Coverage (F1 to F12, ≥60 tests)
            ├── tier2-boundaries.test.ts   # Tier 2: Boundary & Corner Cases (≥30 tests)
            ├── tier3-combinations.test.ts # Tier 3: Cross-Feature Combinations (≥10 tests)
            ├── tier4-scenarios.test.ts    # Tier 4: Real-World Scenarios (≥3 full workflows)
            └── runner.ts                  # Master CLI test runner with filtering and diagnostic reporting
```

### 3.1 Test Harness (`harness.ts`)
Provides unified verification primitives:
- **`createDOMEnvironment()`**: Lightweight, zero-dependency DOM event simulator implementing `document.addEventListener`, `removeEventListener`, `dispatchEvent`, `MouseEvent`, `TouchEvent`, `KeyboardEvent`, and `Node.contains` to test event-driven hooks like `useClickOutside` in Node.js.
- **`analyzeComponentSource(filePath)`**: High-fidelity parser inspecting JSX tag hierarchies, attribute presence (`select-none`, `md:hidden`, `z-[2000]`), prop interfaces, and prohibited pattern occurrences (e.g. Unsplash photo IDs, Google Sheets strings, column codes `W-AH`).
- **`simulateViewport(width)`**: Viewport classifier modeling Tailwind CSS breakpoints (`sm`: 640px, `md`: 768px, `lg`: 1024px, `xl`: 1280px) to verify responsive drawer and bottom sheet rendering conditions.

---

## 4. Multi-Tier Test Specification

### Tier 1: Core Feature Coverage
- **F1: Dropdown Outside Click**:
  - `useClickOutside` hook triggers handler on `mousedown` outside the ref container.
  - `useClickOutside` hook ignores clicks inside the ref container.
  - `useClickOutside` respects `enabled=false` parameter without invoking handler.
  - `useClickOutside` unregisters event listeners on unmount.
  - `useClickOutside` triggers handler on `Escape` key press.
  - `Navbar.tsx` binds `useClickOutside` to user profile dropdown.
  - `FilterToolbar.tsx` binds `useClickOutside` to district and status dropdowns.
  - `ObjectsTableView.tsx` binds `useClickOutside` to table filter dropdowns.
- **F2: Modal Backdrop & ESC Dismissal**:
  - `CreateObjectModal.tsx` contains backdrop click handler dismissing dialog.
  - `CreateObjectModal.tsx` registers `Escape` keydown handler.
  - `LoginModal.tsx` accepts optional `onClose` callback and registers backdrop/ESC dismissal.
  - `BottomSheet.tsx` registers `Escape` key handler calling `onClose`.
  - Backdrop dismissal targets `e.target === e.currentTarget` to prevent modal content clicks from closing.
  - Modal overlay z-index is elevated above Leaflet controls (`z-[2000]` or $\ge 1000$).
- **F3: Responsive Details Panel ("Tablet Fix")**:
  - `BottomSheet.tsx` has `md:hidden` removed from backdrop and drawer container.
  - `BottomSheet.tsx` z-index is elevated to `z-[1000]`/`z-[1001]` above map controls (`z-[400]`).
  - `page.tsx` renders details panel across all viewports without tablet invisibility gap ($768\text{px} \le W < 1280\text{px}$).
  - Desktop drawer renders cleanly on wide screens ($\ge 1280\text{px}$).
  - Mobile bottom sheet renders cleanly on small screens ($< 768\text{px}$).
- **F4: Global Text Selection Enabled**:
  - Root container `app/page.tsx` line 299 does NOT contain `select-none`.
  - Phone numbers, addresses, and manager contacts are selectable.
  - `MapContainer.tsx` isolates `select-none` to map canvas and navigation controls.
  - `ObjectsTableView.tsx` data cells permit text selection.
  - Form inputs and text fields permit standard clipboard operations.
- **F5: Fake Chevron Removal**:
  - `FilterToolbar.tsx` static Region badge (`Samarqand viloyati`) does not contain `<ChevronDown>`.
  - `FilterToolbar.tsx` static Category badge (`Ko'p xonadonli uy-joylar`) does not contain `<ChevronDown>`.
  - Interactive dropdown buttons in `FilterToolbar.tsx` preserve dropdown indicators.
  - Static badges maintain non-interactive pill styling.
  - `BottomResults.tsx` contains no unused `ChevronDown` import.
- **F6: Fallback Image Clutter Replacement**:
  - `BottomResults.tsx` does not reference Unsplash building URL `photo-1545324418-cc1a3fa10c00`.
  - `MapContainer.tsx` popup template does not reference Unsplash stock photo URL.
  - Objects lacking `image_url` render clean architectural SVG/icon placeholder.
  - Objects with valid `image_url` render genuine `<img>` tag.
  - Architectural placeholder maintains consistent aspect ratio and accessibility attributes.
- **F7: Redundant Icons & Badges Cleanup**:
  - `BottomResults.tsx` does not render redundant dead `CheckCircle2` row.
  - No dead grey badges for absent phone, TJM, or manager.
  - `CustomFieldManager.tsx` cleans up redundant static "Faol" badges.
  - Object cards present streamlined information hierarchy.
- **F8: Developer Column & Schema Cleanup**:
  - `CustomFieldManager.tsx` contains 0 mentions of `W-AH` columns.
  - `CustomFieldManager.tsx` contains 0 mentions of `A-V` columns.
  - `CustomFieldManager.tsx` removes raw "Ustun" column letter header.
  - `CustomFieldManager.tsx` replaces developer keys (`tjm_name`) with Uzbek business labels.
  - `ObjectDetails.tsx` replaces "Custom fields" with "Qo'shimcha maydonlar".
- **F9: Google Sheets Mentions Elimination**:
  - `Navbar.tsx` title and sync button replace Google Sheets with CRM / Tizim terminology.
  - `BottomResults.tsx` removes "Google Sheets" label.
  - `DashboardView.tsx` subtitle eliminates "Google Sheets" reference.
  - `LoginModal.tsx` footer replaces "Google Sheets" reference.
  - `ObjectEdit.tsx` alert and footer text eliminate "Google Sheets" references.
  - `ObjectDetails.tsx` custom fields description eliminates "Google Sheets".
  - `layout.tsx` metadata description eliminates "Google Sheets".
  - External Google Maps deep-links remain intact and functional.
- **F10: Dynamic Active User in Visits KPI**:
  - `VisitsViewProps` defines `currentUser?: UserProfile | null`.
  - `VisitsView.tsx` does not hardcode `"Ibroxim T."`.
  - `VisitsView.tsx` renders `currentUser.name` dynamically when provided.
  - `VisitsView.tsx` renders graceful fallback when `currentUser` is null.
  - `page.tsx` passes `currentUser={currentUser}` to `VisitsView`.
- **F11: Mobile Bottom Tab Navigation**:
  - `MobileBottomNav.tsx` exists and exports component conforming to `MobileBottomNavProps`.
  - Navigation renders Map, Objects, Visits, and Dashboard tabs.
  - Tab clicks invoke `onTabChange` with the target tab.
  - Active tab receives distinct accent styling.
  - Bottom navigation bar is hidden on large desktop screens (`lg:hidden`).
  - `page.tsx` includes `pb-16 lg:pb-0` to avoid viewport clipping.
- **F12: Dead Component Deletion**:
  - `src/components/Dashboard/StatsCards.tsx` deleted or has 0 imports.
  - `src/components/Location/MyLocation.tsx` deleted or has 0 imports.
  - `src/components/UI/ActionButtons.tsx` deleted or has 0 imports.
  - `src/components/ObjectPanel/ObjectList.tsx` deleted or has 0 imports.
  - `src/components/Map/DynamicMap.tsx` deleted or has 0 imports.
  - TypeScript build passes with zero broken import references.

---

### Tier 2: Boundary & Corner Cases
1. **Empty Search Query**: Submitting or clearing search input handles whitespace, empty strings, and special characters without runtime errors.
2. **Rapid Modal Dismissal**: Multiple rapid `Escape` key events or concurrent backdrop clicks do not cause unhandled state re-renders.
3. **Concurrent Dropdown Toggles**: Opening district dropdown while status dropdown is open immediately closes the status dropdown.
4. **Responsive Viewport Boundaries**:
   - `375px`: MobileBottomNav active, BottomSheet active, LeftSidebar hidden.
   - `768px`: Tablet boundary: details panel visible, no black hole.
   - `1024px`: Desktop boundary: LeftSidebar active, MobileBottomNav hidden.
   - `1280px`: Large desktop: side drawer active, BottomSheet hidden.
5. **Extreme Data Fields**:
   - Construction object with `null` fields (no phone, no manager, no coordinates) renders safely without crashing.
   - Extra-long object name (>150 characters) properly clamped/truncated without breaking flex container.
   - Unauthenticated state (`currentUser === null`) displays login modal or fallback without exceptions.

---

### Tier 3: Cross-Feature Interactions
1. **Dropdown + Modal Collision**: Opening `CreateObjectModal` or `LoginModal` dismisses any active dropdown.
2. **Filter Application + BottomSheet**: Updating district/status filters while an object is selected maintains or gracefully closes details panel.
3. **Tablet Navigation + Object Selection**: On tablet (768px), switching tabs clears or preserves object selection predictably without layout breakage.
4. **User Switch + Visits KPI**: Switching user in `LoginModal` dynamically updates the Visits KPI card active user name in real time.
5. **Map Drag + BottomSheet Selection**: Dragging the map does not trigger text selection; selecting text in BottomSheet does not drag the map.

---

### Tier 4: Real-World Scenarios
1. **Commercial Sales Agent Workflow**:
   - Agent logs in -> filters objects by Samarqand district -> selects object card -> opens details drawer -> copies manager phone number -> switches to Visits tab -> confirms agent name in KPI.
2. **Mobile Field Inspector Workflow**:
   - Inspector opens app on 390px viewport -> uses MobileBottomNav to navigate to Objects view -> selects building -> views details in BottomSheet -> dismisses via backdrop click.
3. **Database & UI Polish Audit Workflow**:
   - Comprehensive audit verifying zero developer column letters (`A-V`, `W-AH`), zero Google Sheets strings, zero fake chevrons, and clean architectural placeholders.

---

## 5. Execution & Verification Guide

### 5.1 Running the Test Suite
Execute the test runner directly from the `d:/b2b Samarqand/web` directory:

```bash
# Run complete test suite across all 4 tiers
node --experimental-strip-types tests/e2e/runner.ts

# Run tests for a specific Tier (1, 2, 3, or 4)
node --experimental-strip-types tests/e2e/runner.ts --tier=1
node --experimental-strip-types tests/e2e/runner.ts --tier=2
node --experimental-strip-types tests/e2e/runner.ts --tier=3
node --experimental-strip-types tests/e2e/runner.ts --tier=4

# Run tests for a specific Milestone (1, 2, 3, or 4)
node --experimental-strip-types tests/e2e/runner.ts --milestone=1
node --experimental-strip-types tests/e2e/runner.ts --milestone=2
node --experimental-strip-types tests/e2e/runner.ts --milestone=3
node --experimental-strip-types tests/e2e/runner.ts --milestone=4
```

Or run via Node's native test runner:
```bash
node --experimental-strip-types --test tests/e2e/*.test.ts
```

### 5.2 Exit Codes & Diagnostics
- **`0`**: All executed tests passed.
- **`1`**: One or more assertions failed (detailed diagnostic printed with expected vs actual, file path, and line number).
