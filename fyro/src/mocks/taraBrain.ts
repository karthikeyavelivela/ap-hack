import { Derived, emergingForWeek, aggregateIssues, recordsInWeek } from './derived';
import { STORE_BY_ID, STORES, REGIONS, DISTRICTS, regionName, RegionId } from './geo';
import { ISSUE_BY_ID, ISSUES, FN_BY_ID } from './taxonomy';
import { LAYER_BY_ID } from './layersContent';
import { policy } from './db';
import { CURRENT_WEEK } from './recordsGen';
import { evalSummary } from './evalStats';

export type TaraLang = 'en' | 'te' | 'hi' | 'ta' | 'mr';
export interface TaraContext { role?: string; route?: string; region?: string; storeId?: string; fn?: string; lang?: TaraLang }
export interface TaraReply { text: string; intent: string; mood: 'happy' | 'concerned' | 'neutral' }

// Short framing sentences in the 5 UI languages; data stays in the same language-neutral tokens.
const FRAME: Record<string, Record<TaraLang, string>> = {
  hello: {
    en: 'Hi, I am Tara. Ask me about stores, incidents, regions or any of the 10 pipeline layers.',
    te: 'నమస్తే, నేను తారా. స్టోర్లు, ఘటనలు, ప్రాంతాలు లేదా 10 లేయర్ల గురించి అడగండి.',
    hi: 'नमस्ते, मैं तारा हूँ। स्टोर, घटनाओं, क्षेत्रों या 10 लेयर के बारे में पूछिए।',
    ta: 'வணக்கம், நான் தாரா. கடைகள், சம்பவங்கள், பகுதிகள் அல்லது 10 அடுக்குகள் பற்றி கேளுங்கள்.',
    mr: 'नमस्कार, मी तारा. स्टोअर्स, घटना, प्रदेश किंवा 10 लेयर्सबद्दल विचारा.',
  },
  s1: {
    en: 'There are {n} open S1 incidents this week:', te: 'ఈ వారం {n} S1 ఘటనలు తెరిచి ఉన్నాయి:', hi: 'इस सप्ताह {n} S1 घटनाएँ खुली हैं:',
    ta: 'இந்த வாரம் {n} S1 சம்பவங்கள் திறந்துள்ளன:', mr: 'या आठवड्यात {n} S1 घटना उघड्या आहेत:',
  },
  flagged: {
    en: '{store} is flagged because', te: '{store} ఫ్లాగ్ అయింది ఎందుకంటే', hi: '{store} फ्लैग हुआ क्योंकि', ta: '{store} கொடியிடப்பட்டது ஏனெனில்', mr: '{store} फ्लॅग झाले कारण',
  },
  region: {
    en: '{region}, week {w}: {n} reports, {a} actionable. Top issues:', te: '{region}, వారం {w}: {n} రిపోర్టులు, {a} చర్య అవసరం. ముఖ్య సమస్యలు:',
    hi: '{region}, सप्ताह {w}: {n} रिपोर्ट, {a} कार्रवाई योग्य। मुख्य मुद्दे:', ta: '{region}, வாரம் {w}: {n} அறிக்கைகள், {a} நடவடிக்கை தேவை. முக்கிய சிக்கல்கள்:',
    mr: '{region}, आठवडा {w}: {n} अहवाल, {a} कृतीयोग्य. मुख्य समस्या:',
  },
  escalation: {
    en: 'Escalation rule: an incident goes to Head Office when', te: 'ఎస్కలేషన్ నియమం: ఒక ఘటన హెడ్ ఆఫీస్‌కు వెళ్తుంది, ఎప్పుడంటే', hi: 'एस्केलेशन नियम: घटना हेड ऑफिस जाती है जब',
    ta: 'எஸ்கலேஷன் விதி: ஒரு சம்பவம் தலைமை அலுவலகத்திற்கு செல்லும் போது', mr: 'एस्कलेशन नियम: घटना हेड ऑफिसला जाते जेव्हा',
  },
  fallback: {
    en: 'I can help with: "Which incidents are S1?", "Why is ATP-07 flagged?", "Summarise Rayalaseema this week", "Explain layer 7", "What is emerging?" or "Who owns allergen issues?"',
    te: 'నేను సహాయం చేయగలను: "ఏ ఘటనలు S1?", "ATP-07 ఎందుకు ఫ్లాగ్ అయింది?", "ఈ వారం రాయలసీమ సారాంశం", "లేయర్ 7 వివరించండి".',
    hi: 'मैं मदद कर सकती हूँ: "कौन सी घटनाएँ S1 हैं?", "ATP-07 क्यों फ्लैग हुआ?", "इस सप्ताह रायलसीमा का सारांश", "लेयर 7 समझाइए".',
    ta: 'நான் உதவ முடியும்: "எந்த சம்பவங்கள் S1?", "ATP-07 ஏன் கொடியிடப்பட்டது?", "இந்த வாரம் ராயலசீமா சுருக்கம்", "அடுக்கு 7 விளக்கு".',
    mr: 'मी मदत करू शकते: "कोणत्या घटना S1 आहेत?", "ATP-07 का फ्लॅग झाले?", "या आठवड्यात रायलसीमा सारांश", "लेयर 7 समजवा".',
  },
  emerging: {
    en: 'The radar has {n} emerging issues in week {w}. Highest first:', te: 'వారం {w}లో రాడార్‌లో {n} ఎమర్జింగ్ సమస్యలు ఉన్నాయి. ముందు అత్యధికం:',
    hi: 'सप्ताह {w} में रडार पर {n} उभरते मुद्दे हैं। सबसे ऊपर:', ta: 'வாரம் {w}ல் ரேடாரில் {n} வளர்ந்து வரும் சிக்கல்கள் உள்ளன. அதிகம் முதலில்:', mr: 'आठवडा {w} मध्ये रडारवर {n} उदयोन्मुख समस्या आहेत. सर्वोच्च प्रथम:',
  },
  owner: {
    en: '{issue} is owned by {fn}. SLA for S1 is {sla} hours.', te: '{issue} బాధ్యత {fn}. S1 SLA {sla} గంటలు.', hi: '{issue} की जिम्मेदारी {fn} की है। S1 SLA {sla} घंटे।',
    ta: '{issue} பொறுப்பு {fn}. S1 SLA {sla} மணி.', mr: '{issue} ची जबाबदारी {fn} कडे आहे. S1 SLA {sla} तास.',
  },
  totals: {
    en: 'Week {w}: {n} records processed, {i} incidents after de-duplication, {s} S1 records.', te: 'వారం {w}: {n} రికార్డులు, డీ-డూప్ తర్వాత {i} ఘటనలు, {s} S1 రికార్డులు.',
    hi: 'सप्ताह {w}: {n} रिकॉर्ड, डी-डुप के बाद {i} घटनाएँ, {s} S1 रिकॉर्ड।', ta: 'வாரம் {w}: {n} பதிவுகள், {i} சம்பவங்கள், {s} S1 பதிவுகள்.', mr: 'आठवडा {w}: {n} नोंदी, {i} घटना, {s} S1 नोंदी.',
  },
};
const f = (k: string, lang: TaraLang, vars: Record<string, string | number> = {}) =>
  FRAME[k][lang].replace(/\{(\w+)\}/g, (_, v) => String(vars[v] ?? ''));

