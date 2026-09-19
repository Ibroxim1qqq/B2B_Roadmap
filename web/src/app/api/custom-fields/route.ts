import { NextResponse } from 'next/server';
import { getCustomFieldsFromSheet, addCustomFieldToSheet } from '@/lib/googleSheets';

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

export async function GET() {
  try {
    const sheetFields = await getCustomFieldsFromSheet();
    if (sheetFields && sheetFields.length > 0) {
      // Merge with labels from DEFAULT_FIELDS if missing
      const merged = sheetFields.map(sf => {
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
  } catch (err: any) {
    console.error('Failed to get custom fields:', err);
    return NextResponse.json({ success: true, data: DEFAULT_FIELDS });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { field_name, field_type, label, desc } = body;

    if (!field_name) {
      return NextResponse.json({ success: false, error: 'field_name talab qilinadi' }, { status: 400 });
    }

    const cleanKey = field_name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const result = await addCustomFieldToSheet({
      field_name: cleanKey,
      field_type: field_type || 'text',
      label: (label || cleanKey).trim(),
      desc: (desc || '').trim(),
      required: false,
      visible: true
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Failed to add custom field to Google Sheets:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
