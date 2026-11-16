import { toDevanagari } from './nepaliDate';

export interface PanchangData {
  tithiNumber: number; // 1..30
  pakshaNe: 'शुक्ल पक्ष' | 'कृष्ण पक्ष';
  pakshaEn: 'Shukla Paksha' | 'Krishna Paksha';
  tithiNe: string;
  tithiEn: string;
  fullTithiNe: string;
  nakshatraNe: string;
  nakshatraEn: string;
  yogaNe: string;
  yogaEn: string;
  karanaNe: string;
  karanaEn: string;
  chandraRashiNe: string;
  chandraRashiEn: string;
  suryaRashiNe: string;
  sunrise: string;
  sunset: string;
  sunriseNe: string;
  sunsetNe: string;
  abhijitMuhurat: string;
  rahuKaal: string;
  yamaganda: string;
  gulikaKaal: string;
  moonIllumination: number; // 0..100
  moonPhaseLabel: string;
  seasonNe: string;
  seasonEn: string;
}

export interface RashiForecast {
  id: string;
  nameNe: string;
  nameEn: string;
  symbol: string;
  element: string;
  prediction: string;
  luckyColor: string;
  luckyNumber: number;
  rating: number; // 1..5
}

const TITHI_NAMES_NE = [
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी',
  'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
  'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा',
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी',
  'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
  'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'औंशी',
] as const;

const TITHI_NAMES_EN = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Aunsi',
] as const;

const NAKSHATRAS_NE = [
  'अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा',
  'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा', 'पूर्वाफाल्गुनी', 'उत्तराफाल्गुनी',
  'हस्त', 'चित्रा', 'स्वाती', 'विशाखा', 'अनुराधा', 'ज्येष्ठा',
  'मूल', 'पूर्वाषाढा', 'उत्तराषाढा', 'श्रवण', 'धनिष्ठा', 'शतभिषा',
  'पूर्वभाद्रपद', 'उत्तरभाद्रपद', 'रेवती',
] as const;

const NAKSHATRAS_EN = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

const YOGAS_NE = [
  'विष्कुम्भ', 'प्रीति', 'आयुष्मान्', 'सौभाग्य', 'शोभन', 'अतिगण्ड',
  'सुकर्मा', 'धृति', 'शूल', 'गण्ड', 'वृद्धि', 'ध्रुव',
  'व्याघात', 'हर्षण', 'वज्र', 'सिद्धि', 'व्यतिपात', 'वरियान्',
  'परिघ', 'शिव', 'सिद्ध', 'साध्य', 'शुभ', 'शुक्ल',
  'ब्रह्म', 'इन्द्र', 'वैधृति',
] as const;

const YOGAS_EN = [
  'Vishkumbha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
  'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva',
  'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan',
  'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla',
  'Brahma', 'Indra', 'Vaidhriti',
] as const;

const KARANAS_NE = ['बव', 'बालव', 'कौलव', 'तैतिल', 'गर', 'वणिज', 'विष्टि'] as const;
const KARANAS_EN = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'] as const;

const RASHIS_NE = [
  'मेष', 'वृष', 'मिथुन', 'कर्कट', 'सिंह', 'कन्या',
  'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन',
] as const;

const RASHIS_EN = [
  'Mesha (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karkata (Cancer)',
  'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrishchika (Scorpio)',
  'Dhanu (Sagittarius)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)',
] as const;

const RASHIS_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'] as const;

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function normalizeDeg(deg: number): number {
  const m = deg % 360;
  return m < 0 ? m + 360 : m;
}

function formatMinutesAsTime(totalMinutes: number, useDevanagari = false): string {
  const mins = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const str = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  if (!useDevanagari) return str;
  const periodNe = h24 >= 12 ? 'अपराह्न' : 'बिहान';
  return `${toDevanagari(String(h12).padStart(2, '0'))}:${toDevanagari(String(m).padStart(2, '0'))} ${periodNe}`;
}