function findStore(q: string) {
  const code = q.toUpperCase().match(/\b([A-Z]{3})[-\s]?(\d{1,2})\b/);
  if (code) { const id = `${code[1]}-${code[2].padStart(2, '0')}`; if (STORE_BY_ID.has(id)) return STORE_BY_ID.get(id)!; }
  const low = q.toLowerCase();
  const d = DISTRICTS.find((x) => low.includes(x.name.toLowerCase()) || (x.id === 'visakhapatnam' && /vizag|visakha/.test(low)) || (x.id === 'ntr' && /vijayawada/.test(low)) || (x.id === 'tirupati' && /tirupati|tirumala/.test(low)));
  if (d) return STORES.find((s) => s.districtId === d.id && s.code.endsWith('-07')) ?? STORES.find((s) => s.districtId === d.id)!;
  return null;
}
function findRegion(q: string): RegionId | null {
  const low = q.toLowerCase();
  if (/rayalaseema|rayalseema|రాయలసీమ|रायलसीमा|ராயலசீமா|रायलसीमा/.test(low)) return 'rayalaseema';
  if (/coastal|kosta|కోస్తా|कोस्टल|கடலோர|कोस्ट/.test(low)) return 'coastal';
  if (/uttarandhra|north|ఉత్తరాంధ్ర|उत्तरांध्र|உத்தர/.test(low)) return 'uttarandhra';
  return null;
}

