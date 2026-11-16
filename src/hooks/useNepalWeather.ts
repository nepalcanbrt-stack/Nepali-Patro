import { useCallback, useEffect, useState } from 'react';
import { getNepalNow } from '../utils/nepaliDate';

export interface NepalCity {
  id: string;
  nameEn: string;
  nameNe: string;
  /** Baseline monthly [avgMinC, avgMaxC, rainRiskPct] for Nepal climate */
  regionZone: 'valley' | 'terai' | 'hill';
}

export const NEPAL_CITIES: NepalCity[] = [
  { id: 'kathmandu', nameEn: 'Kathmandu', nameNe: 'काठमाडौँ', regionZone: 'valley' },
  { id: 'biratnagar', nameEn: 'Biratnagar', nameNe: 'विराटनगर', regionZone: 'terai' },
  { id: 'pokhara', nameEn: 'Pokhara', nameNe: 'पोखरा', regionZone: 'hill' },
  { id: 'lalitpur', nameEn: 'Lalitpur', nameNe: 'ललितपुर', regionZone: 'valley' },
  { id: 'janakpur', nameEn: 'Janakpur', nameNe: 'जनकपुर', regionZone: 'terai' },
  { id: 'bharatpur', nameEn: 'Bharatpur', nameNe: 'भरतपुर', regionZone: 'terai' },
  { id: 'birgunj', nameEn: 'Birgunj', nameNe: 'वीरगञ्ज', regionZone: 'terai' },
  { id: 'butwal', nameEn: 'Butwal', nameNe: 'बुटवल', regionZone: 'terai' },
  { id: 'dharan', nameEn: 'Dharan', nameNe: 'धरान', regionZone: 'hill' },
  { id: 'nepalgunj', nameEn: 'Nepalgunj', nameNe: 'नेपालगञ्ज', regionZone: 'terai' },
  { id: 'dhangadhi', nameEn: 'Dhangadhi', nameNe: 'धनगढी', regionZone: 'terai' },
];

export type WeatherConditionPreset = 'seasonal' | 'raining' | 'heatwave' | 'coldwave';

export interface WeatherAlertFlags {
  isRainingAlert: boolean;
  isHeatAlert: boolean;
  isColdAlert: boolean;
  isActiveRainNow: boolean;
}

export interface NepalWeatherData {
  locationNameEn: string;
  locationNameNe: string;
  temperature: number;
  apparentTemp: number;
  todayMax: number;
  todayMin: number;
  humidity: number;
  windSpeed: number;
  precipitationMm: number;
  precipProbability: number;
  weatherCode: number;
  conditionLabel: string;
  conditionLabelNe: string;
  preset: WeatherConditionPreset;
  alerts: WeatherAlertFlags;
}

const CITY_STORAGE_KEY = 'nepal_patro_weather_city_v1';
const PRESET_STORAGE_KEY = 'nepal_patro_weather_preset_v1';

// Monthly [minC, maxC, rainProbability%] climatology baselines by Nepal zone (Jan..Dec)
const ZONE_CLIMATE: Record<NepalCity['regionZone'], Array<[number, number, number]>> = {
  valley: [
    [3, 18, 12], [5, 20, 15], [9, 24, 20], [12, 28, 28], [16, 29, 45], [19, 29, 72],
    [20, 28, 82], [20, 28, 80], [18, 27, 60], [13, 25, 22], [8, 22, 10], [4, 19, 8],
  ],
  hill: [
    [6, 19, 15], [8, 21, 18], [12, 26, 25], [16, 29, 35], [18, 30, 55], [21, 30, 82],
    [22, 29, 88], [22, 29, 86], [20, 28, 68], [15, 26, 28], [10, 22, 12], [7, 20, 10],
  ],
  terai: [
    [8, 22, 12], [11, 26, 14], [16, 32, 18], [21, 37, 22], [25, 39, 38], [26, 37, 68],
    [26, 35, 80], [26, 35, 75], [25, 34, 58], [20, 32, 20], [14, 28, 8], [9, 23, 8],
  ],
};

