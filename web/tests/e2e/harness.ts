import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Types & Interfaces ---

export interface TestMetadata {
  tier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  milestone: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  feature: string; // e.g. 'F1', 'F2', etc.
  description: string;
}

export interface TestCase {
  id: string;
  name: string;
  metadata: TestMetadata;
  fn: () => void | Promise<void>;
}

export interface TestResult {
  test: TestCase;
  passed: boolean;
  error?: Error;
  durationMs: number;
}

import { test as nodeTest } from 'node:test';

// Global registry for runner
export const registeredTests: TestCase[] = [];

export function defineTest(
  name: string,
  metadata: TestMetadata,
  fn: () => void | Promise<void>
) {
  const id = `${metadata.feature || 'T' + metadata.tier}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  registeredTests.push({ id, name, metadata, fn });
  try {
    nodeTest(`[M${metadata.milestone}|${metadata.feature}] ${name}`, fn);
  } catch (_e) {
    // Gracefully ignore when not in node --test mode
  }
}

// --- Path & Source Utilities ---

export const WEB_ROOT = path.resolve(__dirname, '../../');
export const SRC_ROOT = path.resolve(WEB_ROOT, 'src');

export function getSrcRelative(absPath: string): string {
  return path.relative(SRC_ROOT, absPath);
}

export function getSrcPath(relPath: string): string {
  return path.resolve(SRC_ROOT, relPath);
}

export function fileExistsInSrc(relPath: string): boolean {
  return fs.existsSync(getSrcPath(relPath));
}

export function readSrcFile(relPath: string): string {
  const fullPath = getSrcPath(relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File does not exist: ${relPath} (resolved: ${fullPath})`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

export function getAllSrcFiles(dir: string = SRC_ROOT): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.resolve(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(getAllSrcFiles(filePath));
    } else {
      results.push(filePath);
    }
  }
  return results;
}

// --- Source Analysis Helpers ---

export function checkProhibitedStrings(
  relPath: string,
  prohibited: string[]
): { found: boolean; matches: string[] } {
  const content = readSrcFile(relPath);
  const matches: string[] = [];
  for (const item of prohibited) {
    if (content.includes(item)) {
      matches.push(item);
    }
  }
  return {
    found: matches.length > 0,
    matches,
  };
}

export function checkRequiredPatterns(
  relPath: string,
  patterns: (string | RegExp)[]
): { passed: boolean; missing: string[] } {
  const content = readSrcFile(relPath);
  const missing: string[] = [];
  for (const p of patterns) {
    if (typeof p === 'string') {
      if (!content.includes(p)) missing.push(p);
    } else {
      if (!p.test(content)) missing.push(p.toString());
    }
  }
  return {
    passed: missing.length === 0,
    missing,
  };
}

// --- DOM Mock Environment ---

export interface MockNode {
  contains: (target: MockNode | null) => boolean;
  parentNode: MockNode | null;
  children: MockNode[];
  tagName: string;
}

export interface MockElement extends MockNode {
  classList: Set<string>;
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, val: string) => void;
  style: Record<string, string>;
}

export class MockDOM {
  private listeners: Map<string, Set<(e: any) => void>> = new Map();

  addEventListener(type: string, listener: (e: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (e: any) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: { type: string; [key: string]: any }) {
    const set = this.listeners.get(event.type);
    if (set) {
      for (const listener of set) {
        listener(event);
      }
    }
  }

  getListenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }

  createElement(tagName: string): MockElement {
    const el: MockElement = {
      tagName: tagName.toUpperCase(),
      parentNode: null,
      children: [],
      classList: new Set(),
      style: {},
      getAttribute: (name) => null,
      setAttribute: (name, val) => {},
      contains: (target) => {
        if (!target) return false;
        if (target === el) return true;
        for (const child of el.children) {
          if (child.contains(target)) return true;
        }
        return false;
      },
    };
    return el;
  }
}

/**
 * Simulates running useClickOutside hook lifecycle in a clean mock DOM.
 */
