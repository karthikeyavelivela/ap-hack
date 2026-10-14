export type FnId = 'store_ops' | 'supply_chain' | 'merch' | 'digital' | 'hr';
export type Sev = 1 | 2 | 3 | 4;
export type Lang = 'te' | 'hi' | 'ta' | 'mr' | 'en';
export type PolicyCat = 'safety' | 'allergen' | 'hygiene' | 'misconduct' | null;

export interface FnDef {
  id: FnId;
  name: string;
  owner: string;
  slaHours: Record<Sev, number>;
}
export const FUNCTIONS: FnDef[] = [
  { id: 'store_ops', name: 'Store Operations', owner: 'Meena Iyer', slaHours: { 1: 2, 2: 8, 3: 48, 4: 120 } },
  { id: 'supply_chain', name: 'Supply Chain', owner: 'Rohit Varma', slaHours: { 1: 2, 2: 12, 3: 48, 4: 120 } },
  { id: 'merch', name: 'Merchandising', owner: 'Aparna Sastry', slaHours: { 1: 2, 2: 12, 3: 72, 4: 168 } },
  { id: 'digital', name: 'Digital', owner: 'Karthik Menon', slaHours: { 1: 2, 2: 8, 3: 48, 4: 120 } },
  { id: 'hr', name: 'People & HR', owner: 'Sandhya Pillai', slaHours: { 1: 2, 2: 24, 3: 72, 4: 168 } },
];
export const FN_BY_ID = new Map(FUNCTIONS.map((f) => [f.id, f]));

export interface IssueType {
  id: string;
  label: string;
  fn: FnId;
  floor: Sev;
  family: string;
  policy: PolicyCat;
  en: string;
  te: string;
  hi: string;
  ta: string;
  mr: string;
  short?: string;
}

const I = (
  id: string, label: string, fn: FnId, floor: Sev, family: string, policy: PolicyCat,
  en: string, te: string, hi: string, ta: string, mr: string, short?: string,
): IssueType => ({ id, label, fn, floor, family, policy, en, te, hi, ta, mr, short });

