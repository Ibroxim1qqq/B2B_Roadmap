// Removes rows the old test suite wrote into the real database. Nothing else matches these filters.
// Shows what would go by default; deletes only with --apply, and takes a backup first.
//   node scripts/cleanup-test-data.mjs [--apply]
import { neon } from '@neondatabase/serverless';
import { resolveDatabaseUrl, describeDatabase } from './_db-env.mjs';
import { backupDatabase } from './db-backup.mjs';

const apply = process.argv.includes('--apply');
const url = resolveDatabaseUrl();
const sql = neon(url);

const TEST_COMPANIES = ['comp_test_crud', 'comp_custom_test', 'comp_isolation_alpha', 'comp_isolation_a', 'comp_real_suite', 'comp_route_test', 'comp_iso_x'];
const TEST_LOGINS = ['test_auditor', 'test_qa_497456'];

const steps = [
  {
    label: 'company_data: test kompaniyalari',
    count: () => sql`SELECT count(*)::int n FROM company_data WHERE company_id = ANY(${TEST_COMPANIES}::text[])`,
    run: () => sql`DELETE FROM company_data WHERE company_id = ANY(${TEST_COMPANIES}::text[])`
  },
  {
    label: "company_data: comp_default uchun test yozuvi (user_emoji)",
    count: () => sql`SELECT count(*)::int n FROM company_data WHERE company_id = 'comp_default' AND user_id = 'user_emoji'`,
    run: () => sql`DELETE FROM company_data WHERE company_id = 'comp_default' AND user_id = 'user_emoji'`
  },
  {
    label: 'routes: test marshrutlari',
    count: () => sql`SELECT count(*)::int n FROM routes WHERE company_id = ANY(${TEST_COMPANIES}::text[]) OR company_id LIKE 'comp_stress_routes_%'`,
    run: () => sql`DELETE FROM routes WHERE company_id = ANY(${TEST_COMPANIES}::text[]) OR company_id LIKE 'comp_stress_routes_%'`
  },
  {
    label: 'notifications: test bildirishnomalari',
    count: () => sql`SELECT count(*)::int n FROM notifications WHERE notif_id LIKE 'notif_crud_%'`,
    run: () => sql`DELETE FROM notifications WHERE notif_id LIKE 'notif_crud_%'`
  },
  {
    label: 'custom_fields: test maydonlari',
    count: () => sql`SELECT count(*)::int n FROM custom_fields WHERE field_name LIKE 'test_field_%'`,
    run: () => sql`DELETE FROM custom_fields WHERE field_name LIKE 'test_field_%'`
  },
  {
    label: 'user_sessions: test kirishlari',
    count: () => sql`SELECT count(*)::int n FROM user_sessions WHERE login = ANY(${TEST_LOGINS}::text[])`,
    run: () => sql`DELETE FROM user_sessions WHERE login = ANY(${TEST_LOGINS}::text[])`
  },
  {
    label: 'activity_log: test tashriflari',
    count: () => sql`SELECT count(*)::int n FROM activity_log WHERE user_info LIKE 'Inspector Jamshid%'`,
    run: () => sql`DELETE FROM activity_log WHERE user_info LIKE 'Inspector Jamshid%'`
  }
];

async function main() {
  console.log(`Baza: ${describeDatabase(url)}`);
  let total = 0;
  for (const step of steps) {
    const [{ n }] = await step.count();
    total += n;
    console.log(`  ${step.label}: ${n}`);
  }
  if (!apply) {
    console.log(`\nJami ${total} ta qator o'chiriladi. Bajarish uchun: npm run db:cleanup-test-data -- --apply`);
    return;
  }
  if (total === 0) {
    console.log('Tozalanadigan narsa yo\'q.');
    return;
  }
  console.log('Avval zaxira olinmoqda...');
  console.log(`Zaxira: ${await backupDatabase(url, 'before-cleanup')}`);
  for (const step of steps) await step.run();
  console.log(`Tayyor: ${total} ta test qatori o'chirildi.`);
}

main().catch(err => {
  console.error('XATOLIK:', err.message);
  process.exit(1);
});
