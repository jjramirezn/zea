# 🧬 AMP Agent — Antimicrobial Peptide Diagnostics

AI-powered agricultural disease diagnosis and antimicrobial peptide recommendations.

## What it does

1. **Upload** a photo of a diseased plant (or describe symptoms)
2. **Diagnose** — AI identifies the pathogen using computer vision
3. **Recommend** — Agent suggests effective antimicrobial peptides from curated database
4. **Pay** — x402 payment integration for per-diagnosis billing

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend   │────▶│  AMP Agent   │────▶│  AMP Database│
│  (Web Chat)  │     │  (OpenClaw)  │     │  (Curated)   │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │ Vision Model  │
                    │ (Plant ID)    │
                    └──────────────┘
```

## Components

- `frontend/` — Web chat interface with image upload
- `agent/skill/` — OpenClaw skill (prompts, flow, config)
- `agent/data/` — Curated pathogen → AMP database
- `agent/scripts/` — Helper scripts
- `x402/` — Payment integration
- `docs/` — Documentation and references

## Tech Stack

- **Agent runtime:** OpenClaw
- **Vision:** Claude / GPT-4o (plant disease identification)
- **Data:** Curated from APD3, DRAMP public databases
- **Payments:** x402 protocol (USDC)
- **Frontend:** React (TBD)

## Team

Built at [Hackathon Name] — March 2026

## License

MIT
