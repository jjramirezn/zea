# Zea -- AMP Field Agent

**Crop diagnostics + antimicrobial peptide recommendations via WhatsApp.**

Send a photo of your sick plant via WhatsApp. Zea identifies the pathogen and recommends the exact antimicrobial peptide (AMP) to fight it.

> **Try it now:** [+54 9 11 2261-1627](https://wa.me/5491122611627?text=Hi%2C%20I%20want%20to%20diagnose%20my%20crop) | [Web](https://getzea.com)

[Leer en espanol](#zea----espanol)

---

## Why Zea?

Argentina spends **USD 3.1B/year** on agrochemicals. Pathogens develop resistance, residues contaminate soil and water, and bioinformatics-based crop advice does not exist at scale. Antimicrobial peptides (AMPs) attack the pathogen's physical membrane -- harder to evolve resistance against, biodegradable, and locally synthesizable.

**The problem:** AMP science exists in papers and databases. It does not reach the field.

**Zea solves it:** a WhatsApp agent any farmer can use. No app, no account, no friction.

---

## How it works

Zea uses a **Hybrid Pipeline** where AI handles only language (input/output) and all critical decisions are deterministic code. The AI cannot invent a peptide, skip a biosecurity alert, or recommend a treatment that does not exist in the curated database.

```
Photo of sick plant (WhatsApp)
         |
         v
+------------------------------------+
|  PHASE 1 -- DIAGNOSIS (AI)        |
|  Vision AI analyzes symptoms       |
|  Output: structured JSON           |
|  Closed vocabulary: can only       |
|  identify pathogens in our         |
|  verified database                 |
+------------------------------------+
|  PHASE 2 -- AMP SELECTION (code)  |
|  Deterministic lookup in DB        |
|  No AI. Exact string match.        |
|  Impossible to hallucinate.        |
+------------------------------------+
|  PHASE 3 -- BIOSECURITY (code)    |
|  Red alert check                   |
|  Aflatoxins, quarantine,           |
|  banned mixtures -> BLOCK          |
+------------------------------------+
|  PHASE 4 -- RESPONSE (AI)         |
|  Takes verified data and writes    |
|  a clear explanation for the       |
|  farmer. Cannot change the data.   |
+------------------------------------+
         |
         v
Recommendation via WhatsApp
```

---

## How we prevent false positives

The biggest risk of an AI agent in agriculture is recommending the wrong treatment. Zea addresses this with a hybrid pipeline where AI never makes critical decisions:

### 1. Closed vocabulary (anti-hallucination)
The diagnostic AI can only identify pathogens that exist in our curated database. It cannot invent names or matches. If the pathogen is not in the DB, it says "no recommendation available" -- it never guesses.

### 2. Deterministic selection (no AI)
Peptide selection is pure code -- an exact string match against the DB. No language model involved. If the DB says Botrytis -> RsAFP2, that is what it returns. Always.

### 3. Explicit confidence levels
Every diagnosis includes a confidence level (high/medium/low) based on defined criteria:
- **High:** textbook symptoms for this pathogen on this crop
- **Medium:** consistent symptoms but could match other pathogens
- **Low:** uncertain -- more information requested or professional consultation recommended

### 4. Biosecurity guardrails
Before any recommendation, the system checks biosecurity alerts:
- **Red alert** (aflatoxins, ergotism): blocks treatment, indicates lot destruction
- **Quarantine** (HLB, Xylella): does not recommend AMPs, refers to phytosanitary authorities
- **Ethical block**: rejects peptides analogous to last-resort human antibiotics
- **Chemical interactions**: warns about dangerous mixtures (copper, surfactants)

### 5. Cited sources
Every recommendation includes the source database (APD3, DRAMP, DBAASP) and the minimum inhibitory concentration (MIC) measured in published studies. The user can verify.

### 6. User authority
If the farmer says "it's tomato", the system trusts them -- it does not override with visual identification. Reduces crop classification errors.

### 7. Mandatory disclaimer
Every recommendation ends with: *"Based on in vitro studies. Validate in the field before applying at scale."*

---

## Curated data

| File | Purpose |
|------|---------|
| `agent/data/matcher_patogenos.json` | Pathogen -> AMP with sequence, MIC, and source |
| `agent/data/cerebro_ambiental.json` | Environmental context: plant stress x pathogen x solution |
| `agent/data/traductor_agentes.json` | AMP chemistry explained for technicians and farmers |
| `agent/data/biosecurity-alerts.json` | Guardrails: toxicity, quarantine, banned mixtures |

---

## Payments (x402)

Every user gets **10 free diagnoses per hour**. After the limit, the API returns HTTP 402 with x402 protocol headers:

```
HTTP/1.1 402 Payment Required
X-Payment-Amount: 0.50
X-Payment-Currency: USDC
X-Payment-Required: true
```

The farmer pays $0.50 USDC per diagnosis. This is the same protocol the agent uses to pay for its own compute. The payment integration is designed to be plugged into any x402-compatible wallet.

For demos, the rate limit can be bypassed with a token via the `X-Demo-Token` header.

---

## Stack

- **WhatsApp:** Primary channel -- no app, no onboarding, no friction
- **OpenClaw:** Agent runtime (session management, WhatsApp, tools)
- **Claude Sonnet 4:** Vision AI for diagnosis + result translation
- **Deterministic pipeline:** Pure Node.js for AMP selection and biosecurity
- **Astro:** Static landing page (zero JS shipped to browser)
- **x402:** Native payment protocol per diagnosis

---

## Project structure

```
zea/
  backend/
    server.js          # HTTP API, rate limiting, orchestration
    prompts.js         # AI prompts (Phase 1 diagnosis, Phase 4 translation)
    pipeline.js        # Deterministic functions (AMP lookup, biosecurity)
    claude.js          # Anthropic API wrapper
    logger.js          # File logger (/tmp/zea/zea-YYYY-MM-DD.log)
  frontend/
    src/
      components/      # Landing.astro (reusable, i18n-ready)
      i18n/            # translations.ts (ES + EN)
      pages/           # / (Spanish) + /en (English)
      assets/          # Unsplash images (optimized at build)
      styles/          # CSS variables (Brote Light palette)
      layouts/         # Base layout
  agent/
    data/
      matcher_patogenos.json    # Pathogen -> AMP lookup
      cerebro_ambiental.json    # Environmental context
      traductor_agentes.json    # AMP explanations
      biosecurity-alerts.json   # Red alerts and guardrails
    skill/SKILL.md              # OpenClaw agent instructions
  docs/
    architecture.md    # Full architecture + roadmap
    frontend.md        # Design system + build commands
  diagnose.sh          # Helper for WhatsApp agent
```

---

## Running locally

```bash
# Backend API
export ANTHROPIC_API_KEY=your-key
export PORT=8080
node backend/server.js

# Frontend (separate process)
cd frontend
npm install
npm run dev
```

---

## Team

Built at **Aleph Hackathon 2026**

## License

MIT

---

# Zea -- Español

**Diagnóstico de cultivos + recomendación de péptidos antimicrobianos vía WhatsApp.**

Mandá una foto de tu planta enferma por WhatsApp. Zea identifica el patógeno y te recomienda el péptido antimicrobiano (AMP) exacto para combatirlo.

> **Probalo ahora:** [+54 9 11 2261-1627](https://wa.me/5491122611627?text=Hola%2C%20quiero%20diagnosticar%20mi%20cultivo) | [Web](https://getzea.com)

---

## ¿Por qué Zea?

Argentina gasta **USD 3.100M/año** en agroquímicos. Los patógenos desarrollan resistencia, los residuos contaminan, y el asesoramiento bioinformático no existe a escala. Los péptidos antimicrobianos (AMPs) atacan la membrana física del patógeno -- más difícil de esquivar evolutivamente, biodegradables y sintetizables localmente.

**El problema:** la ciencia de AMPs existe en papers y bases de datos. No llega al campo.

**Zea lo resuelve:** un agente de WhatsApp que cualquier agricultor puede usar. Sin app, sin cuenta, sin fricción.

---

## Cómo funciona

Zea usa un **Pipeline Híbrido** donde la IA solo maneja lenguaje (entrada/salida) y todas las decisiones críticas son código determinístico. La IA no puede inventar un péptido, saltear una alerta de bioseguridad, ni recomendar un tratamiento que no exista en la base de datos curada.

```
Foto de planta enferma (WhatsApp)
         |
         v
+------------------------------------+
|  FASE 1 -- DIAGNÓSTICO (IA)       |
|  Vision AI analiza síntomas        |
|  Output: JSON estructurado         |
|  Vocabulario cerrado: solo puede   |
|  identificar patógenos de nuestra  |
|  base de datos verificada          |
+------------------------------------+
|  FASE 2 -- SELECCIÓN AMP (código) |
|  Lookup determinístico en DB       |
|  Sin IA. String match exacto.      |
|  Imposible alucinar un péptido.    |
+------------------------------------+
|  FASE 3 -- BIOSEGURIDAD (código)  |
|  Chequeo de alertas rojas          |
|  Aflatoxinas, cuarentenas, mezclas |
|  prohibidas -> BLOQUEA tratamiento |
+------------------------------------+
|  FASE 4 -- RESPUESTA (IA)         |
|  Toma datos verificados y redacta  |
|  explicación clara para el         |
|  agricultor. No puede cambiar      |
|  los datos del pipeline.           |
+------------------------------------+
         |
         v
Recomendación por WhatsApp
```

---

## Cómo evitamos falsos positivos

El mayor riesgo de un agente de IA en agricultura es recomendar el tratamiento equivocado. Zea aborda esto con un pipeline híbrido donde la IA nunca toma decisiones críticas:

### 1. Vocabulario cerrado (anti-alucinación)
La IA de diagnóstico solo puede identificar patógenos que existen en nuestra base de datos curada. No puede inventar nombres ni matches. Si el patógeno no está en la DB, dice "no tengo recomendación" -- nunca adivina.

### 2. Selección determinística (sin IA)
La selección del péptido es código puro -- un string match exacto contra la DB. No hay modelo de lenguaje involucrado. Si la DB dice que Botrytis -> RsAFP2, eso es lo que devuelve. Siempre.

### 3. Niveles de confianza explícitos
Cada diagnóstico incluye un nivel de confianza (alto/medio/bajo) basado en criterios definidos:
- **Alto:** síntomas de manual para ese patógeno en ese cultivo
- **Medio:** síntomas consistentes pero podrían ser otro patógeno
- **Bajo:** incierto, se pide más información o se recomienda consultar un agrónomo

### 4. Bioseguridad como guardarraíl
Antes de cualquier recomendación, el sistema chequea alertas de bioseguridad:
- **Alerta roja** (aflatoxinas, ergotismo): bloquea tratamiento, indica destrucción del lote
- **Cuarentena** (HLB, Xylella): no recomienda AMPs, deriva a autoridades fitosanitarias
- **Bloqueo ético**: rechaza péptidos análogos a antibióticos de último recurso humano
- **Interacciones químicas**: advierte sobre mezclas peligrosas (cobre, tensioactivos)

### 5. Fuentes citadas
Cada recomendación incluye la fuente de la base de datos (APD3, DRAMP, DBAASP) y la concentración inhibitoria mínima (MIC) medida en estudios publicados. El usuario puede verificar.

### 6. El usuario conoce su cultivo
Si el agricultor dice "es tomate", el sistema le cree -- no intenta sobreescribir con identificación visual. Reduce errores de clasificación de cultivo.

### 7. Disclaimer obligatorio
Toda recomendación termina con: *"Basado en estudios in vitro. Validar en campo antes de aplicar a escala."*

---

## Datos curados

| Archivo | Propósito |
|---------|-----------|
| `agent/data/matcher_patogenos.json` | Patógeno -> AMP con secuencia, MIC y fuente |
| `agent/data/cerebro_ambiental.json` | Contexto ambiental: estrés de planta x patógeno x solución |
| `agent/data/traductor_agentes.json` | Química del AMP explicada para técnicos y agricultores |
| `agent/data/biosecurity-alerts.json` | Guardarraíles: toxicidad, cuarentenas, mezclas prohibidas |

---

## Pagos (x402)

Cada usuario tiene **10 diagnósticos gratuitos por hora**. Después del límite, la API retorna HTTP 402 con headers del protocolo x402:

```
HTTP/1.1 402 Payment Required
X-Payment-Amount: 0.50
X-Payment-Currency: USDC
X-Payment-Required: true
```

El agricultor paga $0.50 USDC por diagnóstico. Es el mismo protocolo que el agente usa para pagar su propio cómputo. La integración de pagos está diseñada para conectarse con cualquier wallet compatible con x402.

Para demos, el rate limit se puede bypassear con un token vía el header `X-Demo-Token`.

---

## Equipo

Construido en **Aleph Hackathon 2026**

## Licencia

MIT
