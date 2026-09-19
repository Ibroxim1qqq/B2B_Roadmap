# Project: B2B Samarqand Construction Map UI/UX & Interaction Polish

## Architecture
- **Framework**: Next.js 16 (App Router, Turbopack, React 19, TypeScript, Tailwind CSS)
- **Mapping**: Leaflet + React-Leaflet (`MapContainer.tsx`)
- **State Management**: React state hooks (`useState`, `useEffect`, `useMemo`) at page and component levels
- **Data Source**: `src/lib/real-sheets-data.json` with 388 construction objects; localStorage for auth and visits
- **Layout Structure**:
  - `app/layout.tsx`: Root HTML and metadata
  - `app/page.tsx`: Central coordinator managing active tab, selected object, filters, search, and responsive drawers
  - `components/Header/Navbar.tsx`: Search bar, object creation trigger, sync trigger, user profile dropdown
  - `components/Sidebar/LeftSidebar.tsx`: Desktop navigation bar (Map, Objects, Visits, Analytics, Settings)
  - `components/Navigation/MobileBottomNav.tsx`: Mobile/tablet bottom navigation bar for tab switching
  - `components/Filters/FilterToolbar.tsx`: District & Status filters, scope tags, reset
  - `components/ObjectCards/BottomResults.tsx`: Horizontal scroll list of filtered objects
  - `components/ObjectsTable/ObjectsTableView.tsx`: Full table view of objects
  - `components/ObjectPanel/ObjectDetails.tsx`: Rich drawer/sheet details view for selected object
  - `components/UI/BottomSheet.tsx`: Mobile & tablet bottom sheet drawer
  - `components/Visits/VisitsView.tsx`: Field visits log and KPI cards
  - `components/Dashboard/DashboardView.tsx`: Analytics and overview dashboard
  - `components/CustomFields/CustomFieldManager.tsx`: Extra fields settings table

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Dropdown Click-Outside | User dropdown, district filter, status filter, and table filters close on outside click via `useClickOutside` | M1 | Survey (Explorer 1) |
| F2 | Modal Backdrop & ESC Dismissal | `CreateObjectModal`, `LoginModal`, and `BottomSheet` close on backdrop click and Escape key | M1 | Survey (Explorer 1) |
| F3 | Responsive Details Panel ("Tablet Fix") | Fix tablet black hole (768px-1279px) so object details open reliably across mobile sheet, tablet, and desktop side drawer | M1 | Survey (Explorer 1, 3) |
| F4 | Global Text Selection Enabled | Remove global `select-none` from `page.tsx` while isolating non-select to map canvases so phone/address can be selected | M1 | Survey (Explorer 1, 2, 3) |
| F5 | Fake Chevron Removal | Remove misleading `<ChevronDown>` icons from static tags in `FilterToolbar.tsx` | M2 | Survey (Explorer 2) |
| F6 | Fallback Image Clutter Replacement | Replace repetitive Unsplash building photo fallback with clean architectural icon placeholder in `BottomResults` and `MapContainer` | M2 | Survey (Explorer 2) |
| F7 | Redundant Icons & Badges Cleanup | Remove dead checkmarks row from `BottomResults.tsx` and static badges | M2 | Survey (Explorer 2) |
| F8 | Developer Column & Schema Cleanup | Remove raw column codes (A-V, W-AH, Ustun letters) and DB internals from `CustomFieldManager` and `ObjectDetails` | M2 | Survey (Explorer 2) |
| F9 | Google Sheets Mentions Elimination | Replace all 8 user-facing Google Sheets strings with professional CRM / system database terms | M2 | Survey (Explorer 2) |
| F10 | Dynamic Active User in Visits KPI | Pass `currentUser` to `VisitsView` and bind KPI card dynamically instead of hardcoded string | M2 | Survey (Explorer 2) |
| F11 | Mobile Bottom Tab Navigation | Add responsive mobile bottom tab bar (`MobileBottomNav.tsx`) for switching between Map, Objects, Visits, Dashboard | M3 | Survey (Explorer 3) |
| F12 | Dead Component Deletion | Safely remove 5 unused orphan component files (`StatsCards.tsx`, `MyLocation.tsx`, `ActionButtons.tsx`, `ObjectList.tsx`, `DynamicMap.tsx`) | M3 | Survey (Explorer 2, 3) |
| F13 | Production Build & Full Verification | Ensure Next.js production build (`npm run build`) passes with 0 errors, with complete E2E interaction validation | M4 | Survey (All) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Interaction Behaviors & Responsive Modals | F1, F2, F3, F4 (`useClickOutside`, modal backdrop/ESC, tablet drawer fix, global text selection) | none | DONE |
| 2 | M2: Visual Polish, Clutter Removal & Terminology | F5, F6, F7, F8, F9, F10 (fake chevrons, stock photos, dead badges, A-V/W-AH codes, Sheets mentions, dynamic user) | none | IN_PROGRESS |
| 3 | M3: Mobile Navigation & Dead Code Cleanup | F11, F12 (mobile bottom navigation bar, delete 5 orphan components, scroll padding) | M1 | PLANNED |
| 4 | M4: Final Integration, E2E Testing & Build Verification | F13 (E2E testing of all features, process cleanup, npm run build with 0 errors) | M1, M2, M3 | PLANNED |

