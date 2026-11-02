import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { defineTest, getAllSrcFiles, readSrcFile, SRC_ROOT, WEB_ROOT } from './harness.ts';
import { db, DuplicateLoginError } from '../../src/lib/db.ts';
import { hashPassword, isHashedPassword, verifyPassword } from '../../src/lib/password.ts';
import { escapeHtml, safeExternalUrl, getTelegramUrl } from '../../src/lib/utils.ts';

// ============================================================================
// TIER 18: Regressions for the security and data-loss audit
// ============================================================================

const meta = (feature: string, description: string) => ({ tier: 18, milestone: 18, feature, description });

defineTest('Passwords are hashed with a random salt and verified', meta('PASSWORD_HASH', 'scrypt hash round trip'), () => {
  const a = hashPassword('secret-one');
  assert.ok(isHashedPassword(a));
  assert.notEqual(a, hashPassword('secret-one'), 'two hashes of one password must differ');
  assert.ok(verifyPassword('secret-one', a));
  assert.ok(!verifyPassword('secret-two', a));
  assert.ok(!verifyPassword('', a));
});

defineTest('There is no universal password', meta('NO_MASTER_PASSWORD', 'a known password must not open another account'), async () => {
  const login = `victim_${Date.now()}`;
  await db.createUser({ login, name: 'Victim', password: 'victim-own-password', company_id: 'comp_default' });
  assert.equal(await db.authenticateUser(login, 'admin123'), null);
  assert.equal(await db.authenticateUser(login, 'uysot2026'), null);
  assert.ok(await db.authenticateUser(login, 'victim-own-password'));
});

defineTest('User listings never contain password hashes', meta('NO_HASH_LEAK', 'getUsers strips password_hash'), async () => {
  const users = await db.getUsers();
  assert.ok(users.length > 0);
  for (const user of users) assert.ok(!('password_hash' in user));
});

defineTest('A duplicate login is rejected instead of overwriting the account', meta('DUPLICATE_LOGIN', 'createUser never overwrites'), async () => {
  const login = `dup_${Date.now()}`;
  await db.createUser({ login, name: 'First', password: 'first-password' });
  await assert.rejects(db.createUser({ login, name: 'Second', password: 'second-password' }), DuplicateLoginError);
  assert.ok(await db.authenticateUser(login, 'first-password'));
});

defineTest('Changing a password ends existing sessions', meta('SESSION_REVOKE', 'a session stops working after a password change'), async () => {
  const login = `sess_${Date.now()}`;
  const user = await db.createUser({ login, name: 'Sess', password: 'old-password-1' });
  const token = await db.createAuthSession(user.user_id);
  assert.equal((await db.getUserBySession(token))?.login, login);
  await db.updateUser(user.user_id, { password: 'new-password-1' });
  assert.equal(await db.getUserBySession(token), null);
});

defineTest('A logged out session is invalid and an unknown token is rejected', meta('SESSION_LOGOUT', 'session lifecycle'), async () => {
  const user = await db.createUser({ login: `out_${Date.now()}`, name: 'Out', password: 'out-password-1' });
  const token = await db.createAuthSession(user.user_id);
  await db.deleteAuthSession(token);
  assert.equal(await db.getUserBySession(token), null);
  assert.equal(await db.getUserBySession('not-a-real-token'), null);
});

defineTest('Every API route checks the session', meta('API_AUTH_GUARD', 'only the named public routes may skip requireUser'), () => {
  const publicRoutes = new Set(['app/api/auth/login/route.ts', 'app/api/auth/logout/route.ts']);
  const routes = getAllSrcFiles(path.join(SRC_ROOT, 'app', 'api')).filter(f => f.endsWith('route.ts'));
  assert.ok(routes.length >= 18);
  for (const file of routes) {
    const rel = path.relative(SRC_ROOT, file).replace(/\\/g, '/');
    if (publicRoutes.has(rel)) continue;
    const content = fs.readFileSync(file, 'utf-8');
    const handlers = (content.match(/export async function (GET|POST|PATCH|PUT|DELETE)/g) || []).length;
    const guards = (content.match(/await (requireUser|requireSuperadmin|getSessionUser)\(req/g) || []).length;
    assert.ok(handlers > 0, `${rel} has no handlers`);
    assert.ok(guards >= handlers, `${rel}: ${handlers} handlers but ${guards} session checks`);
  }
});

defineTest('Non-superadmin company comes only from the session', meta('TENANT_PIN', 'resolveCompanyId ignores the requested company'), () => {
  const content = readSrcFile('lib/serverAuth.ts');
  assert.match(content, /if \(user\.role === 'superadmin'\) return/);
  assert.match(content, /return user\.company_id \|\| ''/);
});

defineTest('No database credential or seed password exists in source files', meta('NO_SECRETS', 'scans src and scripts'), () => {
  const files = [
    ...getAllSrcFiles(SRC_ROOT).filter(f => /\.(ts|tsx)$/.test(f)),
    ...fs.readdirSync(path.join(WEB_ROOT, 'scripts')).map(f => path.join(WEB_ROOT, 'scripts', f))
  ];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    assert.ok(!/npg_[A-Za-z0-9]{6,}/.test(content), `${file} contains a Neon password`);
    assert.ok(!content.includes('b2b_weekly_secret'), `${file} contains a cron secret`);
    if (file.includes(`${path.sep}lib${path.sep}db.ts`)) continue; // dev-only memory seed
    assert.ok(!/SEED_CREDENTIALS/.test(content), `${file} ships seed credentials`);
  }
});

