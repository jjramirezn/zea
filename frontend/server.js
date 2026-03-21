import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Load all data files
const MATCHER = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'agent', 'data', 'matcher_patogenos.json'), 'utf8'));
const BIOSECURITY = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'agent', 'data', 'biosecurity-alerts.json'), 'utf8'));
const CEREBRO = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'agent', 'data', 'cerebro_ambiental.json'), 'utf8'));
const TRADUCTOR = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'agent', 'data', 'traductor_agentes.json'), 'utf8'));

// ═══════════════════════════════════════════
// PHASE 1 PROMPT — Structured diagnosis
// ═══════════════════════════════════════════

const PHASE1_PROMPT = `You are an expert plant pathologist AI assistant. Your job is to analyze images of plants and identify potential diseases and their causative pathogens.

How to analyze
Follow these steps IN ORDER. Do not skip ahead to diagnosis without completing observation first.

OBSERVE: Carefully examine the image. Describe the visible symptoms: color changes, lesion patterns, texture, location on the plant (leaves, stem, fruit, roots), spread pattern, and any visible signs of the pathogen itself (mold, spores, bacterial ooze).

IDENTIFY THE CROP: Determine what plant/crop is shown in the image. If unclear, state your best guess and note the uncertainty.

DIAGNOSE: Based on the observed symptoms and the identified crop, propose 1 to 3 candidate pathogens ranked by likelihood. For each candidate, explain WHY the symptoms match that pathogen.

CROSS-REFERENCE MVP DATABASE: Check if any candidate matches a pathogen in the MVP database below. Matching is at GENUS level: if your candidate is "Xanthomonas citri subsp. citri" and the MVP has "Xanthomonas campestris", that is a match. If a match exists, set the candidate's mvp_match_name to the EXACT string from the MVP database. Otherwise set it to null.

CHECK BIOSECURITY ALERTS: Check if any candidate matches a Critical Alert Pathogen listed below. If so, set biosecurity_alert to the corresponding alert ID. These pathogens require immediate action — they override normal AMP recommendations.

MVP Pathogen Database (AMP recommendations available)
These are the EXACT names used in the AMP recommendation database. Use these strings verbatim for the mvp_match_name field:

"Botrytis cinerea" — Fungus. Affects strawberries, tomatoes, grapes.
"Pseudomonas syringae" — Gram-negative bacteria. Affects tomato, kiwi, beans.
"Xanthomonas campestris" — Gram-negative bacteria. Affects cruciferous crops, peppers, citrus (includes X. citri, X. vesicatoria, X. perforans and other Xanthomonas species).
"Ralstonia solanacearum" — Gram-negative bacteria. Affects potato, banana, tobacco.
"Pectobacterium carotovorum" — Gram-negative bacteria. Affects potato, carrot, fleshy vegetables.

Critical Alert Pathogens (biosecurity risks)
If any of these pathogens are identified, set biosecurity_alert to the corresponding ID. AMP treatment is NOT appropriate for these — they require regulatory action, lot destruction, or quarantine.

"Aspergillus flavus" → alert ID: "R_001_SALUD_AFLATOXINAS" — Produces carcinogenic aflatoxins. Affects corn, peanuts, nuts. BLOCK any treatment recommendation.
"Claviceps purpurea" → alert ID: "R_002_SALUD_ERGOTISMO" — Produces neurotoxic ergot alkaloids. Affects rye, wheat, barley. Reject lot for milling.
"Candidatus Liberibacter asiaticus" → alert ID: "R_003_CUARENTENA_HLB" — Citrus greening (HLB). No cure. Requires tree eradication and phytosanitary notification.
"Xylella fastidiosa" → alert ID: "R_004_CUARENTENA_XYLELLA" — Devastating quarantine pathogen. Affects olives, vines, almond trees. Establish containment zone.

Response format
Respond ONLY with a valid JSON object. No markdown fences, no preamble, no extra text.

{
  "crop": "<identified crop, lowercase>",
  "observed_symptoms": ["<symptom 1>", "<symptom 2>", "..."],
  "candidates": [
    {
      "pathogen": "<scientific name>",
      "common_name": "<common name>",
      "confidence": "<high | medium | low>",
      "reasoning": "<1-2 sentences explaining why symptoms match>",
      "mvp_match_name": "<exact string from MVP database if genus matches, otherwise null>"
    }
  ],
  "in_mvp_database": <true if any candidate has a non-null mvp_match_name>,
  "biosecurity_alert": "<alert ID string if a Critical Alert Pathogen is detected, otherwise null>",
  "needs_more_info": <true if image is unclear or not a plant>,
  "notes": "<optional: caveats, diagnostic suggestions, or additional context>"
}

Confidence guidelines
HIGH: Symptoms are textbook for this pathogen on this crop. Very little ambiguity.
MEDIUM: Symptoms are consistent but could also match other pathogens. Common disease on this crop.
LOW: Possible but not certain. Symptoms are partial, atypical, or image quality limits assessment.

Important rules
If the user mentions a specific crop in their text message, ALWAYS use that as the crop identification — the user knows their own crop better than visual analysis.
If the image does not show a plant or shows a healthy plant, return needs_more_info: true with a note explaining why.
Never invent symptoms you cannot see in the image.
If you cannot identify the crop with reasonable certainty AND the user did not specify it, set crop to "unknown" and note it.
Always provide at least 1 candidate unless needs_more_info is true.
Maximum 3 candidates. Only include additional candidates if genuinely plausible.
Keep reasoning concise: 1-2 sentences per candidate.
If a biosecurity alert pathogen is detected, it MUST be mentioned in the notes with a warning about the required action.
Multiple candidates can have mvp_match_name set if multiple matches exist.`;

