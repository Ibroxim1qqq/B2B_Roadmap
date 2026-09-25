import { NextResponse } from 'next/server';
import { AIRoutePlanResult, AIPitchBriefing, MapObject } from '../../../../lib/types';
import { haversineMeters } from '../../../../lib/routeUtils';

export const dynamic = 'force-dynamic';

interface RequestBody {
  action?: 'plan_route' | 'pitch_briefing';
  company_id?: string;
  user_lat?: number;
  user_lng?: number;
  prompt?: string;
  unvisited_only?: boolean;
  high_priority_only?: boolean;
  max_stops?: number;
  objects_pool?: any[];
  // For pitch_briefing action:
  target_object?: any;
}

// -------------------------------------------------------------
// 1. Fallback Heuristic Engines (100% Reliable Offline Fallback)
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

  // Filter pool
  let candidates = pool.filter(obj => {
    if (unvisitedOnly && (obj.is_visited || obj.last_visit)) return false;
    if (highPriorityOnly && obj.priority !== 'Yuqori') return false;
    if (!obj.latitude || !obj.longitude) return false;
    return true;
  });

  if (candidates.length === 0) {
    candidates = pool.filter(obj => Boolean(obj.latitude && obj.longitude));
  }

  // Score candidates based on: Distance, Priority, Unvisited bonus, Has phone bonus
  const scored = candidates.map(obj => {
    const distMeters = haversineMeters(startLat, startLng, obj.latitude, obj.longitude);
    let score = 0;

    // Proximity score (closer is better, max 50 pts)
    const km = distMeters / 1000;
    score += Math.max(0, 50 - km * 3);

    // Priority bonus
    if (obj.priority === 'Yuqori') score += 30;
    else if (obj.priority === "O'rta") score += 15;

    // Unvisited bonus
    if (!obj.last_visit && !obj.is_visited) score += 25;

    // Contact availability bonus
    if (obj.phone || obj.manager_phone) score += 15;

    // Scale bonus (large apartment complexes)
    const apts = parseInt(obj.apartment_count || '0', 10);
    if (apts > 100) score += 10;

    return { obj, score, distMeters };
  });

  scored.sort((a, b) => b.score - a.score);

  // Take top candidates and order them using Nearest Neighbor TSP
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
    const fl = obj.floors && obj.floors !== '—' ? `${obj.floors} qavat` : '';
    const hasPhone = Boolean(obj.phone || obj.manager_phone);
    const unvisited = !obj.last_visit;

    let reason = `${obj.district_name || 'Shahar'} hududidagi ${apt} (${fl}) yirik majmua.`;
    if (unvisited) {
      reason += ' Hali biror marta tashrif buyurilmagan, birinchi aloqa uchun ayni vaqt.';
    } else {
      reason += ` Oxirgi tashrifdan keyin yangi taklif bilan uchrashish maqsadga muvofiq.`;
    }

    let pitch_tip = `Bino rahbari yoki sotuv ofisiga kirib, qurilish hajmi (${apt}) uchun maxsus tijoriy shartlarni taklif qiling.`;
    if (hasPhone) {
      pitch_tip += ` Oldindan qo'ng'iroq qilib (${obj.phone || obj.manager_phone}) uchrashuv belgilash mumkin.`;
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
    route_name: prompt ? `AI Tavsiya: ${prompt.slice(0, 40)}...` : 'Kunlik Eng Optimal B2B Marshrut',
    summary: `Tanlangan ${stops.length} ta TJM geografik jihatdan ketma-ket joylashgan bo'lib, minimal yo'l bosib maksimal sotuv natijasiga erishish uchun tuzildi.`,
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
// 2. LLM Call via Google Gemini 1.5 Flash (Free Tier)
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

// -------------------------------------------------------------
// 3. LLM Call via Groq Cloud (Free Tier)
// -------------------------------------------------------------
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
    const action = body.action || 'plan_route';
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const groqKey = process.env.GROQ_API_KEY?.trim();

    // A. Single Object Pitch Briefing Action
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

      // Fallback
      const heuristic = smartHeuristicBriefing(targetObj);
      return NextResponse.json({ success: true, data: heuristic, engine: 'heuristic' });
    }

    // B. Plan Route Action
    const pool: MapObject[] = Array.isArray(body.objects_pool) ? body.objects_pool : [];
    if (pool.length === 0) {
      return NextResponse.json({ success: false, error: 'Obyektlar ro\'yxati bo\'sh' }, { status: 400 });
    }

    const maxStops = Math.min(body.max_stops || 5, 8);

    if (geminiKey || groqKey) {
      try {
        // Prepare simplified candidates list (top 20 closest or high priority) to save tokens
        const startLat = body.user_lat || 39.6542;
        const startLng = body.user_lng || 66.9597;

        let filtered = pool;
        if (body.unvisited_only) {
          filtered = filtered.filter(o => !o.last_visit && !o.is_visited);
        }
        if (body.high_priority_only) {
          filtered = filtered.filter(o => o.priority === 'Yuqori');
        }
        if (filtered.length < maxStops) {
          filtered = pool;
        }

        // Sort by distance to user
        const sampleCandidates = filtered
          .map(o => ({
            id: String(o.source_id),
            name: o.tjm_name ? `${o.tjm_name} (${o.object_name})` : o.object_name,
            district: o.district_name || 'Shahar',
            floors: o.floors || '—',
            apts: o.apartment_count || '0',
            builder: o.builder || '—',
            phone: o.phone || o.manager_phone ? 'bor' : 'yo\'q',
            visited: o.last_visit || o.is_visited ? 'ha' : 'yo\'q',
            priority: o.priority || 'Oddiy',
            lat: o.latitude,
            lng: o.longitude,
            dist_km: Math.round((haversineMeters(startLat, startLng, o.latitude, o.longitude) / 1000) * 10) / 10
          }))
          .sort((a, b) => a.dist_km - b.dist_km)
          .slice(0, 25);

        const prompt = `
Vazifa: B2B qurilish mahsulotlari sotuv agenti uchun bugungi kunlik eng optimal va samarali ${maxStops} ta to'xtash joyidan (Stop) iborat marshrut rejasini tuzib ber.
Agentning hozirgi joylashuvi koordinatalari: lat: ${startLat}, lng: ${startLng}.
Foydalanuvchi so'rovi/talabi: "${body.prompt || 'Eng optimal va sotuv imkoniyati yuqori binolar'}".

Mavjud binolar nomzodlari:
${JSON.stringify(sampleCandidates, null, 2)}

Qoidalar:
1. Aynan eng yuqori daromad keltirishi mumkin bo'lgan, borilmagan yoki yuqori ustuvorlikdagi eng optimal ${maxStops} ta obyektni tanla.
2. Ularni agentning hozirgi nuqtasidan boshlab, bir yo'nalishda eng qisqa vaqt va masofa sarflanadigan mantiqiy tartibda (1 dan ${maxStops} gacha) joylashtir.
3. Har bir bino uchun nima sababdan tanlanganini ("reason") va agent u yerga borganda nima deyishi kerakligi bo'yicha sotuv maslahatini ("pitch_tip") O'ZBEK TILIDA yoz.

Quyidagi qat'iy JSON formatida javob qaytar:
{
  "route_name": "Marshrutning qisqa ifodali nomi",
  "summary": "Nega aynan shu marshrut tanlangani bo'yicha 1-2 gaplik xulosa",
  "estimated_duration_hours": 3.5,
  "recommended_stops": [
    {
      "source_id": "tanlangan nomzodning aniq id si",
      "order": 1,
      "object_name": "Obyekt nomi",
      "reason": "Tanlanish sababi (o'zbek tilida)",
      "pitch_tip": "Sotuv agentiga amaliy maslahat (o'zbek tilida)",
      "latitude": 39.123,
      "longitude": 66.123
    }
  ]
}
`;

        let aiResult: AIRoutePlanResult;
        if (geminiKey) {
          aiResult = await callGeminiAI(prompt, geminiKey);
          aiResult.engine_used = 'gemini';
        } else {
          aiResult = await callGroqAI(prompt, groqKey!);
          aiResult.engine_used = 'groq';
        }

        // Attach lat/lng if missing
        if (Array.isArray(aiResult.recommended_stops)) {
          aiResult.recommended_stops = aiResult.recommended_stops.map(s => {
            const match = pool.find(p => String(p.source_id) === String(s.source_id));
            return {
              ...s,
              latitude: match?.latitude || s.latitude,
              longitude: match?.longitude || s.longitude
            };
          });
        }

        return NextResponse.json({ success: true, data: aiResult });
      } catch (llmErr: any) {
        console.warn('AI Route LLM call failed, falling back to smart heuristic:', llmErr.message);
      }
    }

    // Fallback: Smart Heuristic Planner
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
