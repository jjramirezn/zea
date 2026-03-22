/**
 * Human-friendly spending rules for a vault.
 * Amounts are ETH-denominated strings (e.g. "0.5", "100").
 */
export interface VaultRules {
  /** Max amount per single transaction (e.g. "0.1") — 0 or omit for unlimited */
  maxPerTransaction?: string;
  /** Daily spending limit (e.g. "1.0") — 0 or omit for unlimited */
  dailyLimit?: string;
  /** Monthly (30-day) spending limit (e.g. "10.0") — 0 or omit for unlimited */
  monthlyLimit?: string;
  /** Whitelist of allowed recipient addresses — empty for any */
  allowedRecipients?: string[];
  /** Whitelist of allowed token addresses — empty for any. Use ETH constant for native ETH */
  allowedTokens?: string[];
  /** Rules active from (ISO date string or Unix timestamp) — omit for immediate */
  validFrom?: string | number;
  /** Rules active until (ISO date string or Unix timestamp) — omit for no expiry */
  validUntil?: string | number;
}

/** Vault info returned by getVault */
export interface VaultInfo {
  owner: string;
  agent: string;
  rulesSet: boolean;
}

/** Remaining budget for a token in a vault */
export interface RemainingBudget {
  /** Remaining daily budget in human-readable units */
  dailyRemaining: string;
  /** Remaining monthly budget in human-readable units */
  monthlyRemaining: string;
}

/** Result of createVault */
export interface CreateVaultResult {
  vaultId: bigint;
  transactionHash: string;
}

/** The zero address, representing native ETH in the contract */
export const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
