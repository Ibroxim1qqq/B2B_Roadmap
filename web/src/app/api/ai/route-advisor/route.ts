import { NextResponse } from 'next/server';
import { AIRoutePlanResult, AIPitchBriefing, MapObject, AIChatMessage, AIChatAction } from '../../../../lib/types';
import { haversineMeters } from '../../../../lib/routeUtils';
import realSheetsData from '../../../../lib/real-sheets-data.json';
import uysotDomtutData from '../../../../lib/uysot-domtut-data.json';

export const dynamic = 'force-dynamic';

const isUysotCompany = (cid?: string) => cid === 'uysot' || cid === 'comp_1789981554543';

const uysotRows: any[] = (Array.isArray(uysotDomtutData) ? uysotDomtutData : (uysotDomtutData as any).rows || []) as any[];
const realSheetsRows: any[] = (realSheetsData.rows as any[]) || [];

interface RequestBody {
  action?: 'chat' | 'plan_route' | 'pitch_briefing';
  company_id?: string;
  message?: string;
  user_lat?: number;
  user_lng?: number;
  prompt?: string;
  unvisited_only?: boolean;
  high_priority_only?: boolean;
  max_stops?: number;
  objects_pool?: any[];
  target_object?: any;
}

// -------------------------------------------------------------
// 1. Smart Heuristic Local AI Chat & Search Engine (Ground Truth)
// -------------------------------------------------------------
function analyzeAndSearchDatabase(
  query: string,
  pool: any[],
  companyName: string,
  userLat?: number,
  userLng?: number
): {
  replyText: string;
  suggestedObjects: any[];
  routeStops: any[];
  actions: AIChatAction[];
} {
  const q = (query || '').toLowerCase().trim();
  const total = pool.length;
  const visited = pool.filter(o => Boolean(o.last_visit || o.is_visited)).length;
  const withPhone = pool.filter(o => Boolean(o.phone || o.manager_phone)).length;
  const withManager = pool.filter(o => Boolean(o.manager_name)).length;
  const highPriority = pool.filter(o => o.priority === 'Yuqori').length;

  const actions: AIChatAction[] = [];
  let suggestedObjects: any[] = [];
  let routeStops: any[] = [];
  let replyText = '';

  // A. Check for Route Planning queries ("marshrut", "yo'nalish", "borish", "plan", "reja")
  const isRouteQuery = q.includes('marshrut') || q.includes('yo\'nalish') || q.includes('yonalish') || q.includes('borish') || q.includes('reja');
  if (isRouteQuery) {
    const planner = smartHeuristicPlanner(pool, userLat, userLng, q.includes('borilmagan'), q.includes('yuqori'), 5, query);
    routeStops = planner.recommended_stops;
    suggestedObjects = planner.recommended_stops.map(s => {
      const match = pool.find(p => String(p.source_id) === String(s.source_id)) || {};
      return {
        source_id: s.source_id,
        object_name: s.object_name,
        district_name: match.district_name || 'Shahar',
        floors: match.floors || '—',
        apartment_count: match.apartment_count || '0',
        phone: match.phone || match.manager_phone || '',
        manager_name: match.manager_name || '',
        builder: match.builder || '—',
        latitude: s.latitude,
        longitude: s.longitude
      };
    });

    replyText = `Siz uchun **${companyName}** bazasidagi eng qulay va kam vaqt sarflanadigan **${routeStops.length} ta TJM** bo'yicha kunlik optimal marshrut tuzildi (~${planner.estimated_duration_hours} soat).

Quyidagi **"Xaritada Marshrutni Chizish"** tugmasini bossangiz, avtomobil navigatori avtomatik ishga tushadi:`;

    actions.push({
      type: 'apply_route',
      label: '🚗 Xaritada Marshrutni Chizish (Navigator)',
      route_stops: planner.recommended_stops
    });

    return { replyText, suggestedObjects, routeStops, actions };
  }

  // B. Check for Statistics queries ("nechta", "jami", "statistika", "hisobot", "umumiy")
  const isStatsQuery = q.includes('nechta') || q.includes('jami') || q.includes('statistika') || q.includes('hisobot') || q.includes('qancha');
  if (isStatsQuery) {
    replyText = `📊 **${companyName} Bazasining Joriy Statistikasi:**\n\n` +
      `• **Jami obyektlar soni:** **${total.toLocaleString()} ta**\n` +
      `• **Tashrif buyurilganlar:** **${visited.toLocaleString()} ta** (${Math.round((visited / (total || 1)) * 100)}%)\n` +
      `• **Hali borilmaganlar:** **${(total - visited).toLocaleString()} ta**\n` +
      `• **Telefon raqami mavjud:** **${withPhone.toLocaleString()} ta**\n` +
      `• **Mas'ul rahbari kiritilgan:** **${withManager.toLocaleString()} ta**\n` +
      `• **Yuqori ustuvorlikdagi (Priority):** **${highPriority.toLocaleString()} ta**\n\n` +
      `Qaysi tuman yoki aniq obyekt bo'yicha ma'lumot olmoqchisiz? Shunchaki tuman yoki pudratchi nomini yozing.`;
    return { replyText, suggestedObjects: [], routeStops: [], actions };
  }

  // C. Check for Nearest queries ("yaqin", "atrof", "yon")
  const isNearestQuery = q.includes('yaqin') || q.includes('atrof') || q.includes('yon');
  if (isNearestQuery) {
    const lat = userLat || 39.6542;
    const lng = userLng || 66.9597;
    const sorted = [...pool]
      .filter(o => o.latitude && o.longitude)
      .map(o => ({
        ...o,
        dist_m: haversineMeters(lat, lng, o.latitude, o.longitude)
      }))
      .sort((a, b) => a.dist_m - b.dist_m)
      .slice(0, 5);

    suggestedObjects = sorted.map(o => ({
      source_id: String(o.source_id),
      object_name: o.tjm_name ? `${o.tjm_name} (${o.object_name})` : o.object_name,
      district_name: o.district_name || 'Shahar',
      floors: o.floors || '—',
      apartment_count: o.apartment_count || '0',
      phone: o.phone || o.manager_phone || '',
      manager_name: o.manager_name || '',
      builder: o.builder || '—',
      latitude: o.latitude,
      longitude: o.longitude,
      dist_km: (o.dist_m / 1000).toFixed(1)
    }));

    replyText = `Sizga eng yaqin joylashgan **${suggestedObjects.length} ta bino** topildi:\n` +
      suggestedObjects.map((s, idx) => `${idx + 1}. **${s.object_name}** (~${s.dist_km} km) - ${s.district_name}`).join('\n') +
      `\n\nQuyidagi tugma orqali ushbu binolar bo'yicha darhol xaritada marshrut chizishingiz mumkin:`;

    actions.push({
      type: 'apply_route',
      label: '🚗 Ushbu binolar bo\'yicha marshrut chizish',
      route_stops: sorted.map((s, idx) => ({
        source_id: String(s.source_id),
        order: idx + 1,
        object_name: s.tjm_name || s.object_name,
        reason: `${(s.dist_m / 1000).toFixed(1)} km masofada joylashgan`,
        pitch_tip: 'Eng qulay va tezkor yetib boriladigan bino',
        latitude: s.latitude,
        longitude: s.longitude
      }))
    });

    return { replyText, suggestedObjects, routeStops: [], actions };
  }

  // D. Check for Phone queries ("telefon", "nomer", "tel", "aloqa")
  const isPhoneQuery = (q.includes('telefon') || q.includes('nomer') || q.includes('aloqa')) && !q.includes('+998');
  if (isPhoneQuery) {
    const withPhoneList = pool.filter(o => Boolean(o.phone || o.manager_phone));
    const top = withPhoneList.slice(0, 5);
    suggestedObjects = top.map(o => ({
      source_id: String(o.source_id),
      object_name: o.tjm_name ? `${o.tjm_name} (${o.object_name})` : o.object_name,
      district_name: o.district_name || 'Shahar',
      floors: o.floors || '—',
      apartment_count: o.apartment_count || '0',
      phone: o.phone || o.manager_phone || '',
      manager_name: o.manager_name || '',
      builder: o.builder || '—',
      latitude: o.latitude,
      longitude: o.longitude
    }));

    replyText = `Tizimda telefon raqami kiritilgan jami **${withPhoneList.length.toLocaleString()} ta** bino mavjud. Quyida dastlabki ${top.length} tasi keltirildi:`;
    return { replyText, suggestedObjects, routeStops: [], actions };
  }

  // E. Check for Manager queries ("rahbar", "menejer", "direktor", "boshliq")
  const isManagerQuery = q.includes('rahbar') || q.includes('menejer') || q.includes('direktor') || q.includes('boshliq');
  if (isManagerQuery) {
    const withMgrList = pool.filter(o => Boolean(o.manager_name));
    const top = withMgrList.slice(0, 5);
    suggestedObjects = top.map(o => ({
      source_id: String(o.source_id),
      object_name: o.tjm_name ? `${o.tjm_name} (${o.object_name})` : o.object_name,
      district_name: o.district_name || 'Shahar',
      floors: o.floors || '—',
      apartment_count: o.apartment_count || '0',
      phone: o.phone || o.manager_phone || '',
      manager_name: o.manager_name || '',
      builder: o.builder || '—',
      latitude: o.latitude,
      longitude: o.longitude
    }));

    replyText = `Tizimda mas'ul rahbari qayd etilgan jami **${withMgrList.length.toLocaleString()} ta** bino mavjud. Quyida dastlabki ${top.length} tasi:`;
    return { replyText, suggestedObjects, routeStops: [], actions };
  }
  // 1. Search by District
  const districtMatches = pool.filter(o => {
    const d = (o.district_name || '').toLowerCase();
    const addr = (o.address || '').toLowerCase();
    return q.split(' ').some(word => word.length > 3 && (d.includes(word) || addr.includes(word)));
  });

  // 2. Search by General keywords (Name, Builder, Customer, Manager, Phone)
  const keywordMatches = pool.filter(o => {
    const name = (o.object_name || o.tjm_name || '').toLowerCase();
    const builder = (o.builder || '').toLowerCase();
    const customer = (o.customer || '').toLowerCase();
    const mgr = (o.manager_name || '').toLowerCase();
    const phone = (o.phone || o.manager_phone || '').toLowerCase();
    const notes = (o.notes || '').toLowerCase();

    return q.split(' ').some(word => 
      word.length >= 3 && (
        name.includes(word) || 
        builder.includes(word) || 
        customer.includes(word) || 
        mgr.includes(word) || 
        phone.includes(word) ||
        notes.includes(word)
      )
    );
  });

  const combined = Array.from(new Set([...districtMatches, ...keywordMatches]));

  if (combined.length > 0) {
    const topMatches = combined.slice(0, 5);
    suggestedObjects = topMatches.map(o => ({
      source_id: String(o.source_id),
      object_name: o.tjm_name ? `${o.tjm_name} (${o.object_name})` : o.object_name,
      district_name: o.district_name || 'Shahar',
      floors: o.floors || '—',
      apartment_count: o.apartment_count || '0',
      phone: o.phone || o.manager_phone || '',
      manager_name: o.manager_name || '',
      builder: o.builder || '—',
      latitude: o.latitude,
      longitude: o.longitude
    }));

    replyText = `Sizning so'rovingiz bo'yicha **${combined.length} ta** bino topildi. Quyida ulardan eng asosiy ${topMatches.length} tasi keltirildi:`;

    // Add filter action if single district matched
    if (districtMatches.length > 0 && districtMatches[0].district_name) {
      actions.push({
        type: 'apply_filter',
        label: `🔍 Xaritada "${districtMatches[0].district_name}" filtrlash`,
        filter: { district: districtMatches[0].district_name }
      });
    }

    return { replyText, suggestedObjects, routeStops: [], actions };
  }

  // D. General Helpful Overview Response
  replyText = `Salom! Men **${companyName}** tizimidagi **${total.toLocaleString()} ta** bino bo'yicha yordamchi AI assistentman.\n\n` +
    `Menga quyidagicha savollar berishingiz mumkin:\n` +
    `• *"Registon atrofidagi borilmagan 5 ta binoga marshrut tuzib ber"*\n` +
    `• *"Urgut tumanidagi telefon raqami bor binolar qaysilar?"*\n` +
    `• *"Bugungi kunlik tashrif rejasini tayyorla"*\n` +
    `• *"Pudratchisi 'Sam Energo' bo'lgan loyihalar bormi?"*\n` +
    `• *"Jami nechta obyektga tashrif buyurilgan?"*`;

  return { replyText, suggestedObjects: [], routeStops: [], actions };
}