// ═══════════════════════════════════════════
// PHASE 1 (text-only) — for symptom descriptions without image
// ═══════════════════════════════════════════

const PHASE1_TEXT_PROMPT = `You are an expert plant pathologist AI assistant. Your job is to analyze text descriptions of plant symptoms and identify potential diseases and their causative pathogens.

Follow the same analysis steps as for images, but based on the text description provided.

If the description is too vague to diagnose, return needs_more_info: true and ask specific questions.

MVP Pathogen Database (AMP recommendations available)
These are the EXACT names used in the AMP recommendation database. Use these strings verbatim for the mvp_match_name field:

"Botrytis cinerea" — Fungus. Affects strawberries, tomatoes, grapes.
"Pseudomonas syringae" — Gram-negative bacteria. Affects tomato, kiwi, beans.
"Xanthomonas campestris" — Gram-negative bacteria. Affects cruciferous crops, peppers, citrus.
"Ralstonia solanacearum" — Gram-negative bacteria. Affects potato, banana, tobacco.
"Pectobacterium carotovorum" — Gram-negative bacteria. Affects potato, carrot, fleshy vegetables.

Critical Alert Pathogens (biosecurity risks)
"Aspergillus flavus" → "R_001_SALUD_AFLATOXINAS"
"Claviceps purpurea" → "R_002_SALUD_ERGOTISMO"
"Candidatus Liberibacter asiaticus" → "R_003_CUARENTENA_HLB"
"Xylella fastidiosa" → "R_004_CUARENTENA_XYLELLA"

Respond ONLY with valid JSON (same schema as image analysis). No markdown, no preamble.

{
  "crop": "<crop, lowercase>",
  "observed_symptoms": ["<symptom 1>", "..."],
  "candidates": [
    {
      "pathogen": "<scientific name>",
      "common_name": "<common name>",
      "confidence": "<high | medium | low>",
      "reasoning": "<1-2 sentences>",
      "mvp_match_name": "<exact string from MVP DB or null>"
    }
  ],
  "in_mvp_database": <boolean>,
  "biosecurity_alert": "<alert ID or null>",
  "needs_more_info": <boolean>,
  "notes": "<optional>"
}`;

// ═══════════════════════════════════════════
// DETERMINISTIC FUNCTIONS (no AI)
// ═══════════════════════════════════════════

function lookupAMP(mvpMatchName) {
  if (!mvpMatchName) return null;
  const normalized = mvpMatchName.toLowerCase();
  return MATCHER.find(p => p.pathogen.toLowerCase() === normalized) || null;
}

function lookupBiosecurityAlert(alertId) {
  if (!alertId) return null;
  return BIOSECURITY.find(a => a.id_caso === alertId) || null;
}

function lookupEnvironment(pathogenName) {
  if (!pathogenName) return null;
  const normalized = pathogenName.toLowerCase();
  return CEREBRO.find(c =>
    c.patogeno.nombre.toLowerCase().includes(normalized)
  ) || null;
}

function lookupTranslation(ampName) {
  if (!ampName) return null;
  return TRADUCTOR.find(t =>
    t.amp_name.toLowerCase() === ampName.toLowerCase()
  ) || null;
}

function getChemicalWarnings() {
  return BIOSECURITY.filter(alert =>
    alert.tipo_alerta.includes('INTERACCION') ||
    alert.tipo_alerta.includes('DISENO_QUIMICO') ||
    alert.tipo_alerta.includes('RIESGO_RESISTENCIA')
  );
}

