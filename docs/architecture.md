# Zea -- Architecture

## Overview

Zea uses a **Hybrid Pipeline** where AI handles only language (input/output) and all critical decisions are deterministic code. This prevents hallucinated recommendations -- the AI cannot invent a peptide, skip a biosecurity alert, or recommend a treatment that does not exist in the curated database.

## Pipeline

```
User (WhatsApp)
        |
        v
+-- PHASE 1: DIAGNOSIS (AI) ---------------+
| Input: plant photo + text                 |
| Model: Claude Sonnet 4                    |
| Output: structured JSON only             |
| Constrained to closed vocabulary          |
| Can only match pathogens in our DB        |
| File: backend/prompts.js                  |
+-------------------------------------------+
        | JSON with mvp_match_name
        v
+-- PHASE 2: AMP LOOKUP (code) ------------+
| lookupAMP(mvp_match_name)                |
| Exact string match against                |
| matcher_patogenos.json                    |
| NO AI involved. Cannot hallucinate.       |
| File: backend/pipeline.js                |
+-------------------------------------------+
        |
        v
+-- PHASE 3: BIOSECURITY (code) -----------+
| checkBiosecurity(alertId)                 |
| Checks biosecurity-alerts.json            |
| Red alerts -> BLOCK treatment             |
| Quarantine -> contact authorities         |
| NO AI involved.                           |
| File: backend/pipeline.js                |
+-------------------------------------------+
        |
        v
+-- PHASE 4: TRANSLATION (AI) -------------+
| Takes verified pipeline data              |
| Writes farmer-friendly response           |
| CANNOT change the data                    |
| File: backend/prompts.js                  |
+-------------------------------------------+
```

## Channels

WhatsApp is the primary (and only) user-facing channel. OpenClaw receives photos via WhatsApp, calls `diagnose.sh` which hits `localhost:8080/api/chat` with the same multipart format.

The `frontend/` directory contains a static landing page served independently (e.g. via nginx or GitHub Pages). It has no connection to the backend API -- it only links to WhatsApp.

## Data Files

| File | Purpose | Used by |
|------|---------|---------|
| `agent/data/matcher_patogenos.json` | Pathogen -> AMP lookup (5 entries). Sequence, MIC, source DB. | Phase 2 (`lookupAMP`) |
| `agent/data/biosecurity-alerts.json` | Red alerts and guardrails (10 entries). Blocks dangerous recommendations. | Phase 3 (`lookupBiosecurityAlert`, `getChemicalWarnings`) |
| `agent/data/cerebro_ambiental.json` | Environmental context: how climate stress affects plant + pathogen (2 entries). | Phase 2 (`lookupEnvironment`) |
| `agent/data/traductor_agentes.json` | AMP chemistry explained in technical + farmer-friendly language (3 entries). | Phase 2 (`lookupTranslation`) |

## Project Structure

```
backend/
  server.js      -- Entry point: HTTP API, rate limiting, multipart parsing, orchestration
  prompts.js     -- PHASE1_PROMPT, PHASE1_TEXT_PROMPT, PHASE4_SYSTEM
  pipeline.js    -- Data loading + deterministic functions (lookups, biosecurity, pipeline)
  claude.js      -- callClaude (Anthropic API wrapper)

frontend/
  index.html     -- Static landing page (WhatsApp CTA only, no API connection)
```

## Request Flow

1. HTTP server receives `POST /api/chat` (multipart: `message` + optional `image`)
2. Rate limit check -- 10 req/hour per IP, bypass with demo token, HTTP 402 with x402 headers on limit
3. Build message content array (image as base64 + text)
4. **Phase 1:** `callClaude(PHASE1_PROMPT, messages)` -> parse JSON response
5. If `needs_more_info`: return early asking for better photos
6. **Phase 2-3:** `deterministicPipeline(diagnosis)` -> AMP lookup, biosecurity check, env context, translations
7. **Phase 4:** `callClaude(PHASE4_SYSTEM, pipelineResults)` -> farmer-friendly text
8. Return `{ reply }` to client

## Anti-Hallucination Safeguards

1. **Closed vocabulary:** Phase 1 prompt constrains the AI to only match pathogens that exist in the MVP database. It cannot invent names.
2. **Deterministic selection:** Phase 2 is a pure string match. No AI involved in AMP selection.
3. **Biosecurity hard-blocks:** Phase 3 blocks treatment for dangerous pathogens (aflatoxins, quarantine diseases) regardless of AI output.
4. **Data immutability in Phase 4:** The AI receives verified pipeline results and can only translate them. It cannot add or change AMP recommendations.
5. **Confidence levels:** Each diagnosis includes HIGH/MEDIUM/LOW confidence with defined criteria.
6. **User authority:** If the user names their crop, the system trusts them over visual identification.
7. **Mandatory disclaimer:** Every recommendation ends with an in-vitro validation warning.

## Rate Limiting and Payments

- 10 free requests per hour per IP
- After limit: HTTP 402 with x402 payment headers ($0.50 USDC per diagnosis)
- Demo bypass via `X-Demo-Token` header or `?demo=` query parameter

---

## Roadmap

### Phase A: Consolidate data files

`pathogen-amp-db.json` contains different AMP recommendations than `matcher_patogenos.json` for the same pathogens and is not used by the pipeline. Remove it or consolidate with `matcher_patogenos.json` to avoid confusion.

### Phase B: Add tests for the deterministic pipeline

The deterministic functions (`lookupAMP`, `lookupBiosecurityAlert`, `deterministicPipeline`) are the most critical part of the system and the easiest to test. Add unit tests that validate:
- Every pathogen in `matcher_patogenos.json` returns a result from `lookupAMP`
- Every biosecurity alert ID resolves correctly
- Blocked pathogens actually block the pipeline
- Unmatched pathogens return null gracefully

### Phase C: Optimize Phase 4 token usage

Phase 4 currently receives the full conversation history including previous base64 images. For multi-turn conversations this inflates token usage significantly. Strip images from history before sending to Phase 4, or send only the current turn + pipeline results.

### Phase D: Robust multipart parsing

The manual multipart parser mixes binary and string encoding in ways that can break with unusual filenames or content types. Replace with a lightweight library like `busboy` for production reliability.
