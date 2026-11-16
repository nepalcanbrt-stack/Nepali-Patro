import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  BookmarkPlus,
  Check,
  Compass,
  ExternalLink,
  Globe,
  Info,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  Navigation,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { NepalTimeState } from '../hooks/useNepalTime';
import { UserNote } from '../types/app';
import { IconThemeId } from '../types/theme';
import { formatAdDateShort, formatBsDateNe, getWeekdayNameNe } from '../utils/nepaliDate';
import { evaluateSubhaSaait, resolvePrivateDailyRashifal } from '../utils/panchang';
import { staggerCardVariants, staggerContainerVariants } from '../utils/motionVariants';
import { PatroThemedIcon } from './NepaliIcons';

interface PatroAssistantScreenProps {
  nepalTime: NepalTimeState;
  preferredRashi: string;
  iconTheme: IconThemeId;
  onAddNote: (note: Omit<UserNote, 'id' | 'createdAt'>) => Promise<unknown>;
}

type StudioTab = 'voice' | 'search' | 'maps';

interface TranscriptLine {
  id: string;
  speaker: 'you' | 'guru';
  text: string;
}

interface SearchSource {
  title: string;
  uri: string;
}

interface MapsPlace {
  title: string;
  uri: string;
  placeId?: string;
  reviewSnippets: string[];
}

const VOICE_OPTIONS = [
  { id: 'Zephyr', label: 'Zephyr (Calm & Warm)' },
  { id: 'Kore', label: 'Kore (Clear & Bright)' },
  { id: 'Puck', label: 'Puck (Conversational)' },
  { id: 'Charon', label: 'Charon (Deep & Steady)' },
  { id: 'Fenrir', label: 'Fenrir (Expressive)' },
];

const NEPAL_HUBS = [
  { label: 'Kathmandu', lat: 27.7172, lng: 85.324 },
  { label: 'Patan / Lalitpur', lat: 27.6644, lng: 85.3188 },
  { label: 'Bhaktapur', lat: 27.671, lng: 85.4298 },
  { label: 'Pokhara', lat: 28.2096, lng: 83.9856 },
  { label: 'Lumbini', lat: 27.4698, lng: 83.2757 },
  { label: 'Janakpur', lat: 26.7288, lng: 85.9263 },
];

