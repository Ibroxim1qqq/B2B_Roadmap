import * as assert from 'node:assert/strict';
import {
  defineTest,
  readSrcFile,
  fileExistsInSrc
} from './harness.ts';

// ============================================================================
// TIER 7: User Sessions & Audit Trail in Google Sheets Tests
// ============================================================================

defineTest('UserSession interface is defined in lib/types.ts', {
  tier: 7, milestone: 7, feature: 'SESSIONS_SCHEMA',
  description: 'lib/types.ts defines UserSession interface with 12 tracking columns'
}, () => {
  const content = readSrcFile('lib/types.ts');
  assert.match(content, /export\s+interface\s+UserSession/, 'UserSession interface must be exported');
  assert.match(content, /session_id:\s*string/, 'UserSession must include session_id');
  assert.match(content, /user_id:\s*string/, 'UserSession must include user_id');
  assert.match(content, /user_name:\s*string/, 'UserSession must include user_name');
  assert.match(content, /login:\s*string/, 'UserSession must include login');
  assert.match(content, /role:\s*string/, 'UserSession must include role');
  assert.match(content, /company_id:\s*string/, 'UserSession must include company_id');
  assert.match(content, /action:\s*['"]login['"]\s*\|\s*['"]register['"]/, 'UserSession must specify action');
  assert.match(content, /ip_address:\s*string/, 'UserSession must include ip_address');
  assert.match(content, /user_agent:\s*string/, 'UserSession must include user_agent');
  assert.match(content, /timestamp:\s*string/, 'UserSession must include timestamp');
  assert.match(content, /created_at:\s*string/, 'UserSession must include created_at');
});

defineTest('googleSheets.ts implements recordUserSessionInSheet and getUserSessionsFromSheet', {
  tier: 7, milestone: 7, feature: 'SHEETS_SESSIONS',
  description: 'googleSheets.ts provides functions to ensure Sessions sheet, record sessions, and read them'
}, () => {
  const content = readSrcFile('lib/googleSheets.ts');
  assert.match(content, /export\s+async\s+function\s+recordUserSessionInSheet/, 'googleSheets.ts must export recordUserSessionInSheet');
  assert.match(content, /export\s+async\s+function\s+getUserSessionsFromSheet/, 'googleSheets.ts must export getUserSessionsFromSheet');
  assert.match(content, /SESSION_HEADERS/, 'googleSheets.ts must define SESSION_HEADERS');
  assert.ok(content.includes('Sessions!A1:L'), 'recordUserSessionInSheet targets Sessions range');
  assert.ok(content.includes('ensureSessionsSheet'), 'googleSheets.ts implements ensureSessionsSheet helper');
});

defineTest('/api/auth/login records session with action login', {
  tier: 7, milestone: 7, feature: 'AUTH_SESSION_LOGGING',
  description: 'Login route records user session upon successful authentication'
}, () => {
  assert.ok(fileExistsInSrc('app/api/auth/login/route.ts'), 'app/api/auth/login/route.ts must exist');
  const content = readSrcFile('app/api/auth/login/route.ts');
  assert.match(content, /recordUserSessionInSheet/, 'Login route must import and call recordUserSessionInSheet');
  assert.match(content, /action:\s*['"]login['"]/, 'Login route must record action as login');
  assert.ok(content.includes('x-forwarded-for') || content.includes('ip'), 'Login route must extract client IP');
  assert.ok(content.includes('user-agent'), 'Login route must extract user-agent header');
});

defineTest('/api/admin/users records audit log with action register', {
  tier: 7, milestone: 7, feature: 'REGISTRATION_AUDIT_LOGGING',
  description: 'Admin user creation records audit log with action register'
}, () => {
  assert.ok(fileExistsInSrc('app/api/admin/users/route.ts'), 'app/api/admin/users/route.ts must exist');
  const content = readSrcFile('app/api/admin/users/route.ts');
  assert.match(content, /recordUserSessionInSheet/, 'Admin users route must import and call recordUserSessionInSheet');
  assert.match(content, /action:\s*['"]register['"]/, 'Admin users route must record action as register');
});

defineTest('/api/admin/sessions endpoint exists and exposes GET method', {
  tier: 7, milestone: 7, feature: 'API_SESSIONS',
  description: 'app/api/admin/sessions/route.ts returns sessions list for SuperAdmin'
}, () => {
  assert.ok(fileExistsInSrc('app/api/admin/sessions/route.ts'), 'app/api/admin/sessions/route.ts must exist');
  const content = readSrcFile('app/api/admin/sessions/route.ts');
  assert.match(content, /export\s+async\s+function\s+GET/, 'route.ts must export GET handler');
  assert.match(content, /getUserSessionsFromSheet/, 'GET handler must invoke getUserSessionsFromSheet');
});

defineTest('lib/api.ts includes getUserSessions method', {
  tier: 7, milestone: 7, feature: 'API_CLIENT_SESSIONS',
  description: 'lib/api.ts provides client method to fetch user sessions'
}, () => {
  const content = readSrcFile('lib/api.ts');
  assert.match(content, /getUserSessions:/, 'api object must have getUserSessions method');
  assert.ok(content.includes('/api/admin/sessions'), 'getUserSessions must call /api/admin/sessions endpoint');
});

defineTest('app/admin/page.tsx renders Sessions tab with real-time audit table', {
  tier: 7, milestone: 7, feature: 'ADMIN_SESSIONS_UI',
  description: 'SuperAdmin page includes Sessiyalar tab, stat counter, and audit table'
}, () => {
  const content = readSrcFile('app/admin/page.tsx');
  assert.ok(content.includes("'sessions'"), "activeTab union must support 'sessions'");
  assert.ok(content.includes('getUserSessions'), 'admin page must invoke api.getUserSessions');
  assert.match(content, /Sessiyalar/, 'admin page must render Sessiyalar tab');
  assert.ok(content.includes('sessionSearch'), 'admin page must provide session search');
  assert.ok(content.includes('Tizimga kirdi') || content.includes('login'), 'admin page must render login badge');
  assert.ok(content.includes("Ro'yxatdan o'tdi") || content.includes('register'), 'admin page must render register badge');
});
