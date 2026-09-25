import * as assert from 'node:assert/strict';
import {
  defineTest,
  readSrcFile,
  fileExistsInSrc
} from './harness.ts';

// ============================================================================
// TIER 9: Free AI Route Advisor & Smart Pitch Briefing Tests
// ============================================================================

defineTest('types.ts defines AIRouteRecommendation and AIRoutePlanResult', {
  tier: 9, milestone: 9, feature: 'AI_TYPES',
  description: 'types.ts defines AIRouteRecommendation, AIRoutePlanResult, and AIPitchBriefing'
}, () => {
  const content = readSrcFile('lib/types.ts');
  assert.ok(content.includes('export interface AIRouteRecommendation'), 'types.ts must define AIRouteRecommendation');
  assert.ok(content.includes('export interface AIRoutePlanResult'), 'types.ts must define AIRoutePlanResult');
  assert.ok(content.includes('export interface AIPitchBriefing'), 'types.ts must define AIPitchBriefing');
  assert.ok(content.includes('recommended_stops: AIRouteRecommendation[]'), 'AIRoutePlanResult must include recommended_stops');
});

defineTest('/api/ai/route-advisor endpoint exists and handles plan_route and pitch_briefing', {
  tier: 9, milestone: 9, feature: 'AI_ROUTE_ENDPOINT',
  description: 'AI route handler exists, supports plan_route & pitch_briefing, and includes smart heuristic fallback'
}, () => {
  assert.ok(fileExistsInSrc('app/api/ai/route-advisor/route.ts'), 'app/api/ai/route-advisor/route.ts must exist');
  const content = readSrcFile('app/api/ai/route-advisor/route.ts');
  assert.match(content, /export\s+async\s+function\s+POST/, 'route.ts must export POST handler');
  assert.ok(content.includes('smartHeuristicPlanner'), 'route.ts must include smartHeuristicPlanner fallback');
  assert.ok(content.includes('smartHeuristicBriefing'), 'route.ts must include smartHeuristicBriefing fallback');
  assert.ok(content.includes('gemini-1.5-flash'), 'route.ts must support Gemini 1.5 Flash');
  assert.ok(content.includes('llama-3.3-70b-versatile'), 'route.ts must support Groq LLaMA 3.3');
});

defineTest('lib/api.ts exposes getAIRoutePlan and getAIPitchBriefing client methods', {
  tier: 9, milestone: 9, feature: 'AI_CLIENT_API',
  description: 'api.ts includes getAIRoutePlan and getAIPitchBriefing'
}, () => {
  const content = readSrcFile('lib/api.ts');
  assert.ok(content.includes('getAIRoutePlan:'), 'api.ts must expose getAIRoutePlan');
  assert.ok(content.includes('getAIPitchBriefing:'), 'api.ts must expose getAIPitchBriefing');
  assert.ok(content.includes('/api/ai/route-advisor'), 'api.ts must call /api/ai/route-advisor');
});

defineTest('AIRouteModal.tsx component exists and provides presets and apply action', {
  tier: 9, milestone: 9, feature: 'AI_ROUTE_MODAL',
  description: 'AIRouteModal renders 1-click presets and onApplyRoute action'
}, () => {
  assert.ok(fileExistsInSrc('components/RoutePlanner/AIRouteModal.tsx'), 'AIRouteModal.tsx must exist');
  const content = readSrcFile('components/RoutePlanner/AIRouteModal.tsx');
  assert.ok(content.includes('AI Aqlli Marshrut Maslahatchisi'), 'AIRouteModal must include title');
  assert.ok(content.includes('onApplyRoute'), 'AIRouteModal must support onApplyRoute');
  assert.ok(content.includes('PRESETS'), 'AIRouteModal must include quick presets');
});

defineTest('RoutePlannerView.tsx integrates AI Marshrut trigger and multi-point routing', {
  tier: 9, milestone: 9, feature: 'AI_ROUTE_INTEGRATION',
  description: 'RoutePlannerView includes AI Marshrut button and handleApplyAIRoute'
}, () => {
  const content = readSrcFile('components/RoutePlanner/RoutePlannerView.tsx');
  assert.ok(content.includes('AIRouteModal'), 'RoutePlannerView must import AIRouteModal');
  assert.ok(content.includes('setShowAIRouteModal'), 'RoutePlannerView must manage AI modal visibility');
  assert.ok(content.includes('handleApplyAIRoute'), 'RoutePlannerView must include handleApplyAIRoute handler');
  assert.ok(content.includes('calculateOSRMRouteMulti'), 'RoutePlannerView must compute multi-stop driving path');
});

defineTest('ObjectDetails.tsx provides AI pitch briefing button and briefing card', {
  tier: 9, milestone: 9, feature: 'AI_OBJECT_BRIEFING',
  description: 'ObjectDetails includes AI Pitch Briefing button and briefing card'
}, () => {
  const content = readSrcFile('components/ObjectPanel/ObjectDetails.tsx');
  assert.ok(content.includes('handleToggleAIBriefing'), 'ObjectDetails must implement handleToggleAIBriefing');
  assert.ok(content.includes('AI Sotuv Brifingi'), 'ObjectDetails must render AI briefing button');
  assert.ok(content.includes('aiBriefing'), 'ObjectDetails must conditionally display aiBriefing card');
});
