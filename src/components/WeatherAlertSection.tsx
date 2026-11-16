import { AnimatePresence, motion } from 'motion/react';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Flame,
  RefreshCw,
  ShieldCheck,
  Snowflake,
  Sun,
  ThermometerSnowflake,
  ThermometerSun,
  Wind,
} from 'lucide-react';
import { useNepalWeather, WeatherConditionPreset } from '../hooks/useNepalWeather';
import { toDevanagari } from '../utils/nepaliDate';

function getConditionIcon(code: number) {
  if (code === 0) return Sun;
  if (code <= 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 71 && code <= 77) return Snowflake;
  if (code >= 95) return CloudLightning;
  if (code >= 51) return CloudRain;
  return CloudSun;
}

const PRESET_OPTIONS: Array<{ id: WeatherConditionPreset; label: string }> = [
  { id: 'seasonal', label: 'Seasonal' },
  { id: 'raining', label: 'Raining' },
  { id: 'heatwave', label: '38°C+ Heat' },
  { id: 'coldwave', label: '<10°C Cold' },
];

export function WeatherAlertSection() {
  const { cityId, cities, preset, weather, selectCity, selectPreset, refreshWeather } =
    useNepalWeather();

  const WeatherIcon = getConditionIcon(weather.weatherCode);
  const { alerts } = weather;
  const hasAnyAlert = Boolean(
    alerts.isHeatAlert || alerts.isColdAlert || alerts.isRainingAlert
  );

  return (
    <section
      style={{ boxShadow: 'var(--card-shadow)' }}
      aria-label="Private Nepal Weather and Temperature Alerts"
      className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 sm:p-5 space-y-3.5"
    >
      {/* Top Bar: City Selector + Offline Private Mode + Temp Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            style={{
              backgroundImage:
                'linear-gradient(135deg, var(--card-highlight-from), var(--card-highlight-via))',
            }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--accent-link)] border border-[var(--border-accent)]"
          >
            <WeatherIcon className="h-6 w-6" />
          </span>

          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] tabular-nums leading-none">
                {weather.temperature}°C
              </span>
              <span className="font-devanagari text-xs font-bold text-[var(--accent-secondary)]">
                {weather.conditionLabelNe} · {weather.conditionLabel}
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-1 tabular-nums flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[var(--text-secondary)]">
                {weather.locationNameEn} ({weather.locationNameNe})
              </span>
              <span aria-hidden="true">·</span>
              <span>
                H {weather.todayMax}° / L {weather.todayMin}°
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-0.5">
                <Droplets className="h-3 w-3 text-[var(--accent-link)]" />
                {weather.humidity}%
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-0.5">
                <Wind className="h-3 w-3 text-[var(--accent-link)]" />
                {weather.windSpeed} km/h
              </span>
              <span aria-hidden="true">·</span>
              <span>Rain {weather.precipProbability}%</span>
            </p>
          </div>
        </div>

        {/* City Picker & Private Condition Selector */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <select
            aria-label="Select Nepal city"
            value={cityId}
            onChange={(e) => selectCity(e.target.value)}
            className="h-11 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)] cursor-pointer"
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn} ({c.nameNe})
              </option>
            ))}
          </select>

          <select
            aria-label="Local weather condition mode"
            value={preset}
            onChange={(e) => selectPreset(e.target.value as WeatherConditionPreset)}
            className="h-11 px-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)] cursor-pointer"
          >
            {PRESET_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={refreshWeather}
            title="Recalculate local weather"
            aria-label="Recalculate local weather"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] hover:bg-[var(--accent-soft-bg)] text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Explicit Alert Threshold Banners: Heat >=38°C, Cold <10°C, Rain Alert */}
      <AnimatePresence initial={false}>
        {hasAnyAlert && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5"
          >
            {alerts.isHeatAlert && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FFF1F2] border border-[#FDA4AF] text-[#881337] dark:bg-[#4C0519]/90 dark:border-[#FB7185]/60 dark:text-[#FFE4E6]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFE4E6] text-[#BE123C] dark:bg-[#881337] dark:text-[#FDA4AF]">
                  {weather.temperature >= 40 ? (
                    <Flame className="h-4 w-4" />
                  ) : (
                    <ThermometerSun className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold leading-tight">
                    Extreme Heat Alert · {toDevanagari(38)}°C+ उच्च तापक्रम
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5 tabular-nums leading-snug">
                    Peak {Math.max(weather.temperature, weather.todayMax)}°C today. Stay hydrated & limit midday sun exposure.
                  </p>
                </div>
              </div>
            )}

            {alerts.isColdAlert && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#ECFEFF] border border-[#67E8F9] text-[#164E63] dark:bg-[#083344]/90 dark:border-[#22D3EE]/50 dark:text-[#CFFAFE]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#CFFAFE] text-[#0E7490] dark:bg-[#155E75] dark:text-[#A5F3FC]">
                  <ThermometerSnowflake className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold leading-tight">
                    Cold Wave Alert · {toDevanagari(10)}°C भन्दा कम चिसो
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5 tabular-nums leading-snug">
                    Low {Math.min(weather.temperature, weather.todayMin)}°C detected. Wear warm layers in morning & night.
                  </p>
                </div>
              </div>
            )}

            {alerts.isRainingAlert && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#EFF6FF] border border-[#93C5FD] text-[#1E3A8A] dark:bg-[#172554]/90 dark:border-[#60A5FA]/50 dark:text-[#DBEAFE]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#DBEAFE] text-[#1D4ED8] dark:bg-[#1E40AF] dark:text-[#BFDBFE]">
                  <CloudRain className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold leading-tight">
                    {alerts.isActiveRainNow ? 'Raining Now · वर्षा भइरहेको छ' : 'Rain Alert · वर्षा सम्भावना'}
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5 tabular-nums leading-snug">
                    {weather.precipitationMm > 0 ? `${weather.precipitationMm} mm rainfall · ` : ''}
                    {weather.precipProbability}% chance today. Carry an umbrella.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calm Normal Weather Confirmation Row when no threshold alert is active */}
      {!hasAnyAlert && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-soft)] text-[11px] text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Private Offline Forecast · Comfortable ({weather.todayMin}°C – {weather.todayMax}°C)
          </span>
          <span className="hidden sm:inline text-[var(--text-muted)] tabular-nums">
            Feels like {weather.apparentTemp}°C
          </span>
        </div>
      )}
    </section>
  );
}