function float32ToBase64Pcm16(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function safeExternalHref(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function base64Pcm16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

export function PatroAssistantScreen({
  nepalTime,
  preferredRashi,
  iconTheme,
  onAddNote,
}: PatroAssistantScreenProps) {
  const isNativeCapacitor = Boolean(
    typeof window !== 'undefined' &&
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  );
  const [activeTab, setActiveTab] = useState<StudioTab>('voice');

  const { todayBs, todayAd, panchang, hours, minutes } = nepalTime;
  const subha = useMemo(
    () => evaluateSubhaSaait(todayBs, panchang, hours, minutes),
    [todayBs, panchang, hours, minutes]
  );
  const rashiObj = useMemo(
    () => resolvePrivateDailyRashifal(preferredRashi, todayAd.year, todayAd.month, todayAd.day),
    [preferredRashi, todayAd.year, todayAd.month, todayAd.day]
  );

  const patroContext = useMemo(() => {
    return [
      `Today BS: ${formatBsDateNe(todayBs)} (${todayBs.year}-${String(todayBs.month).padStart(2, '0')}-${String(todayBs.day).padStart(2, '0')})`,
      `Today AD: ${formatAdDateShort(todayAd)}`,
      `Weekday: ${getWeekdayNameNe(todayBs.weekday)}`,
      `Tithi: ${panchang.fullTithiNe} (${panchang.tithiEn})`,
      `Nakshatra: ${panchang.nakshatraNe} · Yoga: ${panchang.yogaNe}`,
      `Subha Saait Status: ${subha.badgeTextEn} (${subha.windowEn})`,
      `User Rashi: ${rashiObj.nameEn} (${rashiObj.nameNe})`,
    ].join('\n');
  }, [todayBs, todayAd, panchang, subha, rashiObj]);

  // =========================================================
  // 1. LIVE VOICE CONVERSATION STATE (gemini-3.8-live)
  // =========================================================
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const micMutedRef = useRef(false);
  const voiceStatusRef = useRef<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    micMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    voiceStatusRef.current = voiceStatus;
  }, [voiceStatus]);

  const stopPlaybackQueue = () => {
    scheduledSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // ignore already stopped
      }
    });
    scheduledSourcesRef.current.clear();
    if (outputCtxRef.current) {
      nextPlayTimeRef.current = outputCtxRef.current.currentTime;
    } else {
      nextPlayTimeRef.current = 0;
    }
  };

  const stopVoiceSession = () => {
    stopPlaybackQueue();
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputCtxRef.current) {
      void inputCtxRef.current.close().catch(() => {});
      inputCtxRef.current = null;
    }
    if (outputCtxRef.current) {
      void outputCtxRef.current.close().catch(() => {});
      outputCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setVoiceStatus('idle');
    setIsMicMuted(false);
  };

  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appendTranscript = (speaker: 'you' | 'guru', deltaText: string) => {
    const clean = deltaText;
    if (!clean) return;
    setTranscripts((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.speaker === speaker) {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...last,
          text: `${last.text}${clean}`,
        };
        return updated;
      }
      return [
        ...prev.slice(-15),
        { id: `${Date.now()}-${Math.random()}`, speaker, text: clean },
      ];
    });
  };

  const schedulePcmPlayback = (base64Audio: string) => {
    const outCtx = outputCtxRef.current;
    if (!outCtx) return;
    if (outCtx.state === 'suspended') {
      void outCtx.resume();
    }
    const samples = base64Pcm16ToFloat32(base64Audio);
    if (samples.length === 0) return;

    const audioBuffer = outCtx.createBuffer(1, samples.length, 24000);
    audioBuffer.getChannelData(0).set(samples);

    const source = outCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outCtx.destination);

    const startAt = Math.max(outCtx.currentTime, nextPlayTimeRef.current);
    nextPlayTimeRef.current = startAt + audioBuffer.duration;
    scheduledSourcesRef.current.add(source);
    source.onended = () => {
      scheduledSourcesRef.current.delete(source);
    };
    source.start(startAt);
  };

  const startVoiceSession = async () => {
    if (voiceStatus === 'connecting' || voiceStatus === 'live') return;
    if (isNativeCapacitor) {
      setVoiceError('Live Voice requires the hosted web server connection and is not available inside the offline APK.');
      setVoiceStatus('error');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError('Microphone capture is not supported in this browser or context (HTTPS is required).');
      setVoiceStatus('error');
      return;
    }
    setVoiceError(null);
    setVoiceStatus('connecting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const inCtx = new AudioCtx({ sampleRate: 16000 });
      const outCtx = new AudioCtx({ sampleRate: 24000 });
      inputCtxRef.current = inCtx;
      outputCtxRef.current = outCtx;
      nextPlayTimeRef.current = outCtx.currentTime;

      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProto}//${window.location.host}/ws/live?voice=${encodeURIComponent(
        selectedVoice
      )}&context=${encodeURIComponent(patroContext)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        const source = inCtx.createMediaStreamSource(stream);
        const processor = inCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (micMutedRef.current) return;
          if (ws.readyState !== WebSocket.OPEN) return;
          const channelData = event.inputBuffer.getChannelData(0);
          const base64 = float32ToBase64Pcm16(channelData);
          ws.send(JSON.stringify({ audio: base64 }));
        };

        source.connect(processor);
        processor.connect(inCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            type?: string;
            audio?: string;
            text?: string;
            error?: string;
          };
          if (msg.type === 'ready') {
            setVoiceStatus('live');
          } else if (msg.type === 'audio' && msg.audio) {
            schedulePcmPlayback(msg.audio);
          } else if (msg.type === 'inputTranscript' && msg.text) {
            appendTranscript('you', msg.text);
          } else if (msg.type === 'outputTranscript' && msg.text) {
            appendTranscript('guru', msg.text);
          } else if (msg.type === 'interrupted') {
            stopPlaybackQueue();
          } else if (msg.type === 'error') {
            setVoiceError(msg.error || 'Voice stream failed.');
            setVoiceStatus('error');
          } else if (msg.type === 'closed') {
            stopVoiceSession();
          }
        } catch {
          // ignore malformed ws message
        }
      };

      ws.onerror = () => {
        setVoiceError('Could not establish live voice connection. Please verify server and microphone access.');
        stopVoiceSession();
        setVoiceStatus('error');
      };

      ws.onclose = () => {
        if (voiceStatusRef.current === 'live') {
          stopVoiceSession();
        }
      };
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Microphone permission is required for live voice conversation.';
      setVoiceError(msg);
      stopVoiceSession();
      setVoiceStatus('error');
    }
  };

  const sendLiveTopicPrompt = (text: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    appendTranscript('you', text);
    wsRef.current.send(JSON.stringify({ text }));
  };

  // =========================================================
  // 2. GOOGLE SEARCH GROUNDING STATE (gemini-4-hydrogen)
  // =========================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<{
    prompt: string;
    text: string;
    sources: SearchSource[];
    saved?: boolean;
  } | null>(null);

  const runSearch = async (customPrompt?: string) => {
    const q = (customPrompt ?? searchQuery).trim();
    if (!q || searchBusy) return;
    if (customPrompt) setSearchQuery(customPrompt);
    if (isNativeCapacitor) {
      setSearchError('Live Search requires the hosted web server connection and is not available inside the offline APK.');
      return;
    }
    setSearchBusy(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/patro/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: q, patroContext }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Live Search server is unreachable right now. Please try again online.');
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Search request failed.');
      }
      setSearchResult({
        prompt: q,
        text: data.text || 'No response received.',
        sources: Array.isArray(data.sources) ? data.sources : [],
        saved: false,
      });
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Unable to fetch search-grounded insights.');
    } finally {
      setSearchBusy(false);
    }
  };

  const handleSaveSearchToPatro = async () => {
    if (!searchResult || searchResult.saved) return;
    const bsKey = `${todayBs.year}-${String(todayBs.month).padStart(2, '0')}-${String(
      todayBs.day
    ).padStart(2, '0')}`;
    await onAddNote({
      bsKey,
      title: searchResult.prompt.slice(0, 110),
      note: searchResult.text.slice(0, 950),
      category: 'reminder',
    });
    setSearchResult((prev) => (prev ? { ...prev, saved: true } : null));
  };

  // =========================================================
  // 3. GOOGLE MAPS GROUNDING STATE (gemini-4-hydrogen)
  // =========================================================
  const [mapsQuery, setMapsQuery] = useState('Famous Hindu temples and sacred stupas nearby');
  const [coords, setCoords] = useState<{ lat: number; lng: number; label: string }>({
    lat: 27.7172,
    lng: 85.324,
    label: 'Kathmandu Valley',
  });
  const [gpsBusy, setGpsBusy] = useState(false);
  const [mapsBusy, setMapsBusy] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [mapsResult, setMapsResult] = useState<{
    text: string;
    places: MapsPlace[];
  } | null>(null);

  const detectGpsLocation = () => {
    if (!navigator.geolocation) {
      setMapsError('Geolocation is not supported in this browser.');
      return;
    }
    setGpsBusy(true);
    setMapsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: `My GPS (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`,
        });
        setGpsBusy(false);
      },
      () => {
        setMapsError('Location permission denied. Select a Nepal city chip below or grant GPS access.');
        setGpsBusy(false);
      },
      { timeout: 10000 }
    );
  };

  const runMapsSearch = async (customPrompt?: string) => {
    const q = (customPrompt ?? mapsQuery).trim();
    if (!q || mapsBusy) return;
    if (customPrompt) setMapsQuery(customPrompt);
    if (isNativeCapacitor) {
      setMapsError('Temple Maps discovery requires the hosted web server connection and is not available inside the offline APK.');
      return;
    }
    setMapsBusy(true);
    setMapsError(null);
    try {
      const res = await fetch('/api/patro/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${q} (around ${coords.label})`,
          latitude: coords.lat,
          longitude: coords.lng,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Temple Maps server is unreachable right now. Please try again online.');
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Maps discovery failed.');
      }
      setMapsResult({
        text: data.text || '',
        places: Array.isArray(data.places) ? data.places : [],
      });
    } catch (err) {
      setMapsError(err instanceof Error ? err.message : 'Unable to discover nearby sacred places.');
    } finally {
      setMapsBusy(false);
    }
  };

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 sm:space-y-6 pb-8"
    >
      {/* Header Banner */}
      <motion.section
        variants={staggerCardVariants}
        style={{
          backgroundImage: 'linear-gradient(135deg, var(--hero-from), var(--hero-via), var(--hero-to))',
          boxShadow: 'var(--card-shadow)',
        }}
        className="rounded-3xl p-5 sm:p-7 text-white border border-[var(--border-subtle)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 border border-white/25">
              <PatroThemedIcon name="panchang" iconTheme={iconTheme} className="h-6 w-6 text-[#FCD34D]" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
                नेपाल पात्रो · Live Voice, Search & Maps Studio
              </p>
              <h1 className="text-xl sm:text-2xl font-bold leading-tight mt-0.5">
                Patro Jyotish & Temple Guide
              </h1>
              <p className="text-xs sm:text-sm text-white/85 mt-1">
                Talk live with Patro Guru, verify current Nepal festival news via Google Search, and find nearby temples on Google Maps.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-black/25 border border-white/15 px-3.5 py-2 text-xs shrink-0">
            <p className="font-devanagari font-bold text-[#FCD34D]">{formatBsDateNe(todayBs)}</p>
            <p className="text-white/80">{panchang.fullTithiNe}</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-3 gap-2 mt-5 p-1 rounded-2xl bg-black/25 border border-white/15">
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'voice' ? 'bg-white text-[#1E1B2E]' : 'text-white/85 hover:bg-white/10'
            }`}
          >
            <Volume2 className="h-4 w-4 shrink-0" />
            <span>Live Voice</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'search' ? 'bg-white text-[#1E1B2E]' : 'text-white/85 hover:bg-white/10'
            }`}
          >
            <Globe className="h-4 w-4 shrink-0" />
            <span>Live Search</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('maps')}
            className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'maps' ? 'bg-white text-[#1E1B2E]' : 'text-white/85 hover:bg-white/10'
            }`}
          >
            <MapPin className="h-4 w-4 shrink-0" />
            <span>Temples Map</span>
          </button>
        </div>

        {isNativeCapacitor && (
          <div className="mt-4 p-3 rounded-2xl bg-black/30 border border-white/20 text-xs text-white/90 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-[#FCD34D] shrink-0 mt-0.5" />
            <span>
              You are running the offline Android APK build. Calendar, Panchang, Subha Saait, Rashifal, Converter, Weather, and Alerts work 100% offline; Live Voice, Search &amp; Maps require the hosted web app.
            </span>
          </div>
        )}
      </motion.section>

      {/* TAB 1: REAL-TIME VOICE CONVERSATION (gemini-3.8-live) */}
      {activeTab === 'voice' && (
        <motion.section
          variants={staggerCardVariants}
          style={{ boxShadow: 'var(--card-shadow)' }}
          className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-[var(--accent-secondary)]" />
                Real-Time Voice Companion (Patro Guru)
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Speak in Nepali or English about today&apos;s Panchang, Subha Saait, Rashi ({rashiObj.nameEn}), or festivals.
              </p>
            </div>

            <select
              aria-label="Select voice persona"
              value={selectedVoice}
              disabled={voiceStatus === 'live' || voiceStatus === 'connecting'}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="h-10 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-xs font-semibold text-[var(--text-primary)]"
            >
              {VOICE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {voiceError && (
            <div className="p-3.5 rounded-2xl bg-[var(--holiday-soft-bg)] border border-[var(--holiday-border)] text-xs font-medium text-[var(--holiday-soft-text)]">
              {voiceError}
            </div>
          )}

          {/* Call Control Bar */}
          <div className="p-5 rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
                  voiceStatus === 'live'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)] border-[var(--border-accent)]'
                }`}
              >
                {voiceStatus === 'connecting' ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {voiceStatus === 'live'
                    ? `Connected · Speaking with ${selectedVoice}`
                    : voiceStatus === 'connecting'
                    ? 'Connecting Microphone & Live Session...'
                    : 'Voice Session Ready'}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {voiceStatus === 'live'
                    ? isMicMuted
                      ? 'Microphone is muted. Unmute to speak.'
                      : 'Speak naturally — interrupt anytime.'
                    : 'Streams 16kHz mic input & plays 24kHz real-time voice replies.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {voiceStatus === 'live' && (
                <button
                  type="button"
                  onClick={() => setIsMicMuted((m) => !m)}
                  className="h-11 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
                >
                  {isMicMuted ? <MicOff className="h-4 w-4 text-rose-600" /> : <Mic className="h-4 w-4" />}
                  {isMicMuted ? 'Unmute' : 'Mute'}
                </button>
              )}

              {voiceStatus === 'live' || voiceStatus === 'connecting' ? (
                <button
                  type="button"
                  onClick={stopVoiceSession}
                  className="h-11 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white whitespace-nowrap cursor-pointer transition-colors"
                >
                  End Voice Call
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startVoiceSession()}
                  className="h-11 px-5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-bold text-white whitespace-nowrap cursor-pointer transition-colors"
                >
                  Start Live Voice Call
                </button>
              )}
            </div>
          </div>

          {/* Quick Topic Chips during Live Call */}
          {voiceStatus === 'live' && (
            <div className="flex flex-wrap gap-2">
              {[
                'What is today’s Panchang and Subha Saait?',
                `Give me a quick ${rashiObj.nameEn} Rashifal reflection for today.`,
                'Tell me the significance of the upcoming Ekadashi.',
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendLiveTopicPrompt(prompt)}
                  className="px-3 py-1.5 rounded-full bg-[var(--accent-soft-bg)] border border-[var(--border-accent)] text-xs font-semibold text-[var(--accent-soft-text)] hover:opacity-90 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Live Transcript Window */}
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface-soft)] p-4 min-h-[160px] max-h-[300px] overflow-y-auto space-y-2.5">
            {transcripts.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-8">
                Live conversation transcript appears here once you start speaking.
              </p>
            ) : (
              transcripts.map((line) => (
                <div
                  key={line.id}
                  className={`p-3 rounded-xl text-xs leading-relaxed ${
                    line.speaker === 'you'
                      ? 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] ml-6'
                      : 'bg-[var(--accent-soft-bg)] border border-[var(--border-accent)] text-[var(--text-primary)] mr-6'
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--accent-secondary)] mb-0.5">
                    {line.speaker === 'you' ? 'You' : 'Patro Guru'}
                  </span>
                  {line.text}
                </div>
              ))
            )}
          </div>
        </motion.section>
      )}

      {/* TAB 2: GOOGLE SEARCH GROUNDING (gemini-4-hydrogen) */}
      {activeTab === 'search' && (
        <motion.section
          variants={staggerCardVariants}
          style={{ boxShadow: 'var(--card-shadow)' }}
          className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-5"
        >
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Search className="h-4.5 w-4.5 text-[var(--accent-secondary)]" />
              Search-Grounded Nepal Info & Live Updates
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Powered by Google Search grounding for live weather updates, Nepal public holidays, cultural festivals, and current events.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch();
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask about Kathmandu weather, upcoming Nepal festivals, gold rate, or public holidays..."
              className="flex-1 h-11 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
            />
            <button
              type="submit"
              disabled={searchBusy || !searchQuery.trim()}
              className="h-11 px-5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-bold text-white flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              {searchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search Now
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {[
              'Latest weather forecast for Kathmandu and Pokhara today',
              'Upcoming Nepali public holidays and festivals in 2083 BS',
              'Cultural significance of Haribodhini Ekadashi & Tulasi Vivah in Nepal',
              'Today Nepal gold and silver market rate',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void runSearch(q)}
                className="px-3 py-1.5 rounded-full bg-[var(--bg-surface-soft)] hover:bg-[var(--accent-soft-bg)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {searchError && (
            <div className="p-3.5 rounded-2xl bg-[var(--holiday-soft-bg)] border border-[var(--holiday-border)] text-xs font-medium text-[var(--holiday-soft-text)]">
              {searchError}
            </div>
          )}

          {searchResult && (
            <div className="rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)] p-4 sm:p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{searchResult.prompt}</h3>
                <button
                  type="button"
                  onClick={() => void handleSaveSearchToPatro()}
                  disabled={searchResult.saved}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--accent-secondary)] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-70"
                >
                  {searchResult.saved ? <Check className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                  {searchResult.saved ? 'Saved to Notes' : 'Save to Patro'}
                </button>
              </div>

              <div className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {searchResult.text}
              </div>

              {searchResult.sources.length > 0 && (
                <div className="pt-3 border-t border-[var(--border-soft)] space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Verified Web Sources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {searchResult.sources.map((src) => {
                      const href = safeExternalHref(src.uri);
                      if (!href) return null;
                      return (
                        <a
                          key={href}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-xs font-semibold text-[var(--accent-link)] transition-colors"
                        >
                          <span className="truncate max-w-[240px]">{src.title}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.section>
      )}

      {/* TAB 3: GOOGLE MAPS GROUNDING (gemini-4-hydrogen) */}
      {activeTab === 'maps' && (
        <motion.section
          variants={staggerCardVariants}
          style={{ boxShadow: 'var(--card-shadow)' }}
          className="rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Compass className="h-4.5 w-4.5 text-[var(--accent-secondary)]" />
                Sacred Temples, Stupas & Cultural Places
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Active search area: <strong className="text-[var(--text-primary)]">{coords.label}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={detectGpsLocation}
              disabled={gpsBusy}
              className="h-10 px-3.5 rounded-xl bg-[var(--accent-soft-bg)] border border-[var(--border-accent)] text-xs font-bold text-[var(--accent-soft-text)] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              {gpsBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
              Use My GPS Location
            </button>
          </div>

          {/* Nepal Heritage Hub Selector */}
          <div className="flex flex-wrap gap-1.5">
            {NEPAL_HUBS.map((hub) => {
              const active = coords.label === hub.label;
              return (
                <button
                  key={hub.label}
                  type="button"
                  onClick={() => setCoords({ lat: hub.lat, lng: hub.lng, label: hub.label })}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-surface-soft)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-accent)]'
                  }`}
                >
                  {hub.label}
                </button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runMapsSearch();
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              value={mapsQuery}
              onChange={(e) => setMapsQuery(e.target.value)}
              placeholder="Search nearby temples, Buddhist stupas, puja samagri stores..."
              className="flex-1 h-11 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
            />
            <button
              type="submit"
              disabled={mapsBusy || !mapsQuery.trim()}
              className="h-11 px-5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-xs font-bold text-white flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              {mapsBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Find Places
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {[
              'Famous Hindu temples and sacred stupas nearby',
              'Puja samagri and brass diyo shops nearby',
              'Peaceful meditation monasteries and heritage courtyards',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void runMapsSearch(q)}
                className="px-3 py-1.5 rounded-full bg-[var(--bg-surface-soft)] hover:bg-[var(--accent-soft-bg)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {mapsError && (
            <div className="p-3.5 rounded-2xl bg-[var(--holiday-soft-bg)] border border-[var(--holiday-border)] text-xs font-medium text-[var(--holiday-soft-text)]">
              {mapsError}
            </div>
          )}

          {mapsResult && (
            <div className="space-y-4">
              {mapsResult.places.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mapsResult.places.map((place) => {
                    const href = safeExternalHref(place.uri);
                    if (!href) return null;
                    return (
                      <a
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-4 rounded-2xl bg-[var(--bg-surface-soft)] hover:bg-[var(--accent-soft-bg)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="h-4 w-4 text-[var(--accent-secondary)] shrink-0" />
                            <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                              {place.title}
                            </span>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-[var(--accent-link)] shrink-0 mt-0.5" />
                        </div>
                        {place.reviewSnippets.length > 0 && (
                          <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                            &ldquo;{place.reviewSnippets[0]}&rdquo;
                          </p>
                        )}
                        <span className="inline-block text-[11px] font-bold text-[var(--accent-link)] group-hover:underline">
                          Open in Google Maps
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}

              {mapsResult.text && (
                <div className="rounded-2xl bg-[var(--bg-surface-soft)] border border-[var(--border-subtle)] p-4 sm:p-5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {mapsResult.text}
                </div>
              )}
            </div>
          )}
        </motion.section>
      )}
    </motion.div>
  );
}
