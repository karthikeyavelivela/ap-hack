import { mulberry32, pick, int } from './rng';

export type RegionId = 'uttarandhra' | 'coastal' | 'rayalaseema';
export interface Region {
  id: RegionId;
  name: string;
  telugu: string;
  districts: string[];
  blurb: string;
}
export interface District {
  id: string;
  name: string;
  region: RegionId;
  lon: number;
  lat: number;
  prefix: string;
  stores: number;
}
export interface Store {
  id: string;
  code: string;
  name: string;
  format: 'Hypermarket' | 'Supermarket' | 'Express';
  sqft: number;
  districtId: string;
  districtName: string;
  region: RegionId;
  lat: number;
  lng: number;
  weeklyTx: number;
  manager: string;
  opened: number;
}

export const REGIONS: Region[] = [
  { id: 'uttarandhra', name: 'Uttarandhra', telugu: 'ఉత్తరాంధ్ర', districts: [], blurb: 'Port city Visakhapatnam anchors the north; tribal belts and long supply lines test restocking.' },
  { id: 'coastal', name: 'Coastal Andhra', telugu: 'కోస్తాంధ్ర', districts: [], blurb: 'Dense, high-footfall delta towns. Festival queues and cyclone power cuts shape the year.' },
  { id: 'rayalaseema', name: 'Rayalaseema', telugu: 'రాయలసీమ', districts: [], blurb: 'Dry, hot and wide. Heat stresses cold-chain equipment long before anyone files a ticket.' },
];

// [id, name, region, lon, lat, storePrefix, stores]
const D: [string, string, RegionId, number, number, string, number][] = [
  ['srikakulam', 'Srikakulam', 'uttarandhra', 84.0, 18.55, 'SKL', 4],
  ['parvathipuram', 'Parvathipuram Manyam', 'uttarandhra', 83.35, 18.85, 'PVP', 2],
  ['vizianagaram', 'Vizianagaram', 'uttarandhra', 83.45, 18.1, 'VZM', 4],
  ['visakhapatnam', 'Visakhapatnam', 'uttarandhra', 83.25, 17.72, 'VSP', 9],
  ['asr', 'Alluri Sitharama Raju', 'uttarandhra', 82.5, 18.1, 'ARK', 2],
  ['anakapalli', 'Anakapalli', 'uttarandhra', 82.95, 17.45, 'ANK', 3],
  ['kakinada', 'Kakinada', 'coastal', 82.25, 17.0, 'KKD', 5],
  ['east-godavari', 'East Godavari', 'coastal', 81.8, 17.15, 'RJY', 5],
  ['konaseema', 'Konaseema', 'coastal', 82.0, 16.6, 'AMP', 3],
  ['west-godavari', 'West Godavari', 'coastal', 81.55, 16.55, 'BVM', 4],
  ['eluru', 'Eluru', 'coastal', 81.1, 16.8, 'ELR', 3],
  ['krishna', 'Krishna', 'coastal', 81.1, 16.2, 'MTM', 4],
  ['ntr', 'NTR', 'coastal', 80.5, 16.6, 'VJA', 12],
  ['guntur', 'Guntur', 'coastal', 80.35, 16.3, 'GNT', 8],
  ['palnadu', 'Palnadu', 'coastal', 79.8, 16.25, 'NRT', 3],
  ['bapatla', 'Bapatla', 'coastal', 80.45, 15.85, 'BPT', 3],
  ['prakasam', 'Prakasam', 'coastal', 79.6, 15.4, 'ONG', 4],
  ['nellore', 'Nellore', 'coastal', 79.95, 14.45, 'NLR', 6],
  ['kurnool', 'Kurnool', 'rayalaseema', 78.0, 15.8, 'KNL', 6],
  ['nandyal', 'Nandyal', 'rayalaseema', 78.45, 15.25, 'NDL', 3],
  ['anantapur', 'Anantapur', 'rayalaseema', 77.45, 14.7, 'ATP', 7],
  ['sri-sathya-sai', 'Sri Sathya Sai', 'rayalaseema', 77.8, 14.15, 'PTP', 4],
  ['kadapa', 'YSR Kadapa', 'rayalaseema', 78.8, 14.5, 'KDP', 5],
  ['annamayya', 'Annamayya', 'rayalaseema', 78.85, 13.95, 'RJP', 3],
  ['tirupati', 'Tirupati', 'rayalaseema', 79.5, 13.65, 'TPT', 6],
  ['chittoor', 'Chittoor', 'rayalaseema', 78.85, 13.2, 'CTR', 4],
];

