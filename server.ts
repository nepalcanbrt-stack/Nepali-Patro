import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const SERVER_STARTED_AT = new Date().toISOString();

interface ServerBuildMeta {
  appName: string;
  version: string;
  buildId: string;
  builtAt: string;
  startedAt: string;
  releaseChannel: 'production' | 'development';
}

function resolveServerBuildMeta(): ServerBuildMeta {
  let pkgVersion = '1.0.0';
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
    ) as { version?: string };
    if (pkg.version) pkgVersion = pkg.version;
  } catch {
    // Fallback to default version
  }

  try {
    const distVersionPath = path.join(__dirname, 'dist', 'version.json');
    if (fs.existsSync(distVersionPath)) {
      const distMeta = JSON.parse(fs.readFileSync(distVersionPath, 'utf8')) as {
        version?: string;
        buildId?: string;
        builtAt?: string;
      };
      if (distMeta.buildId) {
        return {
          appName: 'Nepal Patro',
          version: distMeta.version || pkgVersion,
          buildId: IS_PROD ? distMeta.buildId : `${distMeta.buildId}.${SERVER_STARTED_AT.slice(11, 19).replace(/:/g, '')}`,
          builtAt: distMeta.builtAt || SERVER_STARTED_AT,
          startedAt: SERVER_STARTED_AT,
          releaseChannel: IS_PROD ? 'production' : 'development',
        };
      }
    }
  } catch {
    // Fallback to boot stamp
  }

  return {
    appName: 'Nepal Patro',
    version: pkgVersion,
    buildId: `${pkgVersion}+live-${SERVER_STARTED_AT.replace(/[:.]/g, '-')}`,
    builtAt: SERVER_STARTED_AT,
    startedAt: SERVER_STARTED_AT,
    releaseChannel: IS_PROD ? 'production' : 'development',
  };
}

const BUILD_META = resolveServerBuildMeta();
let activeSseClients = 0;
const MAX_SSE_CLIENTS = 200;

function createAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is missing. Please configure it in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sanitizeExternalHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  if (rateBuckets.size > 2000) {
    for (const [k, v] of rateBuckets.entries()) {
      if (v.resetAt <= now) rateBuckets.delete(k);
    }
  }
  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= maxRequests) {
    return false;
  }
  existing.count += 1;
  return true;
}

function getClientIp(req: express.Request | http.IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function getFriendlyGeminiError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('GEMINI_API_KEY')) {
    return {
      status: 500,
      message: 'Gemini API key is not configured in Settings > Secrets.',
    };
  }
  if (raw.includes('403') || raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message:
        'Gemini API key permission error. Please check your key in Settings > Secrets.',
    };
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message:
        'Rate or quota limit reached temporarily. Please wait a moment and try again.',
    };
  }
  return {
    status: 500,
    message: 'Unable to complete AI request right now. Please try again shortly.',
  };
}