// -------------------------------------------------------------
// 2. Smart Heuristic Route Planner
// -------------------------------------------------------------
function smartHeuristicPlanner(
  pool: MapObject[],
  userLat?: number,
  userLng?: number,
  unvisitedOnly?: boolean,
  highPriorityOnly?: boolean,
  maxStops: number = 5,
  prompt?: string
): AIRoutePlanResult {
  const startLat = userLat || 39.6542;
  const startLng = userLng || 66.9597;
  const promptLower = (prompt || '').toLowerCase();

  // If prompt explicitly mentions a district (e.g. Urgut, Chilonzor), prioritize candidates in that district!
  let candidates = pool;
  const districtMentioned = pool.find(o => o.district_name && promptLower.includes(o.district_name.toLowerCase()));
  if (districtMentioned && districtMentioned.district_name) {
    candidates = pool.filter(o => o.district_name?.toLowerCase() === districtMentioned.district_name?.toLowerCase());
  }

  // Apply filters
  let filtered = candidates.filter(obj => {
    if (unvisitedOnly && (obj.is_visited || obj.last_visit)) return false;
    if (highPriorityOnly && obj.priority !== 'Yuqori') return false;
    if (!obj.latitude || !obj.longitude) return false;
    return true;
  });

  if (filtered.length === 0) {
    filtered = pool.filter(obj => Boolean(obj.latitude && obj.longitude));
  }

  // Score candidates based on: Distance, Priority, Unvisited bonus, Has phone bonus
  const scored = filtered.map(obj => {
    const distMeters = haversineMeters(startLat, startLng, obj.latitude, obj.longitude);
    let score = 0;

    const km = distMeters / 1000;
    score += Math.max(0, 50 - km * 2.5);

    if (obj.priority === 'Yuqori') score += 30;
    else if (obj.priority === "O'rta") score += 15;

    if (!obj.last_visit && !obj.is_visited) score += 25;
    if (obj.phone || obj.manager_phone) score += 15;

    const apts = parseInt(obj.apartment_count || '0', 10);
    if (apts > 100) score += 15;

    return { obj, score, distMeters };
  });

  scored.sort((a, b) => b.score - a.score);

  // Take top candidates and order them using Nearest Neighbor
  const selected = scored.slice(0, Math.min(maxStops, scored.length)).map(s => s.obj);
  const ordered: MapObject[] = [];
  let currentLat = startLat;
  let currentLng = startLng;
  const unvisitedSet = new Set(selected);

  while (unvisitedSet.size > 0) {
    let nearest: MapObject | null = null;
    let minDist = Infinity;

    for (const item of unvisitedSet) {
      const d = haversineMeters(currentLat, currentLng, item.latitude, item.longitude);
      if (d < minDist) {
        minDist = d;
        nearest = item;
      }
    }

    if (nearest) {
      ordered.push(nearest);
      unvisitedSet.delete(nearest);
      currentLat = nearest.latitude;
      currentLng = nearest.longitude;
    } else {
      break;
    }
  }

  const stops = ordered.map((obj, idx) => {
    const apt = obj.apartment_count && obj.apartment_count !== '0' ? `${obj.apartment_count} xonadonli` : 'ko\'p qavatli';
    const fl = obj.floors && obj.floors !== '—' ? `${obj.floors} qavatli` : '';
    const hasPhone = Boolean(obj.phone || obj.manager_phone);
    const unvisited = !obj.last_visit;

    let reason = `${obj.district_name || 'Shahar'} hududidagi ${apt} (${fl}) majmua.`;
    if (unvisited) {
      reason += ' Hali tashrif buyurilmagan, birinchi aloqa uchun ayni vaqt.';
    } else {
      reason += ` Yangi tijoriy taklif bilan uchrashish tavsiya etiladi.`;
    }

    let pitch_tip = `Bino rahbari yoki sotuv ofisiga kirib, ${apt} qurilish hajmi uchun maxsus B2B shartlarni taqdim qiling.`;
    if (hasPhone) {
      pitch_tip += ` Tel: ${obj.phone || obj.manager_phone}.`;
    }

    return {
      source_id: String(obj.source_id),
      order: idx + 1,
      object_name: obj.tjm_name ? `${obj.tjm_name} (${obj.object_name})` : obj.object_name,
      reason,
      pitch_tip,
      latitude: obj.latitude,
      longitude: obj.longitude
    };
  });

  return {
    route_name: prompt ? `AI Tavsiya: ${prompt.slice(0, 35)}...` : 'Kunlik Eng Optimal B2B Marshrut',
    summary: `Tanlangan ${stops.length} ta TJM minimal yo'l bosib maksimal sotuv natijasiga erishish uchun ketma-ket joylashtirildi.`,
    estimated_duration_hours: Math.round((stops.length * 0.75) * 10) / 10,
    engine_used: 'heuristic',
    recommended_stops: stops
  };
}

