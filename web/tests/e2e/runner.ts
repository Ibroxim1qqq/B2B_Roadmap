import { registeredTests } from './harness.ts';
import type { TestCase, TestResult } from './harness.ts';

// Force import test files to register all test cases
import './tier1-features.test.ts';
import './tier2-boundaries.test.ts';
import './tier3-combinations.test.ts';
import './tier4-scenarios.test.ts';
import './tier5-routes-and-sheets.test.ts';
import './tier6-weekly-sync-and-notifications.test.ts';
import './tier7-user-sessions-and-audit.test.ts';
import './tier8-uysot-domtut-isolation.test.ts';
import './tier9-ai-route-advisor.test.ts';

// --- CLI Parsing ---
const args = process.argv.slice(2);
let tierFilter: number | null = null;
let milestoneFilter: number | null = null;
let featureFilter: string | null = null;
let verbose: boolean = false;

for (const arg of args) {
  if (arg.startsWith('--tier=')) {
    tierFilter = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--milestone=') || arg.startsWith('--m=')) {
    milestoneFilter = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--feature=') || arg.startsWith('--f=')) {
    featureFilter = arg.split('=')[1].toUpperCase();
  } else if (arg === '--verbose' || arg === '-v') {
    verbose = true;
  }
}

// Filter tests
const selectedTests = registeredTests.filter((tc) => {
  if (tierFilter !== null && tc.metadata.tier !== tierFilter) return false;
  if (milestoneFilter !== null && tc.metadata.milestone !== milestoneFilter) return false;
  if (featureFilter !== null && tc.metadata.feature !== featureFilter) return false;
  return true;
});

// Color helpers
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

console.log(bold(cyan('\n======================================================================')));
console.log(bold(cyan('     B2B Samarqand Construction Map — Multi-Tier Test Runner          ')));
console.log(bold(cyan('======================================================================\n')));

if (tierFilter !== null) console.log(yellow(`[Filter] Running Tier: ${tierFilter}`));
if (milestoneFilter !== null) console.log(yellow(`[Filter] Running Milestone: ${milestoneFilter}`));
if (featureFilter !== null) console.log(yellow(`[Filter] Running Feature: ${featureFilter}`));
console.log(dim(`Total registered tests: ${registeredTests.length} | Selected to run: ${selectedTests.length}\n`));

async function runTests(): Promise<void> {
  const results: TestResult[] = [];
  let currentTier = -1;
  let currentMilestone = -1;

  for (const testCase of selectedTests) {
    if (testCase.metadata.tier !== currentTier) {
      currentTier = testCase.metadata.tier;
      console.log(bold(`\n--- TIER ${currentTier}: ${getTierTitle(currentTier)} ---`));
    }

    const start = performance.now();
    let passed = false;
    let error: Error | undefined;

    try {
      await testCase.fn();
      passed = true;
    } catch (err: any) {
      passed = false;
      error = err;
    }
    const durationMs = Math.round((performance.now() - start) * 100) / 100;

    results.push({ test: testCase, passed, error, durationMs });

    const mark = passed ? green('  ✔') : red('  ✖');
    const badge = cyan(`[M${testCase.metadata.milestone}|${testCase.metadata.feature}]`);
    console.log(`${mark} ${badge} ${testCase.name} ${dim(`(${durationMs}ms)`)}`);

    if (!passed && (verbose || selectedTests.length <= 30)) {
      console.log(red(`      Error: ${error?.message || error}`));
    }
  }

  // Summary
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(bold(cyan('\n======================================================================')));
  console.log(bold('                           TEST RUN SUMMARY                           '));
  console.log(bold(cyan('======================================================================')));
  console.log(`Total Executed: ${bold(String(total))}`);
  console.log(`Passed:         ${green(bold(String(passedCount)))}`);
  console.log(`Failed:         ${failedCount > 0 ? red(bold(String(failedCount))) : green('0')}`);

  // Tier breakdown
  console.log(dim('\nBreakdown by Tier:'));
  for (let t = 1; t <= 6; t++) {
    const tierResults = results.filter((r) => r.test.metadata.tier === t);
    if (tierResults.length > 0) {
      const p = tierResults.filter((r) => r.passed).length;
      const f = tierResults.length - p;
      const statusStr = f === 0 ? green(`${p}/${tierResults.length} passed`) : yellow(`${p}/${tierResults.length} passed (${f} failed)`);
      console.log(`  Tier ${t} (${getTierTitle(t)}): ${statusStr}`);
    }
  }

  // Milestone breakdown
  console.log(dim('\nBreakdown by Milestone:'));
  for (let m = 1; m <= 6; m++) {
    const mResults = results.filter((r) => r.test.metadata.milestone === m);
    if (mResults.length > 0) {
      const p = mResults.filter((r) => r.passed).length;
      const f = mResults.length - p;
      const statusStr = f === 0 ? green(`${p}/${mResults.length} passed`) : yellow(`${p}/${mResults.length} passed (${f} pending/failed)`);
      console.log(`  Milestone ${m}: ${statusStr}`);
    }
  }

  if (failedCount > 0) {
    console.log(bold(red('\n--- DETAILED FAILURE DIAGNOSTICS ---')));
    let failIdx = 1;
    for (const r of results) {
      if (!r.passed) {
        console.log(red(`\n[#${failIdx++}] ${r.test.id} (Tier ${r.test.metadata.tier}, Milestone ${r.test.metadata.milestone})`));
        console.log(`    Name:        ${r.test.name}`);
        console.log(`    Description: ${r.test.metadata.description}`);
        console.log(`    Error:       ${bold(r.error?.message || String(r.error))}`);
      }
    }
    console.log(bold(red(`\nRun finished with ${failedCount} failures.\n`)));
    process.exit(1);
  } else {
    console.log(bold(green('\nAll selected tests passed successfully!\n')));
    process.exit(0);
  }
}

function getTierTitle(tier: number): string {
  switch (tier) {
    case 1: return 'Feature Coverage (F1-F12)';
    case 2: return 'Boundary & Corner Cases';
    case 3: return 'Cross-Feature Combinations';
    case 4: return 'Real-World Scenarios';
    default: return 'Tests';
  }
}

runTests();