export const ISSUES: IssueType[] = [
  // Store Ops
  I('freezer_failure', 'Freezer / chiller failure', 'store_ops', 2, 'equipment', null,
    'Freezer not working since morning, ice cream melted', 'freezer pani cheyyatledu since morning ice cream anni karigipoyayi',
    'fridge kharab hai bhai, ice cream pighal gayi', 'freezer velai seyyala, ice cream urugiduchu', 'freezer chalat nahi, ice cream vitaltay', 'frzr nt wrkng stk ledu'),
  I('ac_failure', 'AC / ventilation failure', 'store_ops', 3, 'equipment', null,
    'AC not working, store is very hot', 'AC pani cheyyatledu, store lo chala vedi ga undi', 'AC band hai, andar bahut garmi hai', 'AC odala, ulla romba veppam', 'AC band aahe, aat khup garam hota', 'ac nt wrkng hot hot'),
  I('power_cut', 'Power cut / generator', 'store_ops', 2, 'utilities', null,
    'Power cut, lights off and billing stopped', 'current ledu, lights anni off, billing aagipoyindi', 'light gayi hai, billing ruk gayi', 'current illa, billing nindruchu', 'light gelet, billing thambla', 'pwr cut billing stpd'),
  I('billing_queue', 'Billing queue / wait', 'store_ops', 3, 'checkout', null,
    'Very long billing queue, waited 30 minutes', 'billing lo chala queue, 30 minutes waiting chesam', 'billing mein bahut lambi line, 30 minute wait kiya', 'billing la romba queue, 30 nimisham kaathirunthom', 'billing la khup rang, 30 minit thamblo', 'q too long counters clsd'),
  I('cleanliness', 'Cleanliness', 'store_ops', 3, 'hygiene', null,
    'Floor is dirty, trolleys not clean', 'floor chala dirty ga undi, trolleys kuda clean ledu', 'floor bahut gandi hai, trolley bhi saaf nahi', 'floor romba azhukku, trolley um clean illa', 'floor khup ghan aahe, trolley pan swachh nahi'),
  I('pest_hygiene', 'Pest / hygiene breach', 'store_ops', 1, 'hygiene', 'hygiene',
    'Rats seen near the grain section', 'rice bags daggara elukalu thirugutunnayi, chala disgusting', 'atta ke paas chuhe ghoom rahe hain', 'arisi kitta eli odudhu', 'dhanya jawal undir firtayet', 'rats near rice section pls check'),
  I('safety_hazard', 'Safety hazard', 'store_ops', 1, 'safety', 'safety',
    'Water leak on the floor, a customer slipped', 'floor meeda neellu leak avtunnayi, okaru jaarpadaru', 'farsh par paani leak, ek aadmi phisal gaya', 'tharazhil thanni leak, oruthar valukki vizhunthar', 'farshivar paani gaLtay, ek jan ghasarla', 'wet floor cust fell'),
  I('parking_access', 'Parking / access', 'store_ops', 4, 'premises', null,
    'No parking space, vehicles blocking the entrance', 'parking lo space ledu, bikes anni block chesaru', 'parking mein jagah nahi, gaadi block hai', 'parking la idam illa', 'parking la jaga nahi'),
  I('overcharging', 'Overcharging at billing', 'store_ops', 2, 'checkout', null,
    'Overcharged, extra item on the bill', 'ekkuva dabbulu vesaru, bill lo extra item undi', 'zyada paise liye, bill mein extra item hai', 'adhiga kaasu vaangunaanga, bill la extra item', 'jast paise ghetle, bill madhe extra item'),
  // Supply chain
  I('out_of_stock', 'Out of stock', 'supply_chain', 3, 'availability', null,
    'Milk out of stock for two days', 'milk packets stock ledu, rendu rojulundi', 'doodh ka stock nahi hai, do din se', 'paal stock illa, rendu naala', 'doodh stock nahi, don divas', 'milk stk ledu 2 days'),
  I('expired_product', 'Expired product on shelf', 'supply_chain', 2, 'quality', null,
    'Expired curd packets on the shelf', 'expiry ayipoyina curd packets shelf lo unnayi', 'expire hua dahi shelf par rakha hai', 'expiry aana thayir shelf la irukku', 'expire jhalela dahi shelf var aahe'),
  I('short_delivery', 'Short delivery', 'supply_chain', 3, 'logistics', null,
    'Items short in delivery', 'delivery lo items takkuva vachayi, order lo rendu missing', 'delivery mein items kam aaye', 'delivery la items kammi', 'delivery madhe items kami'),
  I('damaged_goods', 'Damaged goods', 'supply_chain', 3, 'quality', null,
    'Damaged boxes, oil bottles leaking', 'dabbalu nalugipoyayi, oil bottles leak avtunnayi', 'dabbe pichak gaye, oil bottle leak', 'box nasungiduchu, oil bottle leak', 'dabbe chirdle, oil bottle leak'),
  I('stale_produce', 'Stale produce', 'supply_chain', 3, 'quality', null,
    'Selling rotten tomatoes', 'kullipoyina tomatoes ammutunnaru', 'sadhe hue tamatar bech rahe hain', 'azhugina thakkali vikkiranga', 'kujlele tomato vikat aahet', 'tomatos kullipoyayi'),
  I('replenishment_delay', 'Replenishment delay', 'supply_chain', 4, 'availability', null,
    'Empty shelves, no restocking', 'shelves khali ga unnayi, restock cheyyatledu', 'shelves khaali hain, restock nahi', 'shelf kaali, restock pannala', 'shelf rikame, restock nahi'),
  // Merchandising
  I('price_mismatch', 'Shelf / bill price mismatch', 'merch', 3, 'pricing', null,
    'Shelf price differs from billing price', 'shelf price okati, billing lo inkoti', 'shelf pe price alag, billing mein alag', 'shelf price vera, billing vera', 'shelf var vegla bhav, billing madhe vegla'),
  I('allergen_mislabel', 'Allergen mislabel', 'merch', 1, 'labelling', 'allergen',
    'Label does not list peanuts, my child had an allergic reaction', 'label lo peanuts ani ledu, ma papa ki allergy vachindi', 'label par peanuts nahi likha, bachche ko allergy ho gayi', 'label la peanuts nu illa, kuzhandhaiku allergy', 'label var peanuts nahi, mulala allergy zali', 'lbl no peanuts kid allergy'),
  I('wrong_label', 'Wrong weight / MRP label', 'merch', 3, 'labelling', null,
    'Wrong weight label on the pack', 'weight label tappu ga undi, 500g ani rasi 400g undi', 'label galat hai, 500g likha par 400g', 'label thappu, 500g nu irukku aana 400g', 'label chukiche, 500g lihile pan 400g'),
  I('poor_assortment', 'Poor assortment', 'merch', 4, 'range', null,
    'Few brands, poor variety', 'brands takkuva, variety ledu', 'brands kam hain, variety nahi', 'brand kammi, variety illa', 'brands kami, variety nahi'),
  I('promo_not_applied', 'Promo not applied', 'merch', 3, 'pricing', null,
    'Promo shown but not applied at billing', 'offer board meeda undi kani billing lo apply avvaledu', 'offer board pe hai par billing mein nahi laga', 'offer board la irukku, billing la poda', 'offer board var aahe pan billing madhe nahi'),
  I('shelf_clutter', 'Aisle clutter', 'merch', 4, 'premises', null,
    'Cartons blocking the aisles', 'aisles lo cartons padi unnayi, nadavadam kastam', 'aisle mein cartons pade hain', 'aisle la carton kidakku', 'aisle madhe cartons padle'),
  // Digital
  I('app_crash', 'App crash', 'digital', 3, 'app', null,
    'App crashes on opening', 'app open avvagane crash avtundi', 'app khulte hi crash ho jata hai', 'app open pannadhum crash aaguthu', 'app ughadtach crash hoto'),
  I('payment_failure', 'Payment failure', 'digital', 2, 'payments', null,
    'Payment failed but money deducted', 'payment fail ayindi kani money cut ayyindi', 'payment fail ho gaya par paisa kat gaya', 'payment fail aachu aana panam pochu', 'payment fail zale pan paise kapale'),
  I('order_cancelled', 'Order cancelled', 'digital', 3, 'orders', null,
    'Order cancelled without reason', 'order cancel chesaru, reason cheppaledu', 'order cancel kar diya, wajah nahi batayi', 'order cancel pannitaanga', 'order cancel kela'),
  I('delivery_late', 'Late home delivery', 'digital', 3, 'orders', null,
    'Home delivery arrived 3 hours late', 'delivery chala late ga vachindi, 3 hours', 'delivery bahut late aayi, 3 ghante', 'delivery romba late, 3 mani neram', 'delivery khup uShira, 3 tas'),
  I('otp_issue', 'OTP / login issue', 'digital', 4, 'app', null,
    'OTP not received, cannot log in', 'OTP raavatledu, login avvaledu', 'OTP nahi aa raha, login nahi ho raha', 'OTP varala', 'OTP yet nahi'),
  // HR
  I('staff_misconduct', 'Staff misconduct', 'hr', 1, 'conduct', 'misconduct',
    'Staff at the billing counter were abusive and threatening', 'billing counter lo rude ga matladaru, kodataniki vachaaru', 'billing counter pe staff ne badtameezi ki, dhamki di', 'billing counter la rude ah pesinanga, midhirinaanga', 'billing counter var staff ne arerávi keli', 'staff rude ga matladaru'),
  I('staff_rude', 'Staff behaviour', 'hr', 3, 'conduct', null,
    'Staff were rude to customers', 'staff manchi ga matladatledu, attitude chupistunnaru', 'staff ka behaviour rude hai', 'staff rude ah pesuranga', 'staff cha vartan rude aahe'),
  I('short_staffed', 'Short-staffed', 'hr', 3, 'staffing', null,
    'Too few staff, nobody to help', 'staff takkuva, help cheyyadaniki evaru ledu', 'staff kam hai, koi help nahi', 'staff kammi, help panna yaarum illa', 'staff kami, madat nahi'),
  I('staff_training', 'Product knowledge', 'hr', 4, 'staffing', null,
    'Staff do not know the products', 'staff ki products gurinchi telidu, adigite telidu antaru', 'staff ko product ke baare mein pata nahi', 'staff ku product pathi theriyala', 'staff la product baddal mahit nahi'),
];
export const ISSUE_BY_ID = new Map(ISSUES.map((i) => [i.id, i]));

export const PRAISE: Record<Lang, string[]> = {
  en: ['Great store, friendly staff and fresh vegetables', 'Smooth billing, good variety, will come again', 'Nice offers this week, very happy'],
  te: ['store chala bagundi, staff manchiga help chesaru', 'fresh vegetables bagunnayi, billing fast ga ayindi', 'offers bagunnayi, thank you'],
  hi: ['store bahut accha hai, staff helpful hai', 'sabzi fresh thi, billing jaldi hui', 'offers achhe hain, shukriya'],
  ta: ['store romba nalla irukku, staff help panninaanga', 'vegetables fresh ah irundhuchu', 'offers nalla irukku'],
  mr: ['store khup chhan aahe, staff madat karto', 'bhaji taji hoti, billing lavkar zale'],
};

export const SEV_LABEL: Record<Sev, string> = { 1: 'S1 Critical', 2: 'S2 High', 3: 'S3 Medium', 4: 'S4 Low' };
export const POLICY_LABEL: Record<Exclude<PolicyCat, null>, string> = {
  safety: 'Customer / staff safety',
  allergen: 'Allergen & labelling (FSSAI)',
  hygiene: 'Food hygiene & pests',
  misconduct: 'Staff misconduct',
};