## Interface Contracts
### `src/hooks/useClickOutside.ts`
```typescript
import { RefObject } from 'react';
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  enabled: boolean = true
): void;
```

### `src/components/Navigation/MobileBottomNav.tsx`
```typescript
interface MobileBottomNavProps {
  activeTab: 'map' | 'objects' | 'visits' | 'dashboard' | 'custom-fields';
  onTabChange: (tab: 'map' | 'objects' | 'visits' | 'dashboard' | 'custom-fields') => void;
}
```

### `src/components/Visits/VisitsView.tsx`
```typescript
import { UserProfile } from '../Auth/LoginModal';
export interface VisitsViewProps {
  objects: ConstructionObject[];
  currentUser?: UserProfile | null;
  onSelectObject: (id: string) => void;
}
```

## Code Layout
- `src/hooks/useClickOutside.ts` (New hook for outside click detection)
- `src/components/Navigation/MobileBottomNav.tsx` (New mobile bottom bar)
- `src/components/Header/Navbar.tsx` (Dropdown outside click, terminology)
- `src/components/Filters/FilterToolbar.tsx` (Dropdowns outside click, remove fake chevrons)
- `src/components/ObjectsTable/ObjectsTableView.tsx` (Dropdowns outside click)
- `src/components/ObjectPanel/CreateObjectModal.tsx` (Backdrop click, ESC key, z-index)
- `src/components/Auth/LoginModal.tsx` (Backdrop click, ESC key, terminology)
- `src/components/UI/BottomSheet.tsx` (ESC key, remove md:hidden, z-index)
- `src/components/ObjectCards/BottomResults.tsx` (Stock photo placeholder, remove dead badges, terminology)
- `src/components/Map/MapContainer.tsx` (Stock photo placeholder in popup, map select-none)
- `src/components/CustomFields/CustomFieldManager.tsx` (Remove A-V, W-AH, column letters, DB jargon)
- `src/components/ObjectPanel/ObjectDetails.tsx` (Terminology, custom fields labels)
- `src/components/ObjectPanel/ObjectEdit.tsx` (Terminology, Sheets mentions)
- `src/components/Dashboard/DashboardView.tsx` (Terminology, Sheets mentions)
- `src/components/Sidebar/LeftSidebar.tsx` (Terminology)
- `src/components/Visits/VisitsView.tsx` (Dynamic user in KPI)
- `src/app/page.tsx` (Root select-none removal, tablet details panel visibility, currentUser to VisitsView, MobileBottomNav inclusion)
- `src/app/layout.tsx` (Metadata terminology)
- Unused files to delete:
  - `src/components/Dashboard/StatsCards.tsx`
  - `src/components/Location/MyLocation.tsx`
  - `src/components/UI/ActionButtons.tsx`
  - `src/components/ObjectPanel/ObjectList.tsx`
  - `src/components/Map/DynamicMap.tsx`
