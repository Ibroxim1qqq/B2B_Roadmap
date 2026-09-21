import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exportAllObjectsFromSheet, getCompanyDataFromSheet } from '@/lib/googleSheets';
import { dataCache } from '@/lib/dataCache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('company_id') || '';

    // 1. Get base rows (from in-memory cache, live sheets, or local backup)
    let baseRows: any[] = dataCache.getRows() || [];
    if (!baseRows || baseRows.length === 0) {
      try {
        const sheetsResult = await exportAllObjectsFromSheet();
        if (sheetsResult.success && sheetsResult.rows && sheetsResult.rows.length > 0) {
          baseRows = sheetsResult.rows;
        }
      } catch (sheetErr) {
        console.warn('Google Sheets live fetch warning, falling back to local file backup:', sheetErr);
      }
    }

    if (!baseRows || baseRows.length === 0) {
      try {
        const filePath = path.join(process.cwd(), 'src', 'lib', 'real-sheets-data.json');
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          const json = JSON.parse(raw);
          if (json.rows && json.rows.length > 0) {
            baseRows = json.rows;
            dataCache.setAll(json.headers || [], json.rows);
          }
        }
      } catch (fsErr) {
        console.warn('Local backup read failed:', fsErr);
      }
    }

    // 2. If no company_id provided, return base objects as is
    if (!companyId || companyId === 'system') {
      return NextResponse.json({ success: true, count: baseRows.length, data: baseRows });
    }

    // 3. Fetch company-specific overrides and custom TJMs from Company_Data
    const { overrides, customObjects } = await getCompanyDataFromSheet(companyId);

    // 4. Merge company overrides onto base objects (clean company isolation)
    const mergedRows = baseRows.map((r: any) => {
      const override = overrides.get(String(r.source_id));
      if (override) {
        return {
          ...r,
          tjm_name: override.tjm_name || '',
          phone: override.phone || '',
          sales_office: override.sales_office || '',
          manager_name: override.manager_name || '',
          manager_phone: override.manager_phone || '',
          telegram: override.telegram || '',
          instagram: override.instagram || '',
          notes: override.notes || '',
          priority: override.priority || '',
          last_visit: override.last_visit || '',
          visited_by: override.visited_by || ''
        };
      }
      // Return base without other companies' CRM data
      return {
        ...r,
        tjm_name: '',
        phone: '',
        sales_office: '',
        manager_name: '',
        manager_phone: '',
        telegram: '',
        instagram: '',
        notes: '',
        priority: '',
        last_visit: '',
        visited_by: ''
      };
    });

    // 5. Append company's custom added TJMs
    const customList = customObjects.map((c: any) => ({
      source_id: c.source_id,
      object_name: c.object_name || c.tjm_name || 'Maxsus TJM',
      tjm_name: c.tjm_name || c.object_name || 'Maxsus TJM',
      latitude: parseFloat(c.latitude) || 39.6542,
      longitude: parseFloat(c.longitude) || 66.9597,
      district_soato: c.district_soato || '1718401',
      status: 'Qurilish jarayonida',
      status_id: 1,
      sphere_id: '57',
      phone: c.phone || '',
      sales_office: c.sales_office || '',
      manager_name: c.manager_name || '',
      manager_phone: c.manager_phone || '',
      telegram: c.telegram || '',
      instagram: c.instagram || '',
      notes: c.notes || '',
      priority: c.priority || 'Normal',
      last_visit: c.last_visit || '',
      visited_by: c.visited_by || '',
      is_custom: true
    }));

    const finalData = [...customList, ...mergedRows];
    return NextResponse.json({ success: true, count: finalData.length, data: finalData });
  } catch (err: any) {
    console.error('API /api/objects error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
