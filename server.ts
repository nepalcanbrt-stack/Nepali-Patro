import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

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
          buildId: IS_PROD
            ? distMeta.buildId
            : `${distMeta.buildId}.${SERVER_STARTED_AT.slice(11, 19).replace(/:/g, '')}`,
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

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '0');
    next();
  });

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

  const httpServer = http.createServer(app);
  const hmrDisabled = process.env.DISABLE_HMR === 'true';

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
        allowedHosts: true,
        hmr: !hmrDisabled,
        ws: { server: httpServer },
        watch: hmrDisabled ? null : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Nepal Patro server listening on http://0.0.0.0:${PORT} (${IS_PROD ? 'production' : 'development'})`
    );
  });
}

void startServer();