function computeKathmanduSunTimes(adYear: number, adMonth: number, adDay: number) {
  // Kathmandu: 27.7172° N, 85.3240° E, UTC+5:45 (345 mins)
  const lat = 27.7172 * DEG2RAD;
  const lon = 85.3240;
  const utcDay = Date.UTC(adYear, adMonth - 1, adDay);
  const jan1 = Date.UTC(adYear, 0, 1);
  const dayOfYear = Math.floor((utcDay - jan1) / 86_400_000) + 1;

  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const zenith = 90.833 * DEG2RAD;
  const cosH =
    Math.cos(zenith) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl);
  const clampedCosH = Math.max(-1, Math.min(1, cosH));
  const hourAngleDeg = Math.acos(clampedCosH) * RAD2DEG;

  const solarNoonMin = 720 - 4 * lon - eqTime + 345;
  const sunriseMin = solarNoonMin - 4 * hourAngleDeg;
  const sunsetMin = solarNoonMin + 4 * hourAngleDeg;

  return { sunriseMin, sunsetMin, solarNoonMin };
}

export function calculatePanchang(adYear: number, adMonth: number, adDay: number, weekday: number): PanchangData {
  // Evaluate astronomical longitudes around Kathmandu sunrise (06:15 NST = 00:30 UTC)
  const utcMs = Date.UTC(adYear, adMonth - 1, adDay, 0, 30, 0);
  const jd = utcMs / 86_400_000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;

  const M = normalizeDeg(357.52911 + 35999.05029 * T);
  const L0 = normalizeDeg(280.46646 + 36000.76983 * T);
  const C = 1.914602 * Math.sin(M * DEG2RAD) + 0.019993 * Math.sin(2 * M * DEG2RAD);
  const sunLon = normalizeDeg(L0 + C);

  const Lm = normalizeDeg(218.3164477 + 481267.88123421 * T);
  const Mm = normalizeDeg(134.9633964 + 477198.8675055 * T);
  const D = normalizeDeg(297.8501921 + 445267.1114034 * T);
  const moonLon = normalizeDeg(
    Lm +
      6.289 * Math.sin(Mm * DEG2RAD) +
      1.274 * Math.sin((2 * D - Mm) * DEG2RAD) +
      0.658 * Math.sin(2 * D * DEG2RAD)
  );

  // Lahiri Ayanamsa (~24.22 deg in 2026)
  const ayanamsa = 23.85 + 0.01396 * (adYear + adMonth / 12 - 2000);
  const nirayanaSun = normalizeDeg(sunLon - ayanamsa);
  const nirayanaMoon = normalizeDeg(moonLon - ayanamsa);

  // Tithi (1..30)
  const elongation = normalizeDeg(moonLon - sunLon);
  const tithiIdx = Math.floor(elongation / 12); // 0..29
  const tithiNumber = tithiIdx + 1;
  const isShukla = tithiIdx < 15;
  const pakshaNe = isShukla ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष';
  const pakshaEn = isShukla ? 'Shukla Paksha' : 'Krishna Paksha';
  const tithiNe = TITHI_NAMES_NE[tithiIdx];
  const tithiEn = TITHI_NAMES_EN[tithiIdx];
  const pakshaShortNe = isShukla ? 'शुक्ल' : 'कृष्ण';
  const fullTithiNe =
    tithiNumber === 15 || tithiNumber === 30 ? tithiNe : `${pakshaShortNe} ${tithiNe}`;

  // Nakshatra (27 divisions of 13°20')
  const nakIdx = Math.floor(nirayanaMoon / (360 / 27)) % 27;
  const nakshatraNe = NAKSHATRAS_NE[nakIdx];
  const nakshatraEn = NAKSHATRAS_EN[nakIdx];

  // Yoga (27 divisions of (nirayanaSun + nirayanaMoon))
  const yogaIdx = Math.floor(normalizeDeg(nirayanaSun + nirayanaMoon) / (360 / 27)) % 27;
  const yogaNe = YOGAS_NE[yogaIdx];
  const yogaEn = YOGAS_EN[yogaIdx];

  // Karana (half-tithis, 60 in lunar month)
  const halfTithi = Math.floor(elongation / 6); // 0..59
  let karanaNe = 'बव';
  let karanaEn = 'Bava';
  if (halfTithi === 0) {
    karanaNe = 'किंस्तुघ्न';
    karanaEn = 'Kimstughna';
  } else if (halfTithi === 57) {
    karanaNe = 'शकुनि';
    karanaEn = 'Shakuni';
  } else if (halfTithi === 58) {
    karanaNe = 'चतुष्पद';
    karanaEn = 'Chatushpada';
  } else if (halfTithi === 59) {
    karanaNe = 'नाग';
    karanaEn = 'Naga';
  } else {
    const kIdx = (halfTithi - 1) % 7;
    karanaNe = KARANAS_NE[kIdx];
    karanaEn = KARANAS_EN[kIdx];
  }

  // Rashis
  const chandraIdx = Math.floor(nirayanaMoon / 30) % 12;
  const suryaIdx = Math.floor(nirayanaSun / 30) % 12;

  // Illumination & Phase Label
  const moonIllumination = Math.round(((1 - Math.cos(elongation * DEG2RAD)) / 2) * 100);
  let moonPhaseLabel = 'Waxing Crescent';
  if (elongation < 12 || elongation > 348) moonPhaseLabel = 'New Moon (औंशी)';
  else if (elongation < 80) moonPhaseLabel = 'Waxing Crescent';
  else if (elongation < 100) moonPhaseLabel = 'First Quarter';
  else if (elongation < 168) moonPhaseLabel = 'Waxing Gibbous';
  else if (elongation < 192) moonPhaseLabel = 'Full Moon (पूर्णिमा)';
  else if (elongation < 260) moonPhaseLabel = 'Waning Gibbous';
  else if (elongation < 280) moonPhaseLabel = 'Last Quarter';
  else moonPhaseLabel = 'Waning Crescent';

  // Sun times & 8-part daytime muhurats
  const { sunriseMin, sunsetMin, solarNoonMin } = computeKathmanduSunTimes(adYear, adMonth, adDay);
  const partMin = (sunsetMin - sunriseMin) / 8;

  // Weekday Rahu, Yamaganda, Gulika segments (0=Sun..6=Sat, 1-indexed 8th parts)
  const rahuSlot = [8, 2, 7, 5, 6, 4, 3][weekday] ?? 2;
  const yamaSlot = [5, 4, 3, 2, 1, 7, 6][weekday] ?? 4;
  const gulikaSlot = [7, 6, 5, 4, 3, 2, 1][weekday] ?? 6;

  const formatRange = (slot: number) => {
    const s = sunriseMin + (slot - 1) * partMin;
    const e = s + partMin;
    return `${formatMinutesAsTime(s)} – ${formatMinutesAsTime(e)}`;
  };

  const abhijitHalf = (sunsetMin - sunriseMin) / 30;
  const abhijitMuhurat = `${formatMinutesAsTime(solarNoonMin - abhijitHalf)} – ${formatMinutesAsTime(
    solarNoonMin + abhijitHalf
  )}`;

  // Nepali Ritu (6 Seasons based on Surya Rashi / BS cycle)
  const seasonList: Array<[string, string]> = [
    ['वसन्त ऋतु', 'Basanta (Spring)'],
    ['ग्रीष्म ऋतु', 'Grishma (Summer)'],
    ['वर्षा ऋतु', 'Barsha (Monsoon)'],
    ['शरद् ऋतु', 'Sharad (Autumn)'],
    ['हेमन्त ऋतु', 'Hemanta (Pre-Winter)'],
    ['शिशिर ऋतु', 'Shishira (Winter)'],
  ];
  const rituIdx = Math.floor(((suryaIdx + 12) % 12) / 2);
  const [seasonNe, seasonEn] = seasonList[rituIdx] ?? seasonList[3];

  return {
    tithiNumber,
    pakshaNe,
    pakshaEn,
    tithiNe,
    tithiEn,
    fullTithiNe,
    nakshatraNe,
    nakshatraEn,
    yogaNe,
    yogaEn,
    karanaNe,
    karanaEn,
    chandraRashiNe: RASHIS_NE[chandraIdx],
    chandraRashiEn: RASHIS_EN[chandraIdx],
    suryaRashiNe: RASHIS_NE[suryaIdx],
    sunrise: formatMinutesAsTime(sunriseMin),
    sunset: formatMinutesAsTime(sunsetMin),
    sunriseNe: formatMinutesAsTime(sunriseMin, true),
    sunsetNe: formatMinutesAsTime(sunsetMin, true),
    abhijitMuhurat,
    rahuKaal: formatRange(rahuSlot),
    yamaganda: formatRange(yamaSlot),
    gulikaKaal: formatRange(gulikaSlot),
    moonIllumination,
    moonPhaseLabel,
    seasonNe,
    seasonEn,
  };
}

