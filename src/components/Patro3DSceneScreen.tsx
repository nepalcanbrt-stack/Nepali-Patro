import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  ChevronUp,
  Layers,
  Moon,
  RotateCw,
  Sun,
  Sunrise,
} from 'lucide-react';
import { NepalTimeState } from '../hooks/useNepalTime';
import { formatBsDateNe } from '../utils/nepaliDate';
import {
  createSanctuaryScene,
  SanctuaryCameraPreset,
  SanctuaryController,
  SanctuaryInspectInfo,
  SanctuaryTimeOfDay,
} from '../utils/threeSanctuaryScene';

interface Patro3DSceneScreenProps {
  nepalTime: NepalTimeState;
  onBack: () => void;
}

const CAMERA_OPTIONS: Array<{ id: SanctuaryCameraPreset; label: string }> = [
  { id: 'courtyard', label: 'Courtyard' },
  { id: 'eyes', label: 'Wisdom Eyes' },
  { id: 'wheels', label: 'Prayer Wheels' },
  { id: 'mandala', label: 'Aerial Mandala' },
];

const ATMO_OPTIONS: Array<{ id: SanctuaryTimeOfDay; label: string; icon: typeof Sunrise }> = [
  { id: 'dawn', label: 'Dawn', icon: Sunrise },
  { id: 'day', label: 'Daylight', icon: Sun },
  { id: 'night', label: 'Evening Diyo', icon: Moon },
];

export function Patro3DSceneScreen({ nepalTime, onBack }: Patro3DSceneScreenProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<SanctuaryController | null>(null);

  const [dockOpen, setDockOpen] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<SanctuaryCameraPreset>('courtyard');
  const [timeOfDay, setTimeOfDay] = useState<SanctuaryTimeOfDay>('dawn');
  const [explodeAmount, setExplodeAmount] = useState(0);
  const [inspected, setInspected] = useState<SanctuaryInspectInfo>({
    title: 'Mahachaitya 3D Sanctuary · नेपाली मन्दिर',
    subtitle: 'Drag to orbit · Pinch/Scroll to zoom · Tap Stupa, Prayer Wheels or Diyo',
    detail: '11-part procedural Stupa, spinning Mani wheels, Diyo lamps & Lungta flags.',
  });

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const controller = createSanctuaryScene(mount, (info) => {
      setInspected(info);
    });
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setDockOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const bsDateText = formatBsDateNe(nepalTime.todayBs);

  return (
    <div className="fixed inset-0 z-50 bg-[#120e1c] overflow-hidden select-none">
      {/* Dedicated Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Minimal Top-Left Navigation & Date Badge (Solid/rgba, no backdrop-filter over WebGL) */}
      <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-10 flex items-center gap-2 max-w-[calc(100vw-24px)]">
        <button
          type="button"
          onClick={onBack}
          className="h-10 px-3.5 rounded-full bg-[rgba(18,14,28,0.88)] hover:bg-[rgba(34,26,52,0.95)] border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patro
        </button>

        <div className="hidden sm:flex items-center gap-2.5 h-10 px-4 rounded-full bg-[rgba(18,14,28,0.84)] border border-white/15 text-xs text-white/90">
          <span className="font-devanagari font-bold text-[#FCD34D]">{bsDateText}</span>
          <span aria-hidden="true" className="text-white/35">·</span>
          <span className="font-semibold text-white">3D Sacred Sanctuary</span>
        </div>
      </div>

      {/* Collapsible Unified Bottom Control Dock */}
      <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-10 w-[min(880px,94vw)] flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockOpen((prev) => !prev)}
          aria-expanded={dockOpen}
          className="mb-1.5 h-7 px-3.5 rounded-full bg-[rgba(18,14,28,0.88)] hover:bg-[rgba(34,26,52,0.95)] border border-white/15 text-[11px] font-bold text-white/90 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
        >
          {dockOpen ? (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Hide Controls (H)
            </>
          ) : (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Show Controls (H)
            </>
          )}
        </button>

        {dockOpen && (
          <div className="w-full rounded-2xl bg-[rgba(18,14,28,0.90)] border border-white/15 p-3 sm:px-4 sm:py-3 text-white shadow-2xl space-y-2.5">
            {/* Compact Selected Architecture Callout */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#FCD34D] truncate">{inspected.title}</p>
                <p className="text-[11px] text-white/75 truncate">{inspected.detail}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => controllerRef.current?.triggerWheelSpinBoost()}
                  className="h-8 px-2.5 rounded-lg bg-[#9F1239] hover:bg-[#BE123C] text-[11px] font-bold text-white flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Spin Wheels
                </button>
                <button
                  type="button"
                  onClick={() => controllerRef.current?.playBellChime(432)}
                  className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors"
                >
                  <Bell className="h-3.5 w-3.5 text-[#FCD34D]" />
                  Chime
                </button>
              </div>
            </div>

            {/* Single-Row Consolidated Camera, Lighting & Exploded Layers */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Camera Views */}
              <div className="flex items-center gap-1 flex-wrap">
                {CAMERA_OPTIONS.map((cam) => {
                  const active = cameraPreset === cam.id;
                  return (
                    <button
                      key={cam.id}
                      type="button"
                      onClick={() => {
                        setCameraPreset(cam.id);
                        controllerRef.current?.setCameraPreset(cam.id);
                      }}
                      className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#7C3AED] text-white'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {cam.label}
                    </button>
                  );
                })}
              </div>

              {/* Atmosphere Lighting Presets */}
              <div className="flex items-center gap-1">
                {ATMO_OPTIONS.map((atmo) => {
                  const Icon = atmo.icon;
                  const active = timeOfDay === atmo.id;
                  return (
                    <button
                      key={atmo.id}
                      type="button"
                      onClick={() => {
                        setTimeOfDay(atmo.id);
                        controllerRef.current?.setTimeOfDay(atmo.id);
                      }}
                      className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#D97706] text-white'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {atmo.label}
                    </button>
                  );
                })}
              </div>

              {/* Stupa Tiers Explode Slider */}
              <label className="flex items-center gap-2 text-[11px] font-semibold text-white/85 shrink-0">
                <Layers className="h-3.5 w-3.5 text-[#FCD34D]" />
                <span>Layers</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(explodeAmount * 100)}
                  onChange={(e) => {
                    const val = Number(e.target.value) / 100;
                    setExplodeAmount(val);
                    controllerRef.current?.setExplodeAmount(val);
                  }}
                  className="w-20 sm:w-24 accent-[#F59E0B] cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
