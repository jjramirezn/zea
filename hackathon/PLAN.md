# AgentVault — Build Plan

## Architecture
```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Human UI   │────▶│   AgentVault     │◀────│  AI Agent   │
│  (Next.js)   │     │ (Solidity/Base)  │     │  (Skill)    │
└─────────────┘     └──────────────────┘     └─────────────┘
```

## Components
1. **Smart Contract** — `AgentVault.sol` on Base mainnet
2. **TypeScript SDK** — `@agentvault/sdk` for agent interaction  
3. **Skill** — `agent-wallet` OpenClaw skill
4. **Frontend** — Next.js dashboard for humans

## Contract Design (v1)
- `createVault(agent)` — human creates vault, designates agent address
- `deposit()` — human deposits ETH or ERC-20
- `setRules(rules)` — human sets spending rules
- `spend(to, amount, token)` — agent spends (validated against rules)
- `withdraw()` — human withdraws (always full control)
- `revokeAgent()` — human revokes agent access

### Rule Types (v1)
- Max per transaction
- Daily spending limit
- Allowed recipient addresses (whitelist)
- Allowed tokens
- Time window (start/end timestamps)

## Priority Order
1. ✅ Contract — AgentVault.sol written, compiles clean
2. ✅ Tests — 38 tests, all passing
3. ✅ SDK — TypeScript SDK with all 13 methods, compiles clean
4. ✅ Skill — agent-wallet skill with SKILL.md, vault.ts CLI, README
5. Frontend ← NEXT
6. Deploy to Base mainnet (needs Jota for private key / gas)
7. Multi-chain deploy (Celo, etc.)
8. Prize-specific integrations (stETH, Locus, etc.)

## Target Tracks
- ERC-8004 Agents With Receipts
- Let the Agent Cook  
- Best Use of Delegations
- stETH Agent Treasury
- Open Track