const FORECAST_TEMPLATES = [
  'Creative energy flows effortlessly today. Ideal for initiating collaborative discussions and completing pending family plans.',
  'Financial prudence brings clarity. Take time in the afternoon to review budgets and connect with trusted mentors.',
  'Warm moments with loved ones uplift your spirit. A short evening walk brings fresh perspective on a recent decision.',
  'Focus and calm discipline yield tangible progress at work or study. Avoid rushing into unverified commitments.',
  'Auspicious alignment supports travel, learning, and spiritual reflection. Express gratitude toward elders today.',
  'Diplomatic communication resolves lingering misunderstandings. Evening hours favor rest, music, and home harmony.',
  'New opportunities emerge through community ties. Stay adaptable and trust your steady preparation.',
  'Inner balance strengthens resilience today. Prioritize healthy nourishment and clear boundaries around your schedule.',
  'Optimism attracts helpful allies. Great day for writing, teaching, or organizing creative projects.',
  'Patient persistence pays off in career matters. Dedicate time in the morning to your most meaningful goal.',
  'Social invitations or meaningful conversations brighten the day. Share your insights with generosity.',
  'Reflective calm helps you spot subtle opportunities others miss. Trust steady intuition over haste.',
];

const LUCKY_COLORS = [
  'Crimson', 'Saffron', 'Pearl White', 'Emerald', 'Lavender', 'Sky Blue',
  'Warm Gold', 'Rosewood', 'Indigo', 'Ivory', 'Copper', 'Plum',
];

export function getDailyRashifal(adYear: number, adMonth: number, adDay: number): RashiForecast[] {
  const seed = adYear * 372 + adMonth * 31 + adDay;
  return RASHIS_NE.map((nameNe, idx) => {
    const hash = (seed + idx * 7) % FORECAST_TEMPLATES.length;
    const colorHash = (seed + idx * 3) % LUCKY_COLORS.length;
    const rating = 3 + ((seed + idx * 5) % 3);
    const luckyNumber = 1 + ((seed + idx * 11) % 9);
    const elements = ['Fire', 'Earth', 'Air', 'Water'];
    return {
      id: RASHIS_EN[idx].split(' ')[0].toLowerCase(),
      nameNe,
      nameEn: RASHIS_EN[idx],
      symbol: RASHIS_SYMBOLS[idx],
      element: elements[idx % 4],
      prediction: FORECAST_TEMPLATES[hash],
      luckyColor: LUCKY_COLORS[colorHash],
      luckyNumber,
      rating,
    };
  });
}