function smartHeuristicBriefing(obj: any): AIPitchBriefing {
  const name = obj.tjm_name || obj.object_name || 'Qurilish obyekti';
  const apts = obj.apartment_count || '0';
  const floors = obj.floors || '—';
  const builder = obj.builder || obj.customer || "Pudrat tashkiloti";
  const notes = obj.notes ? `Oldingi eslatma: "${obj.notes}"` : "Ilgari eslatma qoldirilmagan.";

  return {
    source_id: String(obj.source_id || ''),
    object_name: name,
    profile_summary: `${name} — ${floors} qavatli, ${apts} ta xonadonga mo'ljallangan yirik turar-joy majmuasi. Pudratchi: ${builder}.`,
    selling_points: [
      `Katta hajm (${apts} xonadon) — B2B toptan xarid va uzoq muddatli shartnoma imkoniyati.`,
      `Qurilish bosqichi — pardozlash, fasad va muhandislik jihozlarini yetkazib berish ayni payti.`,
      obj.phone ? `To'g'ridan-to'g'ri aloqa mavjud (${obj.phone}), tezkor muzokara o'tkazish mumkin.` : `Sotuv ofisiga bevosita joyida tashrif buyurib mas'ul shaxs bilan tanishish kerak.`
    ],
    negotiation_strategy: `Uchrashuvda pudratchi '${builder}' manfaatlariga mos keluvchi chegirma, uzluksiz yetkazib berish kafolati va to'lovni bo'lib to'lash shartlarini asosiy ustunlik sifatida ko'rsating.`,
    previous_context_tip: notes
  };
}

