<p align="center">
  <img src="frontend/public/zea-logo.jpg" alt="Zea" width="120" />
</p>

# Zea -- AMP Field Agent

**Crop diagnostics + antimicrobial peptide recommendations via WhatsApp.**

Send a photo of your sick plant via WhatsApp. Zea identifies the pathogen and recommends the exact antimicrobial peptide (AMP) to fight it.

## Demo

https://github.com/user-attachments/assets/fd13da6b-1a38-4b68-85ce-26fbdd196a46

> 📱 Real WhatsApp conversation: photo → diagnosis → AMP recommendation → on-chain payment
> **Try it now:** [+54 9 11 2261-1627](https://wa.me/5491122611627?text=Hi%2C%20I%20want%20to%20diagnose%20my%20crop) | [Web](https://getzea.com) | [Vault Dashboard](https://getzea.com/vault)

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
|  PHASE 0 -- LOCAL ML (MobileNet)  |
|  MobileNetV2 classifies image     |
|  ~300ms, runs on-device, free     |
|  If confidence >= 80%: use result  |
|  If uncertain: fall back to AI     |
+------------------------------------+
         |  (>80%: skip to Phase 2)
         v  (<80%: continue)
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

## Payments (x402 + ERC-8004 on Avalanche)

Zea has its own **on-chain wallet** and pays for every diagnosis autonomously via an **AgentVault** smart contract deployed on **Avalanche C-Chain mainnet**.

### How it works

1. Farmer sends a photo → Zea diagnoses the plant
2. On success, the agent signs a `pay()` transaction on-chain
3. **$0.05 USDC** per diagnosis, logged as an on-chain event
4. The cooperative (vault owner) sets daily spending limits
5. Every payment is verifiable on Snowtrace

### Contracts

| Contract | Address | Network |
|----------|---------|---------|
| **AgentVault** | [`0x87D43066906B393df07aD27AaE3d66E821361aC1`](https://snowtrace.io/address/0x87D43066906B393df07aD27AaE3d66E821361aC1) | Avalanche C-Chain |
| **USDC** | [`0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E`](https://snowtrace.io/address/0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E) | Avalanche C-Chain |

### AgentVault (ERC-8004 inspired)

The vault holds USDC on behalf of the agent. The **owner** (cooperative) deposits funds and sets limits. The **agent** (Zea's server-side wallet) can autonomously spend up to the daily cap.

- `deposit(amount)` — cooperative funds the vault
- `pay(to, amount, reason)` — agent pays for a service (e.g. `"diagnosis:botrytis_cinerea"`)
- `setDailyLimit(limit)` — cooperative adjusts spending cap
- `remainingToday()` — check remaining daily allowance
- `balance()` — check vault USDC balance

Every `pay()` emits a `Payment` event with the reason string — fully auditable on-chain.

### Rate limiting + 402

Every user gets **10 free diagnoses per hour**. After the limit, the API returns HTTP 402 with x402 protocol headers:

```
HTTP/1.1 402 Payment Required
X-Payment-Amount: 0.05
X-Payment-Currency: USDC
X-Payment-Network: avalanche
X-Payment-Vault: 0x87D43066906B393df07aD27AaE3d66E821361aC1
```

### API

`GET /api/vault` — returns vault status:

```json
{
  "vault": "0x87D43066906B393df07aD27AaE3d66E821361aC1",
  "agent": "0x8514C18bcc7ee6A4b47dfF18D5407f069112433C",
  "balance": "$2.43",
  "remainingToday": "$49.95",
  "dailyLimit": "$50.00",
  "network": "Avalanche C-Chain",
  "snowtrace": "https://snowtrace.io/address/0x87D43066906B393df07aD27AaE3d66E821361aC1"
}
```

### Vault Dashboard

Live at **[getzea.com/vault](https://getzea.com/vault)** — a real-time dashboard showing:

- Vault USDC balance
- Daily spending limit and remaining allowance (progress bar)
- Contract addresses linked to Snowtrace
- Recent payment transactions with on-chain verification links
- Payment flow diagram

Auto-refreshes every 15 seconds. Send a photo, watch the payment appear live.

For demos, the rate limit can be bypassed with a token via the `X-Demo-Token` header.

---

## Hybrid ML + AI diagnosis

Zea uses a **two-tier classification** system for speed and accuracy:

| | MobileNetV2 (local) | Claude Vision (API) |
|---|---|---|
| **Speed** | ~300ms | ~5-15 seconds |
| **Cost** | $0.00 | ~$0.01-0.03/image |
| **Coverage** | 38 PlantVillage classes (14 crops) | Any plant, any disease |
| **Accuracy** | 95.4% on PlantVillage dataset | High on real-world messy photos |
| **Hallucination** | Impossible — fixed class output | Constrained by closed vocabulary |

**Flow:** MobileNetV2 runs first (~300ms). If confidence ≥ 80%, use it (free, instant). If uncertain, fall back to Claude Vision (slower, but handles edge cases).

The model is 8.8MB (2.27M parameters), runs on a single vCPU with no GPU. Inference via ONNX Runtime.

---

## Stack

- **WhatsApp:** Primary channel -- no app, no onboarding, no friction
- **OpenClaw:** Agent runtime (session management, WhatsApp, tools)
- **MobileNetV2:** Local plant disease classification (Phase 0, 38 classes, ONNX Runtime)
- **Claude Sonnet 4:** Vision AI fallback for diagnosis (Phase 1)
- **Claude Haiku 4.5:** Fast translation for farmer-friendly output (Phase 4)
- **Deterministic pipeline:** Pure Node.js for AMP selection and biosecurity
- **Astro:** Static landing page (zero JS shipped to browser)
- **Avalanche C-Chain:** On-chain payments via AgentVault (USDC)
- **x402 + ERC-8004:** HTTP 402 payment protocol + autonomous agent vault

---

## Project structure

```
zea/
  backend/
    server.js          # HTTP API, rate limiting, orchestration
    classifier.js      # MobileNetV2 local classifier (ONNX Runtime)
    prompts.js         # AI prompts (Phase 1 diagnosis, Phase 4 translation)
    pipeline.js        # Deterministic functions (AMP lookup, biosecurity)
    claude.js          # Anthropic API wrapper
    vault.js           # AgentVault client (Avalanche on-chain payments)
    logger.js          # File logger (/tmp/zea/zea-YYYY-MM-DD.log)
    models/
      plant_disease_model.onnx  # MobileNetV2 PlantVillage (8.8MB, 38 classes)
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
  x402/
    AgentVault.sol              # Solidity contract (ERC-8004 inspired)
    AgentVault.flat.sol         # Flattened for deployment
    deploy.mjs                  # Deployment script
    build/                      # Compiled ABI + bytecode
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

## Demo

https://github.com/user-attachments/assets/fd13da6b-1a38-4b68-85ce-26fbdd196a46

> 📱 Conversación real de WhatsApp: foto → diagnóstico → recomendación AMP → pago on-chain

> **Probalo ahora:** [+54 9 11 2261-1627](https://wa.me/5491122611627?text=Hola%2C%20quiero%20diagnosticar%20mi%20cultivo) | [Web](https://getzea.com) | [Vault Dashboard](https://getzea.com/vault)

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
|  FASE 0 -- ML LOCAL (MobileNet)   |
|  MobileNetV2 clasifica la imagen  |
|  ~300ms, corre local, gratis      |
|  Si confianza >= 80%: usa el      |
|  resultado. Si no: pasa a la IA   |
+------------------------------------+
         |  (>80%: salta a Fase 2)
         v  (<80%: continúa)
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

## Pagos (x402 + ERC-8004 en Avalanche)

Zea tiene su propia **wallet on-chain** y paga por cada diagnóstico de forma autónoma a través de un smart contract **AgentVault** desplegado en **Avalanche C-Chain mainnet**.

### Cómo funciona

1. El agricultor manda una foto → Zea diagnostica la planta
2. Si el diagnóstico es exitoso, el agente firma una transacción `pay()` on-chain
3. **$0.05 USDC** por diagnóstico, registrado como evento on-chain
4. La cooperativa (dueña del vault) configura límites diarios de gasto
5. Cada pago es verificable en Snowtrace

### Contratos

| Contrato | Dirección | Red |
|----------|-----------|-----|
| **AgentVault** | [`0x87D43066906B393df07aD27AaE3d66E821361aC1`](https://snowtrace.io/address/0x87D43066906B393df07aD27AaE3d66E821361aC1) | Avalanche C-Chain |
| **USDC** | [`0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E`](https://snowtrace.io/address/0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E) | Avalanche C-Chain |

### AgentVault (inspirado en ERC-8004)

El vault guarda USDC en nombre del agente. El **owner** (cooperativa) deposita fondos y establece límites. El **agente** (wallet server-side de Zea) puede gastar autónomamente hasta el tope diario.

- `deposit(amount)` — la cooperativa fondea el vault
- `pay(to, amount, reason)` — el agente paga por un servicio (ej: `"diagnosis:botrytis_cinerea"`)
- `setDailyLimit(limit)` — la cooperativa ajusta el tope de gasto
- `remainingToday()` — consultar cuánto queda hoy
- `balance()` — consultar balance USDC del vault

Cada `pay()` emite un evento `Payment` con el motivo — completamente auditable on-chain.

### Rate limiting + 402

Cada usuario tiene **10 diagnósticos gratuitos por hora**. Después del límite, la API retorna HTTP 402 con headers del protocolo x402:

```
HTTP/1.1 402 Payment Required
X-Payment-Amount: 0.05
X-Payment-Currency: USDC
X-Payment-Network: avalanche
X-Payment-Vault: 0x87D43066906B393df07aD27AaE3d66E821361aC1
```

### API

`GET /api/vault` — retorna estado del vault (ver sección en inglés).

### Vault Dashboard

En vivo en **[getzea.com/vault](https://getzea.com/vault)** — un dashboard en tiempo real que muestra:

- Balance USDC del vault
- Límite diario de gasto y remanente (barra de progreso)
- Direcciones de contratos con links a Snowtrace
- Transacciones de pago recientes verificables on-chain
- Diagrama del flujo de pago

Se actualiza cada 15 segundos. Mandá una foto, mirá cómo aparece el pago en vivo.

Para demos, el rate limit se puede bypassear con un token vía el header `X-Demo-Token`.

---

## Equipo

Construido en **Aleph Hackathon 2026**

## Licencia

MIT
