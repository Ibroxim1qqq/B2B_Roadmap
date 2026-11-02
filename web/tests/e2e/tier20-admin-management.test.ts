import * as assert from 'node:assert/strict';
import { defineTest } from './harness.ts';
import { db } from '../../src/lib/db.ts';

// ============================================================================
// TIER 20: Admin panel operations
// ============================================================================

const meta = (feature: string, description: string) => ({ tier: 20, milestone: 20, feature, description });
const unique = () => `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

defineTest('A company can be renamed and its data source changed', meta('ADMIN_COMPANY_EDIT', 'updateCompany'), async () => {
  const company = await db.createCompany(`Co ${unique()}`);
  assert.equal(await db.updateCompany(company.company_id, { company_name: 'Yangi nom', data_source: 'uysot' }), true);
  const saved = (await db.getCompanies()).find(c => c.company_id === company.company_id);
  assert.equal(saved?.company_name, 'Yangi nom');
  assert.equal(await db.getCompanyDataSource(company.company_id), 'uysot');
  assert.equal(await db.updateCompany('no_such_company', { status: 'inactive' }), false);
});

defineTest('Users of an inactive company cannot sign in or keep a session', meta('ADMIN_COMPANY_INACTIVE', 'status is enforced'), async () => {
  const company = await db.createCompany(`Co ${unique()}`);
  const login = `u_${unique()}`;
  const user = await db.createUser({ login, name: 'U', password: 'password-one', company_id: company.company_id });
  const token = await db.createAuthSession(user.user_id);
  assert.ok(await db.getUserBySession(token));

  await db.updateCompany(company.company_id, { status: 'inactive' });
  assert.equal(await db.authenticateUser(login, 'password-one'), null);
  assert.equal(await db.getUserBySession(token), null);

  await db.updateCompany(company.company_id, { status: 'active' });
  assert.ok(await db.authenticateUser(login, 'password-one'));
});

defineTest('A stopped user cannot sign in, and resuming restores access', meta('ADMIN_USER_ACTIVE', 'is_active'), async () => {
  const login = `u_${unique()}`;
  const user = await db.createUser({ login, name: 'U', password: 'password-one' });
  const token = await db.createAuthSession(user.user_id);
  await db.updateUser(user.user_id, { is_active: false });
  assert.equal(await db.authenticateUser(login, 'password-one'), null);
  assert.equal(await db.getUserBySession(token), null);
  await db.updateUser(user.user_id, { is_active: true });
  assert.ok(await db.authenticateUser(login, 'password-one'));
});

defineTest('Role and company can be changed, and a user can be deleted', meta('ADMIN_USER_EDIT', 'updateUser and deleteUser'), async () => {
  const company = await db.createCompany(`Co ${unique()}`);
  const login = `u_${unique()}`;
  const user = await db.createUser({ login, name: 'U', password: 'password-one' });
  await db.updateUser(user.user_id, { role: 'company_admin', company_id: company.company_id, name: 'Yangi ism', phone: '123' });
  const profile = await db.authenticateUser(login, 'password-one');
  assert.equal(profile?.role, 'company_admin');
  assert.equal(profile?.company_id, company.company_id);
  assert.equal(profile?.name, 'Yangi ism');

  const token = await db.createAuthSession(user.user_id);
  assert.equal(await db.deleteUser(user.user_id), true);
  assert.equal(await db.authenticateUser(login, 'password-one'), null);
  assert.equal(await db.getUserBySession(token), null);
  assert.equal(await db.deleteUser(user.user_id), false);
});

defineTest('Deleting a company removes only its own data', meta('ADMIN_COMPANY_DELETE', 'scoped cleanup'), async () => {
  const a = await db.createCompany(`A ${unique()}`);
  const b = await db.createCompany(`B ${unique()}`);
  const route = { start_lat: 1, start_lng: 1, end_lat: 2, end_lng: 2, start_name: 'A', end_name: 'B' };
  await db.saveRoute({ ...route, company_id: a.company_id });
  const kept = await db.saveRoute({ ...route, company_id: b.company_id });
  await db.deleteCompany(a.company_id);
  assert.ok(!(await db.getCompanies()).some(c => c.company_id === a.company_id));
  assert.equal((await db.getRoutes(a.company_id)).length, 0);
  assert.ok((await db.getRoutes(b.company_id)).some(r => r.id === kept.id));
});

defineTest('A source object can be edited', meta('ADMIN_OBJECT_EDIT', 'updateBaseObject'), async () => {
  const object = (await db.getObjects(undefined, false)).find(o => !o.is_custom_tjm);
  const id = String(object.source_id);
  assert.equal(await db.updateBaseObject(id, { address: 'Yangi manzil', floors: '12' }), true);
  const saved = await db.getObjectById(id);
  assert.equal(saved.address, 'Yangi manzil');
  assert.equal(saved.floors, '12');
  assert.equal(await db.updateBaseObject('no_such_object', { address: 'x' }), false);
});

defineTest('A company object can be edited and deleted, a source object cannot be deleted', meta('ADMIN_CUSTOM_OBJECT', 'custom object lifecycle'), async () => {
  const company = `comp_${unique()}`;
  const id = `custom_${unique()}`;
  await db.createCompanyCustomTJM(company, 'u1', id, { object_name: 'Bino', latitude: 41, longitude: 69 });
  assert.equal(await db.updateCustomObject(company, id, { floors: '9', phone: '555' }), true);
  const saved = await db.getObjectById(id, company);
  assert.equal(saved.floors, '9');
  assert.equal(saved.phone, '555');
  assert.equal(await db.deleteCustomObject(company, id), true);
  assert.equal(await db.getObjectById(id, company), null);

  const source = (await db.getObjects(undefined, false)).find(o => !o.is_custom_tjm);
  assert.equal(await db.deleteCustomObject(company, String(source.source_id)), false);
});

defineTest('Routes and notifications can be edited and deleted', meta('ADMIN_ROUTE_NOTIF', 'routes and notifications'), async () => {
  const route = await db.saveRoute({ company_id: `c_${unique()}`, start_lat: 1, start_lng: 1, end_lat: 2, end_lng: 2 });
  assert.equal(await db.updateRoute(route.id, { route_name: 'Yangi' }), true);
  assert.equal((await db.getRoutes(route.company_id))[0].route_name, 'Yangi');
  assert.equal(await db.deleteRoute(route.id), true);
  assert.equal(await db.deleteRoute(route.id), false);

  const notification = await db.saveNotification({ title: 'Eski' });
  assert.equal(await db.updateNotification(notification.id, { title: 'Yangi' }), true);
  assert.ok((await db.getNotifications()).some(n => n.id === notification.id && n.title === 'Yangi'));
  assert.equal(await db.deleteNotification(notification.id), true);
  assert.ok(!(await db.getNotifications()).some(n => n.id === notification.id));
});

defineTest('Fields can be renamed, hidden and deleted', meta('ADMIN_FIELDS', 'field management'), async () => {
  const name = `f_${unique()}`;
  await db.addCustomField({ field_name: name, field_type: 'text', label: 'Eski' });
  assert.equal(await db.updateCustomField('', name, { label: 'Yangi', visible: false }), true);
  const row = (await db.getAllCustomFields()).find(f => f.field_name === name);
  assert.equal(row.label, 'Yangi');
  assert.equal(row.visible, false);
  assert.ok(!(await db.getCustomFields()).some(f => f.field_name === name));
  assert.equal(await db.deleteCustomField('', name), true);
  assert.ok(!(await db.getAllCustomFields()).some(f => f.field_name === name));
});