// -------------------------------------------------------------
// 3. LLM API Calls (Gemini / Groq)
// -------------------------------------------------------------
async function callGeminiAI(prompt: string, apiKey: string): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini API');
  return JSON.parse(text);
}

async function callGroqAI(prompt: string, apiKey: string): Promise<any> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Sen professional B2B sotuv bo\'yicha sun\'iy intellekt maslahatchisisan. Faqat valid JSON formatda javob berasan.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq API');
  return JSON.parse(text);
}

// -------------------------------------------------------------
// 4. Main POST Handler
// -------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const action = body.action || 'chat';
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const groqKey = process.env.GROQ_API_KEY?.trim();

    // Determine target dataset based on company isolation
    const isUysot = isUysotCompany(body.company_id);
    const companyName = isUysot ? 'UYSOT.UZ (Toshkent)' : 'Samarqand Qurilish Xaritasi';
    const pool: any[] = (Array.isArray(body.objects_pool) && body.objects_pool.length > 0)
      ? body.objects_pool
      : (isUysot ? uysotRows : realSheetsRows);

    // ACTION A: Interactive Global Chat & Search
    if (action === 'chat') {
      const userMessage = body.message || body.prompt || '';
      
      // Perform Ground Truth context search from our database
      const groundTruth = analyzeAndSearchDatabase(
        userMessage,
        pool,
        companyName,
        body.user_lat,
        body.user_lng
      );

      // If an LLM API key is present, enhance the answer with natural generative reasoning
      if ((geminiKey || groqKey) && userMessage.trim().length > 3) {
        try {
          const sampleContext = groundTruth.suggestedObjects.length > 0
            ? groundTruth.suggestedObjects
            : pool.slice(0, 15).map(o => ({
                id: o.source_id,
                name: o.tjm_name || o.object_name,
                district: o.district_name,
                floors: o.floors,
                apts: o.apartment_count,
                phone: o.phone || o.manager_phone || '',
                manager: o.manager_name || '',
                builder: o.builder || ''
              }));

          const prompt = `
Siz ${companyName} tizimining professional AI Copilot asistetisiz.
Foydalanuvchi savoli: "${userMessage}"

Baza haqiqiy ma'lumotlari:
Jami binolar: ${pool.length} ta
Topilgan mos binolar namunalari:
${JSON.stringify(sampleContext, null, 2)}

Qoidalar:
1. FAQAT berilgan haqiqiy ma'lumotlarga tayangan holda samimiy, aniq va professional O'ZBEK TILIDA javob bering.
2. Xayoliy ma'lumot to'qimang. Telefon raqami, bino nomi va tumanini aniq keltiring.
3. Agar marshrut so'ralsa, eng qulay yo'nalish bo'yicha maslahat bering.

Quyidagi JSON strukturasida javob qaytar:
{
  "reply_text": "Foydalanuvchiga to'liq o'zbek tilidagi tushuntirish va javob"
}
`;
          let llmRes: any;
          if (geminiKey) {
            llmRes = await callGeminiAI(prompt, geminiKey);
          } else {
            llmRes = await callGroqAI(prompt, groqKey!);
          }

          if (llmRes && llmRes.reply_text) {
            groundTruth.replyText = llmRes.reply_text;
          }
        } catch (llmErr: any) {
          console.warn('LLM chat call failed, using heuristic ground truth:', llmErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          text: groundTruth.replyText,
          suggested_objects: groundTruth.suggestedObjects,
          route_stops: groundTruth.routeStops,
          actions: groundTruth.actions
        }
      });
    }

    // ACTION B: Pitch Briefing for single building
    if (action === 'pitch_briefing') {
      const targetObj = body.target_object;
      if (!targetObj) {
        return NextResponse.json({ success: false, error: 'target_object is required' }, { status: 400 });
      }

      if (geminiKey || groqKey) {
        try {
          const prompt = `
Vazifa: Ushbu qurilish obyekti bo'yicha B2B sotuv agentiga muzokara oldidan professional brifing va sotuv maslahati tuzib ber.
Obyekt ma'lumotlari:
- Nomi: ${targetObj.tjm_name || targetObj.object_name}
- Manzil: ${targetObj.address || targetObj.district_name}
- Qavatlar: ${targetObj.floors || 'noma\'lum'}
- Xonadonlar soni: ${targetObj.apartment_count || '0'}
- Quruvchi / Pudratchi: ${targetObj.builder || '—'}
- Buyurtmachi: ${targetObj.customer || '—'}
- Telefon: ${targetObj.phone || targetObj.manager_phone || 'yo\'q'}
- Rahbar: ${targetObj.manager_name || 'yo\'q'}
- Oxirgi tashrif sanasi: ${targetObj.last_visit || 'hech qachon'}
- O'tgan tashrif izohlari: ${targetObj.notes || 'yo\'q'}

Quyidagi JSON strukturasida O'ZBEK TILIDA javob qaytar:
{
  "source_id": "${targetObj.source_id}",
  "object_name": "${targetObj.tjm_name || targetObj.object_name}",
  "profile_summary": "Qisqa obyekt xarakteristikasi (1-2 gap)",
  "selling_points": ["Ushbu binoga qiziqish uyg'otuvchi 1-asos", "2-asos", "3-asos"],
  "negotiation_strategy": "Sotuv agenti rahbar bilan uchrashganda qanday gap boshlashi va qaysi ustunliklarni aytishi kerakligi bo'yicha aniq strategiya",
  "previous_context_tip": "Agar oldingi izoh bo'lsa shunga asoslangan maslahat"
}
`;
          let result: AIPitchBriefing;
          if (geminiKey) {
            result = await callGeminiAI(prompt, geminiKey);
          } else {
            result = await callGroqAI(prompt, groqKey!);
          }
          return NextResponse.json({ success: true, data: result, engine: geminiKey ? 'gemini' : 'groq' });
        } catch (err: any) {
          console.warn('AI Briefing LLM call failed, using heuristic fallback:', err.message);
        }
      }

      const heuristic = smartHeuristicBriefing(targetObj);
      return NextResponse.json({ success: true, data: heuristic, engine: 'heuristic' });
    }

    // ACTION C: Plan Route
    const maxStops = Math.min(body.max_stops || 5, 8);
    const heuristicResult = smartHeuristicPlanner(
      pool,
      body.user_lat,
      body.user_lng,
      body.unvisited_only,
      body.high_priority_only,
      maxStops,
      body.prompt
    );

    return NextResponse.json({ success: true, data: heuristicResult });
  } catch (error: any) {
    console.error('Route advisor API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