export const DISTRICTS: District[] = D.map(([id, name, region, lon, lat, prefix, stores]) => ({ id, name, region, lon, lat, prefix, stores }));
DISTRICTS.forEach((d) => REGIONS.find((r) => r.id === d.region)!.districts.push(d.id));

// Stylised AP outline in lon/lat (clockwise from the south-west).
export const AP_OUTLINE: [number, number][] = [
  [76.75, 14.65], [77.1, 13.75], [77.9, 13.1], [78.3, 12.62], [78.95, 12.85], [79.35, 12.95], [79.75, 13.3], [80.2, 13.55],
  [80.2, 14.1], [80.1, 14.9], [80.2, 15.55], [80.45, 15.8], [80.8, 15.95], [81.15, 16.2], [81.7, 16.35], [82.2, 16.65],
  [82.35, 17.0], [82.6, 17.2], [83.1, 17.55], [83.6, 17.95], [84.2, 18.3], [84.8, 18.55], [84.75, 18.95], [84.25, 19.15],
  [83.6, 19.35], [83.2, 19.05], [82.7, 18.85], [82.2, 18.4], [81.8, 17.9], [81.4, 17.55], [81.0, 17.1], [80.55, 17.0],
  [80.15, 16.8], [79.6, 16.55], [79.2, 16.35], [78.6, 16.1], [78.0, 16.1], [77.4, 15.75], [77.0, 15.35],
];

export const MAP_W = 640;
export const MAP_H = 560;
export const project = (lon: number, lat: number): [number, number] => [(lon - 76.4) * 82 + 20, (19.5 - lat) * 82 + 20];

const MANAGERS = ['Ravi Teja', 'Sunitha Rao', 'Venkat Reddy', 'Lakshmi Prasanna', 'Mahesh Babu', 'Anusha K', 'Srinivas Naidu', 'Padmaja', 'Kiran Kumar', 'Bhavani Devi', 'Harsha Vardhan', 'Swathi Chowdary', 'Naresh Yadav', 'Deepika'];
const AREAS = ['Main Road', 'Bus Stand', 'Railway Station', 'RTC Complex', 'Market Yard', 'Bypass', 'Auto Nagar', 'Gandhi Road', 'Kalyan Mandapam', 'Industrial Estate', 'Collectorate', 'Temple Street'];

function buildStores(): Store[] {
  const r = mulberry32(4107);
  const out: Store[] = [];
  for (const d of DISTRICTS) {
    for (let n = 1; n <= d.stores; n++) {
      const fmt = n === 1 ? 'Hypermarket' : r() < 0.45 ? 'Supermarket' : 'Express';
      const sqft = fmt === 'Hypermarket' ? int(r, 48000, 72000) : fmt === 'Supermarket' ? int(r, 14000, 26000) : int(r, 2800, 5200);
      const tx = fmt === 'Hypermarket' ? int(r, 34000, 52000) : fmt === 'Supermarket' ? int(r, 13000, 22000) : int(r, 4500, 8200);
      const code = `${d.prefix}-${String(n).padStart(2, '0')}`;
      out.push({
        id: code,
        code,
        name: `${d.name.split(' ')[0]} ${pick(r, AREAS)}`,
        format: fmt,
        sqft,
        districtId: d.id,
        districtName: d.name,
        region: d.region,
        lat: d.lat + (r() - 0.5) * 0.4,
        lng: d.lon + (r() - 0.5) * 0.5,
        weeklyTx: tx,
        manager: pick(r, MANAGERS),
        opened: int(r, 2014, 2025),
      });
    }
  }
  return out;
}
export const STORES: Store[] = buildStores();
const DEMO_MANAGERS: Record<string, string> = { 'ATP-07': 'Ravi Teja', 'VSP-03': 'Srinivas Naidu', 'TPT-03': 'Anusha K' };
STORES.forEach((s) => { if (DEMO_MANAGERS[s.id]) s.manager = DEMO_MANAGERS[s.id]; });
export const STORE_BY_ID = new Map(STORES.map((s) => [s.id, s]));
export const DISTRICT_BY_ID = new Map(DISTRICTS.map((d) => [d.id, d]));
export const regionName = (id: RegionId) => REGIONS.find((r) => r.id === id)!.name;