export function simulateUseClickOutside<T extends MockElement>(
  ref: { current: T | null },
  handler: () => void,
  enabled: boolean = true,
  dom: MockDOM = new MockDOM()
): {
  triggerOutsideClick: (outsideNode?: MockNode) => void;
  triggerInsideClick: (insideNode?: MockNode) => void;
  triggerEscapeKey: () => void;
  triggerOtherKey: (key: string) => void;
  unmount: () => void;
  dom: MockDOM;
} {
  // Replicate exact hook lifecycle logic
  let cleanup: (() => void) | null = null;

  if (enabled) {
    const handlePointerDown = (event: any) => {
      const target = event.target;
      if (ref.current && target && !ref.current.contains(target)) {
        handler();
      }
    };

    const handleKeyDown = (event: any) => {
      if (event.key === 'Escape') {
        handler();
      }
    };

    dom.addEventListener('mousedown', handlePointerDown);
    dom.addEventListener('touchstart', handlePointerDown);
    dom.addEventListener('keydown', handleKeyDown);

    cleanup = () => {
      dom.removeEventListener('mousedown', handlePointerDown);
      dom.removeEventListener('touchstart', handlePointerDown);
      dom.removeEventListener('keydown', handleKeyDown);
    };
  }

  return {
    triggerOutsideClick: (outsideNode) => {
      const node = outsideNode || dom.createElement('div');
      dom.dispatchEvent({ type: 'mousedown', target: node });
    },
    triggerInsideClick: (insideNode) => {
      const node = insideNode || ref.current;
      dom.dispatchEvent({ type: 'mousedown', target: node });
    },
    triggerEscapeKey: () => {
      dom.dispatchEvent({ type: 'keydown', key: 'Escape' });
    },
    triggerOtherKey: (key: string) => {
      dom.dispatchEvent({ type: 'keydown', key });
    },
    unmount: () => {
      if (cleanup) cleanup();
    },
    dom,
  };
}

// --- Responsive Breakpoint Simulator ---

export type ViewportBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export function getBreakpoint(width: number): ViewportBreakpoint {
  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  if (width < 1536) return 'xl';
  return '2xl';
}

export interface ResponsiveVisibility {
  desktopDrawerVisible: boolean;
  bottomSheetVisible: boolean;
  mobileBottomNavVisible: boolean;
  leftSidebarVisible: boolean;
}

export function evaluateResponsiveVisibility(
  width: number,
  pageContent: string,
  bottomSheetContent: string
): ResponsiveVisibility {
  // Check page.tsx side drawer visibility
  // Look for classes on side drawer wrapper: e.g. hidden xl:flex or hidden md:flex
  const hasMdFlexDrawer = pageContent.includes('hidden md:flex') && pageContent.includes('Right Drawer');
  const hasXlFlexDrawer = pageContent.includes('hidden xl:flex') && pageContent.includes('Right Drawer');

  let desktopDrawerVisible = false;
  if (hasMdFlexDrawer) {
    desktopDrawerVisible = width >= 768;
  } else if (hasXlFlexDrawer) {
    desktopDrawerVisible = width >= 1280;
  }

  // Check BottomSheet visibility
  // BottomSheet has internal classes, plus page.tsx wrapper classes
  const pageWrapperHidesMd = pageContent.includes('md:hidden') && pageContent.includes('BottomSheet');
  const pageWrapperHidesXl = pageContent.includes('xl:hidden') && pageContent.includes('BottomSheet');
  const bottomSheetHasMdHidden = bottomSheetContent.includes('md:hidden');

  let bottomSheetVisible = false;
  let pageWrapperAllows = false;
  if (pageWrapperHidesMd) {
    pageWrapperAllows = width < 768;
  } else if (pageWrapperHidesXl) {
    pageWrapperAllows = width < 1280;
  } else {
    pageWrapperAllows = true;
  }

  if (pageWrapperAllows) {
    // If BottomSheet internally has md:hidden, it hides when width >= 768
    if (bottomSheetHasMdHidden) {
      bottomSheetVisible = width < 768;
    } else {
      bottomSheetVisible = true;
    }
  }

  // Check MobileBottomNav visibility
  // MobileBottomNav should be visible on mobile & tablet (< 1024px, lg:hidden)
  const mobileBottomNavVisible = width < 1024;

  // Check LeftSidebar visibility
  // LeftSidebar is wrapped in hidden lg:flex
  const leftSidebarVisible = width >= 1024;

  return {
    desktopDrawerVisible,
    bottomSheetVisible,
    mobileBottomNavVisible,
    leftSidebarVisible,
  };
}

// --- Data Loader Utility ---

export function loadRealSheetsData(): any[] {
  const dataPath = path.resolve(SRC_ROOT, 'lib/real-sheets-data.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found at ${dataPath}`);
  }
  const content = fs.readFileSync(dataPath, 'utf8');
  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : (parsed.rows || []);
}