const VALID_VOICES = new Set(['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir']);

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '0');
    next();
  });
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'nepal-patro-api' });
  });

  app.get('/api/version', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({
      ok: true,
      ...BUILD_META,
      serverTimeMs: Date.now(),
    });
  });

  app.get('/api/live-events', (req, res) => {
    if (!checkRateLimit(`sse:${getClientIp(req)}`, 30, 60_000)) {
      res.status(429).json({ error: 'Too many live stream connections. Please wait a minute.' });
      return;
    }
    if (activeSseClients >= MAX_SSE_CLIENTS) {
      res.status(503).json({ error: 'Live update stream is temporarily busy.' });
      return;
    }

    activeSseClients += 1;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: unknown) => {
      if (res.writableEnded) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('version', {
      ...BUILD_META,
      serverTimeMs: Date.now(),
    });

    const heartbeatTimer = setInterval(() => {
      sendEvent('heartbeat', {
        buildId: BUILD_META.buildId,
        serverTimeMs: Date.now(),
      });
    }, 45_000);

    req.on('close', () => {
      clearInterval(heartbeatTimer);
      activeSseClients = Math.max(0, activeSseClients - 1);
    });
  });

  /**
   * Google Search Grounding via gemini-4-hydrogen
   * Up-to-date Nepal Patro, festival significance, weather, and current events.
   */
  app.post('/api/patro/search', async (req, res) => {
    if (!checkRateLimit(`search:${getClientIp(req)}`, 20, 60_000)) {
      res.status(429).json({ error: 'Too many search requests. Please wait a minute and try again.' });
      return;
    }
    try {
      const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
      const patroContext =
        typeof req.body?.patroContext === 'string' ? req.body.patroContext.trim() : '';

      if (!prompt || prompt.length > 1000) {
        res.status(400).json({ error: 'Please enter a valid question (1–1000 characters).' });
        return;
      }

      const ai = createAiClient();
      const systemInstruction = [
        'You are Nepal Patro Jyotish & Cultural Knowledge Assistant.',
        'Provide accurate, culturally respectful answers for Nepali users in clear English with Nepali/Devanagari festival & Panchang terms where helpful.',
        'Keep responses concise, structured with clear bullet points, and grounded in verified search results.',
        patroContext ? `Current Nepal Patro Context:\n${patroContext}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
        },
      });

      const metadata = response.candidates?.[0]?.groundingMetadata;
      const chunks = Array.isArray(metadata?.groundingChunks)
        ? metadata.groundingChunks
        : [];

      const seenUrls = new Set<string>();
      const sources: Array<{ title: string; uri: string }> = [];
      for (const chunk of chunks) {
        const uri = sanitizeExternalHttpUrl(chunk.web?.uri);
        if (uri && !seenUrls.has(uri)) {
          seenUrls.add(uri);
          sources.push({
            title: chunk.web?.title || uri,
            uri,
          });
        }
      }

      res.json({
        text: response.text ?? '',
        sources,
        searchQueries: metadata?.webSearchQueries ?? [],
      });
    } catch (error) {
      console.error('Search grounding error:', error);
      const friendly = getFriendlyGeminiError(error);
      res.status(friendly.status).json({ error: friendly.message });
    }
  });

  /**
   * Google Maps Grounding via gemini-4-hydrogen
   * Sacred temples, stupas, pilgrimage sites, and Nepali heritage discovery.
   */
  app.post('/api/patro/places', async (req, res) => {
    if (!checkRateLimit(`places:${getClientIp(req)}`, 20, 60_000)) {
      res.status(429).json({ error: 'Too many places requests. Please wait a minute and try again.' });
      return;
    }
    try {
      const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
      const rawLat = req.body?.latitude;
      const rawLng = req.body?.longitude;

      if (!prompt || prompt.length > 800) {
        res.status(400).json({ error: 'Please enter a location or temple query (1–800 characters).' });
        return;
      }

      const hasValidCoords =
        typeof rawLat === 'number' &&
        Number.isFinite(rawLat) &&
        rawLat >= -90 &&
        rawLat <= 90 &&
        typeof rawLng === 'number' &&
        Number.isFinite(rawLng) &&
        rawLng >= -180 &&
        rawLng <= 180;

      const ai = createAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are Nepal Patro Temple & Cultural Place Finder. Help users discover authentic Hindu temples, Buddhist stupas, heritage sites, puja shops, and auspicious pilgrimage spots with helpful practical tips (visiting hours, cultural etiquette, nearby landmarks). Respond in clean Markdown.',
          tools: [{ googleMaps: {} }],
          ...(hasValidCoords
            ? {
                toolConfig: {
                  retrievalConfig: {
                    latLng: {
                      latitude: rawLat,
                      longitude: rawLng,
                    },
                  },
                },
              }
            : {}),
        },
      });

      const chunks = Array.isArray(
        response.candidates?.[0]?.groundingMetadata?.groundingChunks
      )
        ? response.candidates![0].groundingMetadata!.groundingChunks!
        : [];

      const seenUris = new Set<string>();
      const places: Array<{
        title: string;
        uri: string;
        placeId?: string;
        reviewSnippets: string[];
      }> = [];

      for (const chunk of chunks) {
        const maps = chunk.maps;
        const safeUri = sanitizeExternalHttpUrl(maps?.uri);
        if (maps && safeUri && !seenUris.has(safeUri)) {
          seenUris.add(safeUri);
          const snippets: string[] = [];
          const rawSnippets = maps.placeAnswerSources?.reviewSnippets;
          if (Array.isArray(rawSnippets)) {
            for (const s of rawSnippets) {
              if (typeof s === 'string') {
                snippets.push(s);
              } else if (s && typeof s === 'object' && 'content' in s && typeof (s as { content?: unknown }).content === 'string') {
                snippets.push((s as { content: string }).content);
              }
            }
          }
          places.push({
            title: maps.title || 'View on Google Maps',
            uri: safeUri,
            placeId: maps.placeId,
            reviewSnippets: snippets.slice(0, 3),
          });
        }
      }

      res.json({
        text: response.text ?? '',
        places,
      });
    } catch (error) {
      console.error('Maps grounding error:', error);
      const friendly = getFriendlyGeminiError(error);
      res.status(friendly.status).json({ error: friendly.message });
    }
  });

  if (IS_PROD) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 256 * 1024,
  });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/ws/live') {
      if (!checkRateLimit(`ws:${getClientIp(request)}`, 10, 60_000)) {
        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  /**
   * Real-time Bidirectional Voice Conversation via Gemini Live API (gemini-3.8-live)
   */
  wss.on('connection', async (clientWs: WebSocket, req: http.IncomingMessage) => {
    let liveSession: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
    let isClosed = false;

    const closeBoth = () => {
      if (isClosed) return;
      isClosed = true;
      try {
        liveSession?.close();
      } catch {
        // ignore
      }
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
    };

    try {
      const reqUrl = new URL(req.url || '/ws/live', `http://${req.headers.host || 'localhost'}`);
      const requestedVoice = reqUrl.searchParams.get('voice') || 'Zephyr';
      const voiceName = VALID_VOICES.has(requestedVoice) ? requestedVoice : 'Zephyr';
      const patroContext = (reqUrl.searchParams.get('context') || '').slice(0, 800);

      const ai = createAiClient();

      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: [
            'You are Patro Guru (पात्रो गुरु), a warm, knowledgeable Nepali Panchang, Rashifal, and cultural voice companion for Nepal Patro.',
            'Respond naturally in spoken conversational style—concise, calm, and friendly. You understand both Nepali (spoken/Romanized/Devanagari) and English and can reply in whichever language the user speaks.',
            'Help users with today’s Bikram Sambat date, Tithi, Subha Saait auspicious timings, upcoming Nepali festivals, Ekadashi fasts, Rashi horoscopes, and daily Puja guidance.',
            patroContext ? `Today’s Patro Summary:\n${patroContext}` : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
        callbacks: {
          onopen: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'ready', voice: voiceName }));
            }
          },
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'inputTranscript',
                  text: content.inputTranscription.text,
                })
              );
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: 'outputTranscript',
                  text: content.outputTranscription.text,
                })
              );
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(
                  JSON.stringify({
                    type: 'audio',
                    audio: part.inlineData.data,
                  })
                );
              }
            }
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
            if (content?.turnComplete) {
              clientWs.send(JSON.stringify({ type: 'turnComplete' }));
            }
          },
          onerror: (err) => {
            console.error('Gemini Live session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  error: 'Voice connection encountered an issue. Please reconnect.',
                })
              );
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'closed' }));
            }
            closeBoth();
          },
        },
      });
    } catch (error) {
      console.error('Failed to initialize Gemini Live session:', error);
      const friendly = getFriendlyGeminiError(error);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'error', error: friendly.message }));
      }
      closeBoth();
      return;
    }

    clientWs.on('message', (raw) => {
      if (!liveSession || isClosed) return;
      try {
        const msg = JSON.parse(raw.toString()) as { audio?: string; text?: string };
        if (typeof msg.audio === 'string' && msg.audio.length > 0 && msg.audio.length <= 131072) {
          liveSession.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (
          typeof msg.text === 'string' &&
          msg.text.trim().length > 0 &&
          msg.text.trim().length <= 1000
        ) {
          liveSession.sendRealtimeInput({
            text: msg.text.trim(),
          });
        }
      } catch (err) {
        console.error('Invalid client Live WS frame:', err);
      }
    });

    clientWs.on('close', closeBoth);
    clientWs.on('error', closeBoth);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Nepal Patro server listening on http://0.0.0.0:${PORT} (${IS_PROD ? 'production' : 'development'})`);
  });
}

void startServer();