function buildPrivateLocalWeather(
  city: NepalCity,
  preset: WeatherConditionPreset
): NepalWeatherData {
  const nst = getNepalNow(Date.now());
  const [baseMin, baseMax, baseRainProb] = ZONE_CLIMATE[city.regionZone][nst.month - 1] ?? [10, 24, 15];

  // Smooth diurnal curve between 05:00 min and 14:30 max
  const hourFloat = nst.hours + nst.minutes / 60;
  const diurnalFactor = Math.max(0, Math.sin(((hourFloat - 6) / 16) * Math.PI));

  let todayMin = baseMin;
  let todayMax = baseMax;
  let temperature = Math.round((todayMin + (todayMax - todayMin) * diurnalFactor) * 10) / 10;
  let precipProbability = baseRainProb;
  let precipitationMm = 0;
  let weatherCode = precipProbability >= 50 ? 61 : precipProbability >= 30 ? 2 : 0;
  let humidity = city.regionZone === 'terai' ? 58 : 54;
  let windSpeed = 8;
  let conditionLabel = weatherCode === 0 ? 'Clear Sky' : weatherCode === 2 ? 'Partly Cloudy' : 'Seasonal Rain Risk';
  let conditionLabelNe = weatherCode === 0 ? 'सफा आकाश' : weatherCode === 2 ? 'आंशिक बदली' : 'वर्षा सम्भावना';

  if (preset === 'raining') {
    precipitationMm = 14.5;
    precipProbability = 85;
    weatherCode = 63;
    humidity = 88;
    windSpeed = 16;
    conditionLabel = 'Rainy / Showers';
    conditionLabelNe = 'वर्षा भइरहेको छ';
  } else if (preset === 'heatwave') {
    todayMax = 40.5;
    todayMin = 27.0;
    temperature = 39.2;
    precipProbability = 10;
    humidity = 38;
    weatherCode = 0;
    conditionLabel = 'Extreme Heat';
    conditionLabelNe = 'अत्यधिक गर्मी';
  } else if (preset === 'coldwave') {
    todayMin = 4.5;
    todayMax = 13.0;
    temperature = 7.8;
    precipProbability = 15;
    humidity = 76;
    weatherCode = 45;
    conditionLabel = 'Cold Wave / Fog';
    conditionLabelNe = 'शितलहर / चिसो';
  }

  const isActiveRainNow = precipitationMm > 0 || weatherCode >= 51;
  const isRainingAlert = isActiveRainNow || precipProbability >= 50;
  const isHeatAlert = temperature >= 38 || todayMax >= 38;
  const isColdAlert = temperature < 10 || todayMin < 10;

  return {
    locationNameEn: city.nameEn,
    locationNameNe: city.nameNe,
    temperature,
    apparentTemp: Math.round((temperature + (isHeatAlert ? 2 : isColdAlert ? -1.5 : 0)) * 10) / 10,
    todayMax,
    todayMin,
    humidity,
    windSpeed,
    precipitationMm,
    precipProbability,
    weatherCode,
    conditionLabel,
    conditionLabelNe,
    preset,
    alerts: {
      isRainingAlert,
      isHeatAlert,
      isColdAlert,
      isActiveRainNow,
    },
  };
}

export function useNepalWeather() {
  const [cityId, setCityId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(CITY_STORAGE_KEY);
      if (saved && NEPAL_CITIES.some((c) => c.id === saved)) return saved;
    } catch {
      // Ignore storage error
    }
    return 'kathmandu';
  });

  const [preset, setPreset] = useState<WeatherConditionPreset>(() => {
    try {
      const saved = localStorage.getItem(PRESET_STORAGE_KEY);
      if (
        saved === 'seasonal' ||
        saved === 'raining' ||
        saved === 'heatwave' ||
        saved === 'coldwave'
      ) {
        return saved;
      }
    } catch {
      // Ignore
    }
    return 'seasonal';
  });

  const selectedCity = NEPAL_CITIES.find((c) => c.id === cityId) ?? NEPAL_CITIES[0];
  const [weather, setWeather] = useState<NepalWeatherData>(() =>
    buildPrivateLocalWeather(selectedCity, preset)
  );

  const selectCity = useCallback((id: string) => {
    setCityId(id);
    try {
      localStorage.setItem(CITY_STORAGE_KEY, id);
    } catch {
      // Ignore
    }
  }, []);

  const selectPreset = useCallback((nextPreset: WeatherConditionPreset) => {
    setPreset(nextPreset);
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, nextPreset);
    } catch {
      // Ignore
    }
  }, []);

  const refreshWeather = useCallback(() => {
    setWeather(buildPrivateLocalWeather(selectedCity, preset));
  }, [selectedCity, preset]);

  useEffect(() => {
    refreshWeather();
    const interval = window.setInterval(refreshWeather, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [refreshWeather]);

  return {
    cityId,
    cities: NEPAL_CITIES,
    preset,
    weather,
    selectCity,
    selectPreset,
    refreshWeather,
  };
}
