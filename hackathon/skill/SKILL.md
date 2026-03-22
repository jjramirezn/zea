# Agent Wallet — AgentVault Skill

AgentVault is an on-chain smart contract on Base that gives AI agents a wallet with human-defined spending guardrails. Your human deposits funds and sets rules (daily limits, per-tx caps, allowed recipients). You spend within those rules — no more, no less.

## Setup

- **Chain:** Base (chainId `8453`)
- **RPC:** `https://mainnet.base.org`
- **Contract:** `{{CONTRACT_ADDRESS}}`
- **Your private key** must be set as `PRIVATE_KEY` env var
- **Contract address** must be set as `VAULT_CONTRACT` env var

## Commands

Run via `npx tsx ~/clawd/hackathon/skill/vault.ts <command>`:

### Check vault status
```bash
npx tsx ~/clawd/hackathon/skill/vault.ts status <vaultId>
```
Returns: ETH balance, rules (limits, allowed recipients/tokens, time window), remaining daily/monthly budget.

### Spend funds
```bash
npx tsx ~/clawd/hackathon/skill/vault.ts spend <vaultId> <to> <amount> [tokenAddress]
```
- `amount` in ETH (e.g. "0.01")
- `tokenAddress` is optional — omit for native ETH, provide ERC-20 address for tokens
- The contract enforces all rules. If you exceed a limit, the tx reverts.

### View spend history
```bash
npx tsx ~/clawd/hackathon/skill/vault.ts history <vaultId>
```
Returns recent `Spent` events from the chain.

## How It Works

1. **Human creates a vault** via the frontend, designating your wallet address as the agent
2. **Human deposits funds** (ETH or tokens) and **sets rules** (spending limits, whitelists, time windows)
3. **You operate within those rules** — check your budget before spending, respect the limits
4. **Human retains full control** — they can revoke your access, withdraw funds, or change rules at any time

## Common Workflows

### Before spending, always check your budget:
```bash
npx tsx ~/clawd/hackathon/skill/vault.ts status 0
```

### Send ETH to someone:
```bash
npx tsx ~/clawd/hackathon/skill/vault.ts spend 0 0xRecipient 0.01
```

### Send USDC (example):
```bash
npx tsx ~/clawd/hackathon/skill/vault.ts spend 0 0xRecipient 5.0 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

## Important

- All output is JSON — parse it programmatically
- If a spend fails, check the error — you likely hit a rule limit
- The address `0x0000000000000000000000000000000000000000` represents native ETH
- You cannot change the rules — only your human can