// Full deterministic pipeline — takes Phase 1 JSON, returns enriched data
function deterministicPipeline(diagnosis) {
  const result = {
    diagnosis,
    blocked: false,
    block_reason: null,
    block_alert: null,
    amp_matches: [],
    environmental_context: null,
    translations: [],
    chemical_warnings: getChemicalWarnings()
  };

  // Step 1: Check biosecurity FIRST
  if (diagnosis.biosecurity_alert) {
    const alert = lookupBiosecurityAlert(diagnosis.biosecurity_alert);
    if (alert) {
      result.blocked = true;
      result.block_reason = alert.instruccion_para_el_agente;
      result.block_alert = alert;
      return result;
    }
  }

  // Step 2: Lookup AMPs for all matched candidates
  if (diagnosis.candidates) {
    for (const candidate of diagnosis.candidates) {
      if (candidate.mvp_match_name) {
        const amp = lookupAMP(candidate.mvp_match_name);
        if (amp) {
          const translation = lookupTranslation(amp.amp_name);
          result.amp_matches.push({ candidate, amp, translation });
        }
      }
    }
  }

  // Step 3: Environmental context for top candidate
  if (diagnosis.candidates && diagnosis.candidates.length > 0) {
    result.environmental_context = lookupEnvironment(
      diagnosis.candidates[0].pathogen
    );
  }

  return result;
}

// ═══════════════════════════════════════════
// PHASE 4 — AI translates results for user
// ═══════════════════════════════════════════

const PHASE4_SYSTEM = `You are the communication layer of AMP Field Agent. You receive structured diagnostic results and must present them clearly to the user.

RULES:
- Respond in the SAME LANGUAGE as the user's original message (Spanish or English)
- If BLOCKED (biosecurity alert): explain the situation seriously, follow the alert instructions EXACTLY. Do NOT recommend any AMP treatment.
- If AMP matches found: present each recommendation with all details
- If no AMP match (in_mvp_database=false): say honestly "No tenemos un péptido validado para este patógeno en nuestra base de datos actual."
- If needs_more_info=true: ask the user for better photos or more details
- For LOW confidence: caveat heavily, suggest professional consultation
- Use farmer_explanation for non-technical users, technical_summary for experts (default to farmer)
- ALWAYS cite the source database
- ALWAYS end with: "⚠️ Basado en estudios in vitro. Validar en campo antes de aplicar a escala."
- Include chemical interaction warnings when relevant

Format:
🔬 **Diagnóstico:** [pathogen] ([common name])
📊 **Confianza:** [level]
🌱 **Cultivo:** [crop]
👁️ **Síntomas observados:** [list]

🧬 **AMP Recomendado:** [name]
📋 **Secuencia:** [sequence]
💊 **Concentración efectiva (MIC):** [value]
⚙️ **Mecanismo:** [explanation]
🌿 **Aplicación:** [instructions from environmental context or translation]
📚 **Fuente:** [database]

⚠️ **Advertencias:** [chemical interactions, application notes]

If multiple candidates, present the highest-confidence match first.
Keep it clear, actionable, and honest about limitations.`;

// ═══════════════════════════════════════════
// CLAUDE API CALL
// ═══════════════════════════════════════════

async function callClaude(system, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }

  return await res.json();
}

// ═══════════════════════════════════════════
// MAIN PIPELINE HANDLER
// ═══════════════════════════════════════════

async function handleChat(userMessages, hasImage) {
  // PHASE 1: AI Diagnosis → structured JSON
  const systemPrompt = hasImage ? PHASE1_PROMPT : PHASE1_TEXT_PROMPT;
  const phase1Response = await callClaude(systemPrompt, userMessages);
  const phase1Text = phase1Response.content.find(c => c.type === 'text')?.text || '';

  // Parse JSON from Phase 1
  let diagnosis;
  try {
    // Strip markdown fences if present
    const jsonStr = phase1Text.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
    diagnosis = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Phase 1 JSON parse error:', e.message);
    console.error('Raw output:', phase1Text);
    return 'Error al procesar el diagnóstico. Por favor intentá de nuevo con una imagen más clara.';
  }

  // Handle needs_more_info
  if (diagnosis.needs_more_info) {
    const notes = diagnosis.notes || 'No pude identificar una enfermedad en la imagen.';
    return `${notes}\n\n¿Podrías enviarme una foto más clara de la planta afectada? Idealmente:\n1. Primer plano de las hojas/frutos con síntomas\n2. Vista general de la planta\n3. Descripción del clima y condiciones recientes`;
  }

  // PHASE 2 & 3: Deterministic pipeline (NO AI)
  const pipelineResult = deterministicPipeline(diagnosis);

  // Log pipeline for debugging
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
// HTTP SERVER
// ═══════════════════════════════════════════

const conversationHistory = new Map();

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

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
    return;
  }

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
  console.log(`🧬 AMP Field Agent (Hybrid Pipeline v2) running at http://0.0.0.0:${PORT}`);
  console.log(`   Phase 1: AI → structured JSON diagnosis`);
  console.log(`   Phase 2: Code → deterministic AMP lookup`);
  console.log(`   Phase 3: Code → biosecurity check`);
  console.log(`   Phase 4: AI → farmer-friendly translation`);
});
