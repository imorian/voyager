// GSA Per Diem API utilities
// Rates sourced from https://api.gsa.gov/travel/perdiem/v2

const GSA_BASE = "https://api.gsa.gov/travel/perdiem/v2";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

// Official GSA M&IE breakdown table (https://www.gsa.gov/travel/plan-book/per-diem-rates/mie-breakdown)
// Key = M&IE total (meals + incidentals); incidentals are always $5 for CONUS
const MIE_TABLE: Record<number, { breakfast: number; lunch: number; dinner: number; incidentals: number }> = {
  59:  { breakfast: 13, lunch: 15, dinner: 26, incidentals: 5 },
  64:  { breakfast: 14, lunch: 16, dinner: 29, incidentals: 5 },
  69:  { breakfast: 16, lunch: 17, dinner: 31, incidentals: 5 },
  74:  { breakfast: 17, lunch: 18, dinner: 34, incidentals: 5 },
  79:  { breakfast: 18, lunch: 20, dinner: 36, incidentals: 5 },
  84:  { breakfast: 19, lunch: 21, dinner: 39, incidentals: 5 },
  89:  { breakfast: 20, lunch: 22, dinner: 42, incidentals: 5 },
  94:  { breakfast: 21, lunch: 23, dinner: 45, incidentals: 5 },
  99:  { breakfast: 22, lunch: 25, dinner: 47, incidentals: 5 },
  104: { breakfast: 23, lunch: 26, dinner: 50, incidentals: 5 },
  109: { breakfast: 24, lunch: 27, dinner: 53, incidentals: 5 },
  114: { breakfast: 25, lunch: 29, dinner: 55, incidentals: 5 },
  119: { breakfast: 26, lunch: 30, dinner: 58, incidentals: 5 },
  124: { breakfast: 28, lunch: 31, dinner: 60, incidentals: 5 },
  129: { breakfast: 29, lunch: 32, dinner: 63, incidentals: 5 },
  134: { breakfast: 30, lunch: 34, dinner: 65, incidentals: 5 },
  139: { breakfast: 31, lunch: 35, dinner: 68, incidentals: 5 },
  144: { breakfast: 32, lunch: 36, dinner: 71, incidentals: 5 },
  149: { breakfast: 34, lunch: 38, dinner: 72, incidentals: 5 },
  154: { breakfast: 35, lunch: 39, dinner: 75, incidentals: 5 },
  159: { breakfast: 36, lunch: 40, dinner: 78, incidentals: 5 },
  164: { breakfast: 37, lunch: 42, dinner: 80, incidentals: 5 },
  169: { breakfast: 38, lunch: 43, dinner: 83, incidentals: 5 },
  174: { breakfast: 39, lunch: 44, dinner: 86, incidentals: 5 },
  179: { breakfast: 40, lunch: 45, dinner: 89, incidentals: 5 },
  184: { breakfast: 42, lunch: 47, dinner: 90, incidentals: 5 },
  189: { breakfast: 43, lunch: 48, dinner: 93, incidentals: 5 },
  194: { breakfast: 44, lunch: 49, dinner: 96, incidentals: 5 },
  199: { breakfast: 45, lunch: 50, dinner: 99, incidentals: 5 },
  204: { breakfast: 46, lunch: 51, dinner: 102, incidentals: 5 },
};

export function getMieBreakdown(mieTotal: number) {
  if (MIE_TABLE[mieTotal]) return MIE_TABLE[mieTotal];
  // Proportional fallback for values not in the published table
  const incidentals = 5;
  const mealsPortion = mieTotal - incidentals;
  return {
    breakfast: Math.round(mealsPortion * 0.236),
    lunch:     Math.round(mealsPortion * 0.278),
    dinner:    mealsPortion - Math.round(mealsPortion * 0.236) - Math.round(mealsPortion * 0.278),
    incidentals,
  };
}

export interface GsaCityRate {
  city: string;
  state: string;
  fiscalYear: number;
  lodgingJan: number | null; lodgingFeb: number | null; lodgingMar: number | null;
  lodgingApr: number | null; lodgingMay: number | null; lodgingJun: number | null;
  lodgingJul: number | null; lodgingAug: number | null; lodgingSep: number | null;
  lodgingOct: number | null; lodgingNov: number | null; lodgingDec: number | null;
  mieTotal: number;
  mieFirstLast: number;
  mieBreakfast: number;
  mieLunch: number;
  mieDinner: number;
  mieIncidental: number;
}

function parseLodgingByMonth(months: any[]): Record<string, number | null> {
  const map: Record<string, number | null> = {};
  for (const m of months) {
    const val = m.value === "0" || !m.value ? null : Number(m.value);
    map[m.short] = val;
  }
  return map;
}

async function fetchStateRates(state: string, year: number): Promise<GsaCityRate[]> {
  const apiKey = process.env.GSA_API_KEY;
  const url = `${GSA_BASE}/rates/state/${state}/year/${year}${apiKey ? `?api_key=${apiKey}` : ""}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const results: GsaCityRate[] = [];

  for (const stateGroup of data.rates ?? []) {
    for (const r of stateGroup.rate ?? []) {
      const mieTotal: number = Number(r.total ?? r.meals ?? 0);
      if (!mieTotal) continue;

      const firstLast = Math.round(mieTotal * 0.75);
      const breakdown = getMieBreakdown(mieTotal);
      const lodging = parseLodgingByMonth(r.months?.month ?? []);

      results.push({
        city: r.city,
        state: stateGroup.state ?? state,
        fiscalYear: Number(stateGroup.year ?? year),
        lodgingJan: lodging["Jan"] ?? null,
        lodgingFeb: lodging["Feb"] ?? null,
        lodgingMar: lodging["Mar"] ?? null,
        lodgingApr: lodging["Apr"] ?? null,
        lodgingMay: lodging["May"] ?? null,
        lodgingJun: lodging["Jun"] ?? null,
        lodgingJul: lodging["Jul"] ?? null,
        lodgingAug: lodging["Aug"] ?? null,
        lodgingSep: lodging["Sep"] ?? null,
        lodgingOct: lodging["Oct"] ?? null,
        lodgingNov: lodging["Nov"] ?? null,
        lodgingDec: lodging["Dec"] ?? null,
        mieTotal,
        mieFirstLast: firstLast,
        mieBreakfast: breakdown.breakfast,
        mieLunch: breakdown.lunch,
        mieDinner: breakdown.dinner,
        mieIncidental: breakdown.incidentals,
      });
    }
  }
  return results;
}

export async function fetchAllGsaRates(year: number): Promise<GsaCityRate[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < US_STATES.length; i += 10) chunks.push(US_STATES.slice(i, i + 10));

  const all: GsaCityRate[] = [];
  for (const chunk of chunks) {
    const results = await Promise.all(chunk.map((s) => fetchStateRates(s, year)));
    results.forEach((r) => all.push(...r));
  }
  return all;
}
