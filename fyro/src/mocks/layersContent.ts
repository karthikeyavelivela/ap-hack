export interface LayerDef {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  what: string;
  why: string;
  steps: string[];
  metrics: { label: string; value: string }[];
  example: { input: string; output: string };
  icon: string;
}

export const LAYERS: LayerDef[] = [
  {
    id: 1, slug: 'channel-cleaning', title: 'Channel Cleaning', icon: 'Sparkles',
    tagline: 'Four channels, four writing styles, one clean text.',
    what: 'Normalises the raw text from reviews, app ratings, staff WhatsApp notes and call-centre transcripts: emojis become sentiment tokens, elongated letters collapse, WhatsApp shorthand expands, agent turns are stripped from transcripts and truncated messages are flagged.',
    why: 'Every downstream model is only as good as its input. A freezer complaint written as "frzr nt wrkng stk ledu 😡" must look like the same complaint written in a polished review.',
    steps: ['Strip agent turns and rating decorations', 'Replace emoji with sentiment tokens', 'Collapse letter elongation (pleaseee → please)', 'Expand WhatsApp shorthand (frzr → freezer)', 'Flag truncated records for lower confidence'],
    metrics: [{ label: 'Records cleaned', value: '40,000' }, { label: 'Truncated flagged', value: '6.8%' }, { label: 'Shorthand tokens expanded', value: '14,210' }, { label: 'Median latency', value: '0.8 ms' }],
    example: { input: 'frzr nt wrkng stk ledu 😡', output: 'freezer not working stock ledu <ANGRY>' },
  },
  {
    id: 2, slug: 'language-id', title: 'Language ID + Transliteration', icon: 'Languages',
    tagline: 'Telugu, Hindi, Tamil, Marathi and English in the same sentence.',
    what: 'Tags every token with its language, converts romanised Indian-language words into native script and produces an English gloss. Code-mixed text such as "freezer pani cheyyatledu" is handled word by word instead of forcing one language per message.',
    why: 'Customers type Tenglish, Hinglish and transliterated Tamil. A per-message language label throws away exactly the signal the classifier needs.',
    steps: ['Token-level language tagging', 'Romanised → native-script transliteration', 'Dictionary-assisted English gloss', 'Per-record language mix stored for audit'],
    metrics: [{ label: 'Token-level accuracy', value: '94.1%' }, { label: 'Telugu share', value: '60%' }, { label: 'Code-mixed records', value: '71%' }, { label: 'Scripts supported', value: '4' }],
    example: { input: 'freezer pani cheyyatledu', output: 'freezer [EN] · పని [TE] · చెయ్యత్లేదు [TE] → "freezer is not working"' },
  },
  {
    id: 3, slug: 'hybrid-classifier', title: 'Hybrid Classifier', icon: 'Network',
    tagline: 'Rules first, MuRIL next, an LLM only when it must.',
    what: 'A three-tier classifier maps each record to one or more of 30 issue types. Cheap deterministic rules decide the obvious cases, a fine-tuned MuRIL model handles the bulk, and an LLM adjudicator is called only for ambiguous or multi-label sentences.',
    why: 'Cost and latency stay low because the expensive tier sees under 9% of the traffic, and every decision carries the tier that made it.',
    steps: ['Tier 1 · keyword and pattern rules', 'Tier 2 · MuRIL multi-label model', 'Tier 3 · LLM adjudicator for low-margin cases', 'Sentence split for multi-label records'],
    metrics: [{ label: 'Macro-F1', value: '0.83' }, { label: 'Decided by rules', value: '41%' }, { label: 'Decided by MuRIL', value: '50%' }, { label: 'Sent to LLM', value: '9%' }],
    example: { input: 'label lo peanuts ani ledu, ma papa ki allergy vachindi', output: 'allergen_mislabel · 0.96 · tier: rules' },
  },
  {
    id: 4, slug: 'severity-policy', title: 'Severity Policy', icon: 'ShieldAlert',
    tagline: 'Safety is never averaged away.',
    what: 'Assigns S1–S4 using severity = max(policy floor, model severity), where max means the more severe of the two. Safety, allergen, hygiene and staff-misconduct issues carry a policy floor of S1 that no model score can lower.',
    why: 'A model may be 70% sure a peanut label is wrong. Under FSSAI rules a possible allergen exposure is never treated as a medium issue.',
    steps: ['Model proposes a severity from urgency and harm cues', 'Policy floor looked up from the taxonomy', 'More severe of the two wins', 'Reasons recorded for audit'],
    metrics: [{ label: 'S1 recall', value: '0.82' }, { label: 'Policy categories', value: '4' }, { label: 'Severity F1', value: '0.84' }, { label: 'Overrides by humans', value: '2.1%' }],
    example: { input: 'allergen_mislabel, model says S3', output: 'S1 · forced by allergen policy floor' },
  },
  {
    id: 5, slug: 'de-duplication', title: 'De-duplication', icon: 'GitMerge',
    tagline: 'Four channels, one incident.',
    what: 'Merges records about the same event into a single incident. Candidates must share a store, an issue family and a 72-hour window; within a block, text similarity and entity matches (order ID, product, bill amount) decide the merge.',
    why: 'A single broken freezer should create one incident with four sources of evidence, not four tickets that four teams argue about.',
    steps: ['Block by store, issue family and ±72h', 'Score text similarity inside each block', 'Boost on order ID, product and bill amount matches', 'Merge into an incident and keep every source record'],
    metrics: [{ label: 'Records → incidents', value: '40,000 → 1,820' }, { label: 'Avg sources / incident', value: '7.4' }, { label: 'Multi-channel incidents', value: '100%' }, { label: 'False merges', value: '1.3%' }],
    example: { input: '4 records · 4 channels · ATP-07 · freezer', output: 'INC-1003 · 4 sources · 76 reports' },
  },
  {
    id: 6, slug: 'store-normalisation', title: 'Store-Size Normalisation', icon: 'Scale',
    tagline: 'Compare a corner shop to a hypermarket fairly.',
    what: 'Converts raw complaint counts into rates per 1,000 transactions and shrinks small-store rates toward the district mean with a Bayesian prior, so a store with 20 transactions a day cannot top a leaderboard on a single bad day.',
    why: 'Raw counts always blame the biggest store. Raw rates always blame the smallest. Shrinkage gives each store the benefit of the evidence it has actually produced.',
    steps: ['Pull weekly transactions as exposure', 'Compute raw rate per 1,000 transactions', 'Estimate the district prior', 'Shrink: (n + m·μ) / (T + m)'],
    metrics: [{ label: 'Stores normalised', value: '122' }, { label: 'Prior strength m', value: '8k tx' }, { label: 'Rank flips vs raw count', value: '31%' }, { label: 'Variance reduction', value: '−44%' }],
    example: { input: 'Express store · 4 complaints · 5k tx', output: 'raw 0.80 → shrunk 0.52 per 1k tx' },
  },
  {
    id: 7, slug: 'emerging-radar', title: 'Emerging-Issue Radar', icon: 'Radar',
    tagline: 'Spot the spike before the weekly report does.',
    what: 'Watches the daily count series of every store × issue pair. EARS C2 and C3 detect jumps over a rolling baseline, a Poisson tail test confirms the jump is not chance, and a space-time scan finds clusters across neighbouring stores. Alerts are gated on volume and channel corroboration.',
    why: 'Weekly reports find a failing freezer after the ice cream has melted. The radar finds it on day two.',
    steps: ['EARS C2: today vs mean + 3σ of a lagged 7-day baseline', 'EARS C3: three-day accumulation of excess', 'Poisson tail probability on the 3-day count', 'Space-time scan across neighbouring stores', 'Gate: minimum volume and ≥ 2 channels'],
    metrics: [{ label: 'Avg lead time', value: '3.3 days' }, { label: 'Planted incidents caught', value: '3 / 3' }, { label: 'False alarms / week', value: '8.8' }, { label: 'Series monitored', value: '3,660' }],
    example: { input: 'ATP-07 freezer · 21 reports today vs 0.4 baseline', output: 'FIRED · score 100 · p < 1e-12' },
  },
  {
    id: 8, slug: 'smart-routing', title: 'Smart Routing', icon: 'Route',
    tagline: 'Every issue lands with its owner, with a clock on it.',
    what: 'Maps each issue type to one of five owning functions (Store Ops, Supply Chain, Merchandising, Digital, HR), applies the SLA for the incident severity and applies the escalation rule that pulls Head Office in when an issue is both widespread and serious.',
    why: 'An insight nobody owns is a dashboard. Routing turns it into a task with a name and a deadline.',
    steps: ['Look up owner from issue → function table', 'Attach SLA by severity', 'Evaluate escalation rule', 'Notify owner, regional manager and store'],
    metrics: [{ label: 'Functions', value: '5' }, { label: 'S1 SLA', value: '2 h' }, { label: 'Routing accuracy', value: '97.2%' }, { label: 'Auto-escalated', value: '4.6%' }],
    example: { input: 'allergen_mislabel · S1', output: 'Merchandising · SLA 2h · escalate to Head Office' },
  },
  {
    id: 9, slug: 'weekly-brief', title: 'Weekly Regional Brief', icon: 'FileText',
    tagline: 'One page. Five issues. Real customer quotes.',
    what: 'Generates a one-page brief per region: the top five issues with significance-tested trend arrows, verbatim evidence quotes with English gloss and record IDs, affected stores, the escalation rule and the precision of last weeks alerts.',
    why: 'Regional managers do not have time for a dashboard on Monday morning. They need the five things that matter, with proof.',
    steps: ['Aggregate issues by region and week', 'Test week-on-week change for significance', 'Select evidence quotes across channels', 'Attach escalations and precision statement'],
    metrics: [{ label: 'Briefs / week', value: '3' }, { label: 'Avg read time', value: '90 s' }, { label: 'Issues per brief', value: '5' }, { label: 'Quotes with record IDs', value: '100%' }],
    example: { input: 'Rayalaseema · Week 41', output: '1-page brief · 5 issues · 10 quotes · 2 escalations' },
  },
  {
    id: 10, slug: 'evaluate-precision', title: 'Evaluate & Precision', icon: 'Gauge',
    tagline: 'Numbers you can defend in the review meeting.',
    what: 'Scores the pipeline against a hand-labelled sample: macro-F1 for issue types, severity F1, actionable F1 and S1 recall. For the radar it reports lead time on the three planted incidents, the false-alarm vs lead-time trade-off and alert precision with a Wilson confidence interval.',
    why: 'An alerting system that cannot state its precision cannot be trusted. Honest intervals beat a single flattering percentage.',
    steps: ['Score the labelled sample (≈3,000 records)', 'Compute per-class and per-severity metrics', 'Measure lead time on planted incidents', 'Sweep the alert threshold for the false-alarm curve', 'Wilson interval on alert precision'],
    metrics: [{ label: 'Macro-F1', value: '0.83' }, { label: 'Actionable F1', value: '0.98' }, { label: 'S1 recall', value: '0.82' }, { label: 'Alert precision', value: '72% (60–81)' }],
    example: { input: 'evaluate.py --week 41', output: 'macro-F1 0.83 · S1 recall 0.82 · lead 3.3 d' },
  },
];
export const LAYER_BY_ID = new Map(LAYERS.map((l) => [l.id, l]));
