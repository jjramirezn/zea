# agent-wallet

An OpenClaw skill that lets AI agents interact with [AgentVault](../contracts/AgentVault.sol) — an on-chain wallet on Base with human-defined spending guardrails.

## What It Does

Your human creates a vault, deposits funds, and sets rules (daily limits, per-transaction caps, recipient whitelists). Your agent spends within those rules. The human retains full control — they can revoke access, withdraw funds, or change rules at any time.

## Install

```bash
cd ~/clawd/hackathon/skill
npm install
```

## Configure

Set these environment variables:

| Variable | Description |
|---|---|
| `VAULT_CONTRACT` | Deployed AgentVault contract address on Base |
| `PRIVATE_KEY` | Agent's private key (the wallet authorized on the vault) |

## Usage

```bash
# Check vault status, balance, rules, remaining budget
npx tsx vault.ts status <vaultId>

# Spend ETH
npx tsx vault.ts spend <vaultId> <recipientAddress> <amount>

# Spend an ERC-20 token
npx tsx vault.ts spend <vaultId> <recipientAddress> <amount> <tokenAddress>

# View recent spend history
npx tsx vault.ts history <vaultId>
```

All output is JSON.

## How the Human Sets Up a Vault

1. Go to the AgentVault frontend
2. Connect wallet, click "Create Vault", enter the agent's wallet address
3. Deposit ETH or tokens
4. Set rules — daily limit, per-tx max, allowed recipients, time windows
5. Share the vault ID with the agent

The agent reads `SKILL.md` each session and uses the CLI to operate within the rules.

## Chain

- **Network:** Base mainnet (chainId 8453)
- **RPC:** https://mainnet.base.org
