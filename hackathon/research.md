# Competitive Landscape: AI Agent Wallets with Spending Guardrails

*Research date: 2026-03-17*

## Our Project Idea
Smart contract where a human deposits funds, sets spending rules (limits, allowed tokens, allowed contracts, time windows), and an AI agent can spend within those constraints autonomously.

---

## 1. Coinbase AgentKit + Agentic Wallets

**What:** SDK (Python/TS) that gives any AI agent a crypto wallet. Framework-agnostic (works with LangChain, Vercel AI, etc). Launched "Agentic Wallets" in Feb 2026 — purpose-built wallet infra for autonomous agents.

**How it works:**
- Agent gets an embedded wallet via Coinbase Developer Platform (CDP)
- "Security Suite" provides programmable guardrails + compliance screening
- CDP Portal for usage monitoring and agent management
- Supports fee-free stablecoin payments
- `npm create onchain-agent@latest` for quick start

**Relation to our project:** AgentKit is the **agent-side SDK** — it gives agents wallet capabilities. But the guardrails are CDP-managed (centralized, off-chain policy). Our project could be the **on-chain guardrail layer** that AgentKit agents interact with. We could build an AgentKit plugin that connects to our smart contract.

**Repo:** https://github.com/coinbase/agentkit

---

## 2. Safe{Wallet} Allowance Module for AI Agents

**What:** Safe (formerly Gnosis Safe) has a native **Allowance Module** that lets you grant spending limits to specific addresses. They have explicit docs for "AI agent with spending limit for a treasury."

**How it works:**
- Deploy a Safe Smart Account (multisig)
- Enable the Allowance Module
- Set per-token, per-delegate allowances with optional reset periods
- Agent's key is added as a delegate (not a signer) — can only spend within allowance
- Human owners retain full control, can revoke anytime

**Relation to our project:** This is the **closest existing solution** to what we want to build. Safe's allowance module already does "human sets rules, agent spends within them." We could either:
- **Build on top of Safe** (use their module system, add more sophisticated rules)
- **Build a standalone alternative** that's simpler/more focused on AI agent UX

**Docs:** https://docs.safe.global/home/ai-agent-quickstarts/agent-with-spending-limit

---

## 3. ERC-8004: Trustless Agents

**What:** Ethereum standard (Aug 2025) that provides three on-chain registries for AI agents: **Identity**, **Reputation**, and **Validation**. Backed by ENS, EigenLayer, The Graph, Taiko.

