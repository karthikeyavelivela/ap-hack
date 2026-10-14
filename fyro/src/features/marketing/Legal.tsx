import { Section } from './bits';

const DOCS = {
  privacy: { title: 'Privacy policy', updated: '1 October 2026', blocks: [
    ['What we collect', 'We process customer feedback text supplied by the retailer (reviews, app ratings, staff notes, call transcripts), store metadata, and the account details of FYRO users such as name, work email and role. We do not collect payment card data.'],
    ['How we use it', 'Feedback is cleaned, language-tagged, classified and merged into incidents so that the retailer can act on it. Account data is used to authenticate users and to scope what each role can see.'],
    ['Personal data in feedback', 'Free text can contain names or phone numbers. FYRO masks phone numbers and order identifiers in stored transcripts, and retailers can request deletion of any record.'],
    ['Sharing', 'We do not sell data. Sub-processors (cloud hosting and speech services such as Sarvam AI for optional voice) process data only to deliver the service.'],
    ['Retention and your rights', 'Records are retained for 18 months unless the retailer sets a shorter period. You can ask for access, correction or deletion by writing to privacy@fyro.in.'],
  ] },
  terms: { title: 'Terms of service', updated: '1 October 2026', blocks: [
    ['Using FYRO', 'FYRO is provided to the retailer organisation that subscribed and to the users it invites. Keep your credentials private and use the service lawfully.'],
    ['Your data', 'The retailer owns its feedback data and the incidents and briefs derived from it. FYRO may use aggregated, de-identified metrics to improve the service.'],
    ['Accuracy', 'Classification, severity and alerts are decision support. Alert precision is published with confidence intervals on the Evaluation page. Safety-critical issues must be verified by a person.'],
    ['Availability', 'We aim for 99.5% monthly availability on paid plans. Planned maintenance is announced in advance.'],
    ['Liability', 'To the extent permitted by law, FYRO is not liable for indirect losses. Nothing here limits liability that cannot be limited by law.'],
    ['Changes', 'We will give 30 days notice of material changes to these terms.'],
  ] },
} as const;

export default function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  const d = DOCS[kind];
  return (
    <div>
      <header className="bg-b900 pb-14 pt-36 text-center text-white"><div className="container-x"><h1 className="font-display text-6xl sm:text-8xl">{d.title}</h1><p className="mt-3 text-sm text-white/65">Last updated {d.updated}</p></div></header>
      <Section className="!py-12"><article className="mx-auto max-w-3xl space-y-8">{d.blocks.map(([h, b], i) => <section key={h}><h2 className="text-xl font-bold">{i + 1}. {h}</h2><p className="mt-2 leading-relaxed text-ink/75">{b}</p></section>)}</article></Section>
    </div>
  );
}
