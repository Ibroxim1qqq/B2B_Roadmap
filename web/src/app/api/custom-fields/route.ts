import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, HttpError, readJsonBody, requireUser, resolveCompanyId } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const DEFAULT_FIELDS = [
  { field_name: 'tjm_name', field_type: 'text', required: false, visible: true, column_letter: 'W', label: 'TJM Nomi', desc: 'Turar-joy majmuasining tijoriy brend nomi' },
  { field_name: 'phone', field_type: 'phone', required: false, visible: true, column_letter: 'X', label: 'Aloqa telefoni', desc: 'Sotuv bo\'limi yoki obyekt mas\'uli telefoni' },
  { field_name: 'sales_office', field_type: 'text', required: false, visible: true, column_letter: 'Y', label: 'Sotuv ofisi manzili', desc: 'Obyekt sotuv ofisi joylashuvi' },
  { field_name: 'manager_name', field_type: 'text', required: false, visible: true, column_letter: 'Z', label: 'Rahbar / Menejer ismi', desc: 'Quruvchi yoki sotuv rahbari' },
  { field_name: 'manager_phone', field_type: 'phone', required: false, visible: true, column_letter: 'AA', label: 'Rahbar telefoni', desc: 'To\'g\'ridan-to\'g\'ri aloqa raqami' },
  { field_name: 'telegram', field_type: 'url', required: false, visible: true, column_letter: 'AB', label: 'Telegram username / havola', desc: 'Rasmiy kanal yoki menejer profili' },
  { field_name: 'instagram', field_type: 'url', required: false, visible: true, column_letter: 'AC', label: 'Instagram havola', desc: 'Obyektning ijtimoiy tarmoq sahifasi' },
  { field_name: 'notes', field_type: 'textarea', required: false, visible: true, column_letter: 'AD', label: 'Izoh / Eslatma', desc: 'Ichki B2B muzokaralar xotirasi' },
  { field_name: 'priority', field_type: 'select', required: false, visible: true, column_letter: 'AE', label: 'Ustuvorlik darajasi', desc: 'Yuqori (5), O\'rta (3), Past (1)' },
  { field_name: 'last_visit', field_type: 'date', required: false, visible: true, column_letter: 'AF', label: 'Oxirgi tashrif sanasi', desc: 'Joyiga borilgan vaqt tamg\'asi' }
];

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const fields = await db.getCustomFields(resolveCompanyId(user, searchParams.get('company_id')), searchParams.get('all') === '1');
    if (fields.length > 0) {
      const merged = fields.map(sf => {
        const def = DEFAULT_FIELDS.find(df => df.field_name === sf.field_name);
        return {
          ...sf,
          label: sf.label || def?.label || sf.field_name,
          desc: sf.desc || def?.desc || ''
        };
      });
      return NextResponse.json({ success: true, data: merged });
    }
    return NextResponse.json({ success: true, data: DEFAULT_FIELDS });
  } catch (err) {
    return apiError(err, 'Failed to get custom fields');
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== 'superadmin' && user.role !== 'company_admin') {
      throw new HttpError(403, "Maydon qo'shish faqat administrator uchun");
    }
    const body = await readJsonBody(req);
    const { field_name, field_type, label, desc } = body;

    if (typeof field_name !== 'string' || !field_name.trim()) {
      throw new HttpError(400, 'field_name talab qilinadi');
    }

    const cleanKey = field_name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const requested = resolveCompanyId(user, body.company_id);
    // A superadmin outside any company defines a field for everyone.
    const companyId = requested === 'system' ? '' : requested;

    const result = await db.addCustomField({
      field_name: cleanKey,
      field_type: field_type || 'text',
      required: false,
      visible: true,
      label: typeof label === 'string' ? label.trim() : '',
      desc: typeof desc === 'string' ? desc.trim() : ''
    }, companyId);

    await db.logActivity({
      action: 'ADD_FIELD',
      source_id: '-',
      object_name: String(label || cleanKey).trim(),
      user: `${user.name} (${companyId || 'global'})`,
      details: { field_name: cleanKey, field_type: field_type || 'text', label, desc },
      status: 'SUCCESS'
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return apiError(err, 'Failed to add custom field');
  }
}

/** Hides or shows a field for this company. Stored values stay, so hiding can be undone. */
export async function PATCH(req: Request) {
  try {
    const user = await requireUser(req);
    if (user.role !== 'superadmin' && user.role !== 'company_admin') {
      throw new HttpError(403, "Maydonni o'zgartirish faqat administrator uchun");
    }
    const body = await readJsonBody(req);
    if (typeof body.field_name !== 'string' || !body.field_name.trim()) {
      throw new HttpError(400, 'field_name talab qilinadi');
    }
    const requested = resolveCompanyId(user, body.company_id);
    await db.setCustomFieldVisibility(requested === 'system' ? '' : requested, body.field_name.trim(), Boolean(body.visible));
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err, 'Failed to update custom field');
  }
}