**How it works:**
- **Identity Registry** — ERC-721 NFT-based handles for agents, resolves to a registration file (like an agent's business card)
- **Reputation Registry** — Standard interface for posting/fetching feedback on agents
- **Validation Registry** — Verify agent claims
- Extends Google's A2A (Agent-to-Agent) protocol with a trust layer
- Agents get ephemeral token-based identities (not fixed accounts)

**Relation to our project:** Complementary, not competing. ERC-8004 handles **agent identity & reputation** — useful for knowing *which* agent to trust with funds. We could integrate it so humans can verify an agent's reputation before granting spending access. Could be a nice "trust score" feature.

---

## 4. MetaMask Delegation Toolkit / ERC-7710 / ERC-7715

**What:** MetaMask's framework for delegating **fine-grained permissions** from smart accounts to other accounts (including AI agents). Uses ERC-7710 (on-chain delegation) and ERC-7715 (permission request standard).

**How it works:**
- User has a MetaMask Smart Account (smart contract wallet)
- Dapp/agent requests permissions via ERC-7715 (e.g., "allow me to stream up to X tokens per second")
- User approves in MetaMask, creating an **off-chain signed delegation** with enforceable rules
- Delegations can be: time-limited, amount-capped, contract-scoped
- Example permission types: `native-token-stream` with `amountPerSecond`, `maxAmount`, `startTime`
- No repetitive confirmations — approve once, agent acts within bounds

**Relation to our project:** This is **very relevant** — it's essentially what we want but built into MetaMask's ecosystem. Key differences:
- MetaMask Delegation = wallet-native feature, requires MetaMask Smart Accounts
- Our project = standalone smart contract, wallet-agnostic
- We could potentially **use ERC-7710 as the delegation standard** in our contract
- Or we build something simpler that works with any EOA/wallet

**Docs:** https://docs.metamask.io/smart-accounts-kit/

---

## 5. x402 Payment Protocol

**What:** Open standard by Coinbase that uses HTTP `402 Payment Required` status code to embed stablecoin payments directly into web requests. Designed for both humans and AI agents.

**How it works:**
- Client requests a resource → server responds with `402` + payment requirements
- Client signs a stablecoin payment → sends it in the HTTP header
- Server verifies payment → returns the resource with `200 OK`
- Built on existing HTTP — no additional communication protocol needed
- Extensible via "schemes" (different ways to settle: direct transfer, streaming, etc.)

**Relation to our project:** x402 is about **how agents pay for things** (the payment protocol), not about guardrails. Our project is about **constraining what agents can pay for**. They're complementary:
- Agent uses x402 to pay for API calls/services
- Our smart contract enforces that the agent can only spend $X/day on approved services
- Integration opportunity: our contract could be the "wallet backend" that x402 agents draw from

**Repo:** https://github.com/coinbase/x402

---

## 6. Session Keys in ERC-4337 (Account Abstraction)

**What:** Pattern within ERC-4337 smart accounts where a temporary key is authorized to perform scoped actions on behalf of the account.

**How it works:**
- Smart account owner creates a session key (a fresh keypair)
- Defines permissions: allowed contracts, allowed functions, spending limits, expiry time
- Session key is registered in the account's validation logic (plugin/module)
- Agent holds the session key's private key → can submit UserOperations within scope
- `validateUserOp()` checks the session key's permissions before executing
- **Not standardized** — implemented differently per wallet (ZeroDev, Biconomy, etc.)

**Relation to our project:** Session keys are the **core mechanism** we'd likely use. Instead of giving the agent the owner's private key, we give it a session key with scoped permissions. Key implementations to study:
- **ZeroDev** — most mature session key implementation for ERC-4337
- **Biconomy** — also has session key modules
- We could build our guardrail contract as a session key validator module

**ZeroDev docs:** https://docs.zerodev.app/smart-wallet/permissions/intro

---

## 7. Other Existing Projects

### Privy Agentic Wallets
- Server wallets with **policy-based guardrails** for AI agents
- Supports spending limits, contract allowlists, multi-party approvals
- Has an OpenClaw skill already: https://github.com/privy-io/privy-agentic-wallets-skill

### Openfort Agent Wallets
- Non-custodial wallets for AI agents with built-in guardrails
- Spending limits, contract allowlists, multi-party approvals, audit trails
- Commercial product (not open source)

### AgentVault (Solana)
- "Your Personal AI Agent Wallet on Solana" — autonomous DeFi within user-defined guardrails
- Natural language intent → agent executes trades/swaps within bounds
- Solana-only, but similar concept to ours on EVM
- https://github.com/cloudweaver/agentvault

### Polygon Agent CLI
- End-to-end toolkit for AI agents: create wallets, move stablecoins, bridge, register identity
- Focused on Polygon ecosystem

### safeGPT
- AI agent that helps set up Safe multisigs and manage allowance modules
- More of a tool than infrastructure: https://github.com/phdargen/safeGPT

---

## Key Takeaways for Our Build

### What already exists
- Safe Allowance Module → basic spending limits per token per delegate ✅
- MetaMask Delegation Toolkit → fine-grained permissions with ERC-7715 ✅
- Session keys (ZeroDev/Biconomy) → scoped temporary access ✅
- Coinbase/Privy/Openfort → centralized guardrail services ✅

### Where the gap is (our opportunity)
1. **No simple, standalone, open-source smart contract** that does "deposit → set rules → agent spends" without requiring Safe, MetaMask Smart Accounts, or a centralized service
2. **Rule expressiveness** — existing solutions do basic limits. Nobody does "only allow swaps on Uniswap for USDC↔ETH, max $100/day, only during business hours"
3. **Human-friendly UX** — most solutions are developer-focused. A clean UI where non-technical users set guardrails would be novel
4. **Cross-framework** — works with any AI agent (AgentKit, LangChain, custom) regardless of wallet provider

### Recommended Architecture
```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Human      │────▶│  GuardrailVault  │◀────│  AI Agent   │
│  (depositor) │     │  (smart contract)│     │ (session key│
│              │     │                  │     │  holder)    │
└─────────────┘     └──────────────────┘     └─────────────┘
     │                       │                       │
     │ deposit()             │ enforces rules         │ spend()
     │ setRules()            │ per-token limits       │ (validated)
     │ revokeAgent()         │ contract allowlist     │
     │                       │ time windows           │
     │                       │ daily/weekly caps       │
```

### Tech Stack Options
1. **Simplest (hackathon-friendly):** Plain Solidity contract with mapping-based rules. Agent has an EOA, contract checks `msg.sender` permissions. No ERC-4337 needed.
2. **More sophisticated:** Build as a Safe Module — leverages Safe's security, works with existing Safe wallets.
3. **Most aligned with standards:** ERC-4337 smart account + session key validator module. Future-proof but more complex.

**Recommendation for hackathon: Option 1** — standalone Solidity contract. Simple, demo-able, no dependencies. Can always add Safe/4337 integration later.