export function taraBrain(d: Derived, message: string, ctx: TaraContext = {}): TaraReply {
  const lang = ctx.lang ?? 'en';
  const q = message.trim();
  const low = q.toLowerCase();
  const week = CURRENT_WEEK;

  const layerM = low.match(/layer\s*(\d{1,2})|లేయర్\s*(\d{1,2})|लेयर\s*(\d{1,2})|அடுக்கு\s*(\d{1,2})/);
  if (layerM) {
    const id = Number(layerM.slice(1).find(Boolean));
    const L = LAYER_BY_ID.get(id);
    if (L) return { intent: 'layer', mood: 'happy', text: `{{layer:${id}}} ${L.title}. ${L.what} ${L.why}` };
  }
  if (/\bs1\b|critical|సీరియస్|गंभीर/.test(low) && !/why/.test(low)) {
    const list = d.incidents.filter((i) => i.severity === 1 && i.status !== 'resolved' && i.lastTs > Date.UTC(2026, 9, 5)).slice(0, 6);
    const lines = list.map((i) => `• {{inc:${i.id}}} ${ISSUE_BY_ID.get(i.issue)!.label} at {{store:${i.storeId}}} (${i.count} reports, ${i.channels.length} channels)`);
    return { intent: 's1', mood: 'concerned', text: `${f('s1', lang, { n: d.incidents.filter((i) => i.severity === 1 && i.status !== 'resolved' && i.lastTs > Date.UTC(2026, 9, 5)).length })}\n${lines.join('\n')}` };
  }
  if (/escalat|ఎస్కల|एस्कल/.test(low)) {
    const e = policy.escalation;
    return { intent: 'escalation', mood: 'neutral', text: `${f('escalation', lang)} ${e.anyS1 ? 'it is S1, or ' : ''}it appears in ${e.minChannels}+ channels with ${e.minRecords}+ records within ${e.windowHours}h, or its emerging score reaches ${e.emergingScore}.` };
  }
  if (/owns|owner|who handles|responsible|బాధ్యత|जिम्मेदार/.test(low)) {
    const it = ISSUES.find((i) => low.includes(i.label.toLowerCase().split(' ')[0]) || low.includes(i.id.replace('_', ' ').split(' ')[0]));
    if (it) { const fn = FN_BY_ID.get(it.fn)!; return { intent: 'owner', mood: 'neutral', text: f('owner', lang, { issue: it.label, fn: fn.name, sla: fn.slaHours[1] }) }; }
  }
  if (/emerging|radar|spike|ఎమర్జింగ్|उभर|வளர்/.test(low)) {
    const items = emergingForWeek(d, week).slice(0, 5);
    return { intent: 'emerging', mood: 'concerned', text: `${f('emerging', lang, { n: emergingForWeek(d, week).length, w: week })}\n${items.map((e) => `• {{store:${e.storeId}}} ${ISSUE_BY_ID.get(e.issue)!.label}, score ${e.score}, p ${e.p < 1e-4 ? '<0.0001' : e.p.toFixed(4)}`).join('\n')}` };
  }
  const store = /why|flag|ఎందుకు|क्यों|ஏன்|tell me about|about|store|ఫ్లాగ్/.test(low) ? findStore(q) : null;
  if (store || ctx.storeId && /this store|ఈ స్టోర్|यह स्टोर/.test(low)) {
    const s = store ?? STORE_BY_ID.get(ctx.storeId!)!;
    const em = emergingForWeek(d, week).filter((e) => e.storeId === s.id);
    if (em.length) {
      const e = em[0];
      return { intent: 'why-flagged', mood: 'concerned', text: `${f('flagged', lang, { store: `{{store:${s.id}}}` })} ${e.why} ${e.incidentId ? `See {{inc:${e.incidentId}}}.` : ''}` };
    }
    const inc = (d.storeIncidents.get(s.id) ?? []).slice(0, 3);
    return { intent: 'store', mood: 'happy', text: `{{store:${s.id}}} ${s.name}, ${s.districtName}. ${s.format}, ${s.sqft.toLocaleString()} sq ft. No emerging alert this week. ${inc.length ? 'Recent incidents: ' + inc.map((i) => `{{inc:${i.id}}}`).join(', ') : 'No recent incidents.'}` };
  }
  const region = findRegion(q);
  if (region || /summar|brief|సారాంశ|सारांश|சுருக்க/.test(low)) {
    const r = region ?? (ctx.region as RegionId) ?? 'rayalaseema';
    const recs = recordsInWeek(d, week).filter((x) => STORE_BY_ID.get(x.storeId)!.region === r);
    const agg = aggregateIssues(d, week, (x) => STORE_BY_ID.get(x.storeId)!.region === r).slice(0, 3);
    return { intent: 'region', mood: 'happy', text: `${f('region', lang, { region: regionName(r), w: week, n: recs.length, a: recs.filter((x) => x.actionable).length })}\n${agg.map((a) => `• ${ISSUE_BY_ID.get(a.issue)!.label}: ${a.count} (${a.trend === 'up' ? '▲' : a.trend === 'down' ? '▼' : '▶'} ${a.delta >= 0 ? '+' : ''}${a.delta})`).join('\n')}\nOpen the full brief in {{brief:${r}}}.` };
  }
  if (/how many|count|total|records|ఎన్ని|कितने/.test(low)) {
    const recs = recordsInWeek(d, week);
    const inc = d.incidents.filter((i) => i.lastTs >= Date.UTC(2026, 9, 6) - 3600000).length;
    return { intent: 'totals', mood: 'neutral', text: f('totals', lang, { w: week, n: recs.length, i: inc, s: recs.filter((x) => x.severity === 1).length }) };
  }
  if (/top issue|biggest|most common|main issue|statewide|ముఖ్య|मुख्य/.test(low)) {
    const agg = aggregateIssues(d, week, () => true).slice(0, 5);
    return { intent: 'top-issues', mood: 'neutral', text: `Top issues statewide, week ${week}:\n${agg.map((a) => `• ${ISSUE_BY_ID.get(a.issue)!.label}: ${a.count}`).join('\n')}` };
  }
  if (/precision|accuracy|f1|recall|evaluation/.test(low)) {
    const e = evalSummary(d);
    return { intent: 'eval', mood: 'happy', text: `Alert precision is ${(e.precision.p * 100).toFixed(0)}% (95% CI ${(e.precision.lo * 100).toFixed(0)}–${(e.precision.hi * 100).toFixed(0)}%, n=${e.precision.n}). Macro-F1 is ${e.metrics.macroF1.toFixed(2)} and S1 recall is ${e.metrics.s1Recall.toFixed(2)}.` };
  }
  if (/hello|hi\b|hey|namaste|నమస్|नमस्|வணக்|help|సహాయ/.test(low) || !q) return { intent: 'hello', mood: 'happy', text: f('hello', lang) };
  return { intent: 'fallback', mood: 'neutral', text: f('fallback', lang) };
}