defineTest('Client code does not bundle the object datasets', meta('NO_CLIENT_DATA', 'the JSON files stay on the server'), () => {
  assert.ok(!readSrcFile('lib/api.ts').includes('real-sheets-data.json'));
  assert.ok(!readSrcFile('lib/api.ts').includes('uysot-domtut-data.json'));
});

defineTest('Clearing a field stores an empty value', meta('CLEAR_FIELD', 'partial update keeps other fields'), async () => {
  const objects = await db.getObjects('comp_clear_field', false);
  const id = String(objects[0].source_id);
  await db.updateCompanyData('comp_clear_field', 'u1', id, { phone: '+998900000000', notes: 'keep me' });
  await db.updateCompanyData('comp_clear_field', 'u1', id, { phone: '' });
  const row = await db.getObjectById(id, 'comp_clear_field');
  assert.equal(row.phone, '');
  assert.equal(row.notes, 'keep me');
});

defineTest('A created object stays after a clear and shows its edits', meta('CUSTOM_OBJECT', 'company objects keep building data'), async () => {
  const id = `custom_${Date.now()}`;
  await db.createCompanyCustomTJM('comp_custom_x', 'u1', id, { object_name: 'Bino', latitude: 41, longitude: 69, phone: '1' });
  await db.updateCompanyData('comp_custom_x', 'u1', id, { phone: '2' });
  assert.equal((await db.getObjectById(id, 'comp_custom_x')).phone, '2');
  await db.clearCompanyData('comp_custom_x', id);
  const cleared = await db.getObjectById(id, 'comp_custom_x');
  assert.equal(cleared.object_name, 'Bino');
  assert.equal(cleared.phone, '');
});

defineTest('Company objects are listed for that company only, whatever its dataset', meta('CUSTOM_ISOLATION', 'also covers UYSOT companies'), async () => {
  const id = `custom_uysot_${Date.now()}`;
  await db.createCompanyCustomTJM('uysot', 'u1', id, { object_name: 'UYSOT obyekti', latitude: 41, longitude: 69 });
  assert.ok((await db.getObjects('uysot', true)).some(o => o.source_id === id));
  assert.ok(!(await db.getObjects('comp_default', false)).some(o => o.source_id === id));
});

defineTest('Stored text cannot inject HTML or a script URL', meta('XSS_HELPERS', 'escapeHtml and safeExternalUrl'), () => {
  assert.equal(escapeHtml('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
  assert.equal(safeExternalUrl('javascript:alert(1)'), null);
  assert.equal(safeExternalUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(getTelegramUrl('+998 90 123 45 67'), 'https://t.me/+998901234567');
  assert.equal(getTelegramUrl('@user_name'), 'https://t.me/user_name');
});

defineTest('The client response parser reads the body instead of calling itself', meta('API_PARSE_RESPONSE', 'a recursion here broke every screen'), () => {
  const content = readSrcFile('lib/api.ts');
  const body = content.match(/async function parseResponse[\s\S]*?\n\}/)?.[0] || '';
  assert.ok(body.includes('await res.json()'));
  assert.ok(!body.includes('parseResponse(res)'));
});

defineTest('Route planner popups escape stored text', meta('XSS_POPUPS', 'no raw name interpolation'), () => {
  const content = readSrcFile('components/RoutePlanner/RoutePlannerMap.tsx');
  assert.ok(!content.includes('${obj.tjm_name || obj.object_name}'));
  assert.ok(!content.includes('${startPoint.name}'));
  assert.ok(!content.includes('${endPoint.name}'));
  assert.ok(!content.includes('📞 ${obj.phone}'));
});
