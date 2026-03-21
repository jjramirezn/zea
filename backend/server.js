import http from 'http';

import { PHASE1_PROMPT, PHASE1_TEXT_PROMPT, PHASE4_SYSTEM } from './prompts.js';
import { deterministicPipeline } from './pipeline.js';
import { callClaude } from './claude.js';

const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════
// MAIN PIPELINE HANDLER
// ═══════════════════════════════════════════

async function handleChat(userMessages, hasImage) {
  // PHASE 1: AI Diagnosis → structured JSON
  const systemPrompt = hasImage ? PHASE1_PROMPT : PHASE1_TEXT_PROMPT;
  const phase1Response = await callClaude(systemPrompt, userMessages);
  const phase1Text = phase1Response.content.find(c => c.type === 'text')?.text || '';

  let diagnosis;
  try {
    const jsonStr = phase1Text.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
    diagnosis = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Phase 1 JSON parse error:', e.message);
    console.error('Raw output:', phase1Text);
    return 'Error al procesar el diagnóstico. Por favor intentá de nuevo con una imagen más clara.';
  }

  if (diagnosis.needs_more_info) {
    const notes = diagnosis.notes || 'No pude identificar una enfermedad en la imagen.';
    return `${notes}\n\n¿Podrías enviarme una foto más clara de la planta afectada? Idealmente:\n1. Primer plano de las hojas/frutos con síntomas\n2. Vista general de la planta\n3. Descripción del clima y condiciones recientes`;
  }

  // PHASE 2 & 3: Deterministic pipeline (NO AI)
  const pipelineResult = deterministicPipeline(diagnosis);

  console.log('=== PIPELINE ===');
  console.log('Diagnosis:', JSON.stringify(diagnosis, null, 2));
  console.log('Pipeline result:', JSON.stringify({
    blocked: pipelineResult.blocked,
    amp_matches: pipelineResult.amp_matches.length,
    has_env_context: !!pipelineResult.environmental_context
  }));

  // PHASE 4: AI translates verified results for user
  const phase4Messages = [
    ...userMessages,
    {
      role: 'assistant',
      content: `[Phase 1 diagnosis complete]`
    },
    {
      role: 'user',
      content: `[SYSTEM — VERIFIED PIPELINE RESULTS — present these to the user]

Phase 1 Diagnosis (AI observation):
${JSON.stringify(diagnosis, null, 2)}

Phase 2-3 Deterministic Pipeline (code-verified, cannot be changed):
${JSON.stringify(pipelineResult, null, 2)}

Now write a clear, empathetic response for the user based ONLY on these verified results. Do not add any AMP recommendations that are not in the pipeline results.`
    }
  ];

  const phase4Response = await callClaude(PHASE4_SYSTEM, phase4Messages);
  return phase4Response.content.find(c => c.type === 'text')?.text || 'Error al generar respuesta.';
}

// ═══════════════════════════════════════════
// CONVERSATION HISTORY
// ═══════════════════════════════════════════

const conversationHistory = new Map();

// ═══════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════

const rateLimits = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const DEMO_BYPASS_TOKENS = new Set([
  'aleph-hackathon-2026',
  'amp-demo-bypass'
]);

function checkRateLimit(key) {
  const now = Date.now();
  let entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateLimits.set(key, entry);
  }
  entry.count++;
  rateLimits.set(key, entry);
  return {
    allowed: entry.count <= RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - entry.count),
    resetAt: entry.resetAt
  };
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

// ═══════════════════════════════════════════
// MULTIPART PARSER
// ═══════════════════════════════════════════

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=(.+)/);
      if (!boundaryMatch) return reject(new Error('No boundary'));

      const boundary = boundaryMatch[1];
      const parts = {};
      const raw = buf.toString('binary');
      const sections = raw.split(`--${boundary}`);

      for (const section of sections) {
        if (section.trim() === '' || section.trim() === '--') continue;
        const headerEnd = section.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;
        const headers = section.substring(0, headerEnd);
        const body = section.substring(headerEnd + 4).replace(/\r\n$/, '');

        const nameMatch = headers.match(/name="([^"]+)"/);
        if (!nameMatch) continue;
        const name = nameMatch[1];

        const filenameMatch = headers.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          const start = buf.indexOf('\r\n\r\n', buf.indexOf(name)) + 4;
          const end = buf.indexOf(Buffer.from(`\r\n--${boundary}`), start);
          parts[name] = { filename: filenameMatch[1], data: buf.slice(start, end) };
        } else {
          parts[name] = body;
        }
      }
      resolve(parts);
    });
    req.on('error', reject);
  });
}

// ═══════════════════════════════════════════
// HTTP SERVER
// ═══════════════════════════════════════════

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      agent: 'AMP Field Agent',
      pipeline: 'hybrid-deterministic-v2',
      phases: ['AI diagnosis (structured JSON)', 'Deterministic AMP lookup', 'Biosecurity check', 'AI translation']
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    try {
      const parts = await parseMultipart(req);
      const text = parts.message || '';
      const image = parts.image;
      const sessionId = req.headers['x-session-id'] || 'default';
      const bypassToken = req.headers['x-demo-token'] || parts.demo_token || '';

      if (!DEMO_BYPASS_TOKENS.has(bypassToken)) {
        const clientIP = getClientIP(req);
        const limit = checkRateLimit(clientIP);
        if (!limit.allowed) {
          res.writeHead(402, {
            'Content-Type': 'application/json',
            'X-Payment-Required': 'true',
            'X-Payment-Amount': '0.50',
            'X-Payment-Currency': 'USDC',
            'X-RateLimit-Limit': String(RATE_LIMIT),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(limit.resetAt)
          });
          res.end(JSON.stringify({
            error: 'rate_limit_exceeded',
            message: 'Has alcanzado el límite de diagnósticos gratuitos. Para continuar, realizá un pago de $0.50 USDC por diagnóstico.',
            payment: {
              amount: '0.50',
              currency: 'USDC',
              protocol: 'x402',
              recipient: '0x0000000000000000000000000000000000000000'
            },
            resetAt: new Date(limit.resetAt).toISOString()
          }));
          return;
        }
      }

      const content = [];
      let hasImage = false;
      if (image) {
        hasImage = true;
        const b64 = image.data.toString('base64');
        const ext = image.filename.split('.').pop().toLowerCase();
        const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: mimeMap[ext] || 'image/jpeg', data: b64 }
        });
      }
      content.push({ type: 'text', text: text || 'Analyze this plant image and diagnose any disease.' });

      if (!conversationHistory.has(sessionId)) {
        conversationHistory.set(sessionId, []);
      }
      const history = conversationHistory.get(sessionId);
      history.push({ role: 'user', content });
      while (history.length > 20) history.shift();

      const reply = await handleChat(history, hasImage);
      history.push({ role: 'assistant', content: reply });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
    } catch (err) {
      console.error('Chat error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`AMP Field Agent (Hybrid Pipeline v2) running at http://0.0.0.0:${PORT}`);
  console.log(`  Phase 1: AI -> structured JSON diagnosis`);
  console.log(`  Phase 2: Code -> deterministic AMP lookup`);
  console.log(`  Phase 3: Code -> biosecurity check`);
  console.log(`  Phase 4: AI -> farmer-friendly translation`);
});
