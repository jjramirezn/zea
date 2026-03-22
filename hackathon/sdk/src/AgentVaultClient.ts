import {
  Contract,
  Signer,
  parseEther,
  parseUnits,
  formatEther,
  formatUnits,
  ZeroAddress,
  type ContractTransactionResponse,
  type ContractTransactionReceipt,
} from "ethers";
import {
  VaultRules,
  VaultInfo,
  RemainingBudget,
  CreateVaultResult,
  ETH_ADDRESS,
} from "./types";
import { AGENT_VAULT_ABI } from "./abi";

// Minimal ERC-20 ABI for approval + decimals
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

/**
 * Human-friendly TypeScript client for the AgentVault contract.
 *
 * Amounts are passed as ETH-formatted strings (e.g. "0.1") and
 * converted to wei internally.
 */
export class AgentVaultClient {
  public readonly contract: Contract;
  public readonly address: string;

  constructor(contractAddress: string, private signer: Signer) {
    this.address = contractAddress;
    this.contract = new Contract(contractAddress, AGENT_VAULT_ABI, signer);
  }

  // ─── Vault Lifecycle ────────────────────────────

  /** Create a new vault with the given agent address. Returns vaultId. */
  async createVault(agentAddress: string): Promise<CreateVaultResult> {
    const tx: ContractTransactionResponse =
      await this.contract.createVault(agentAddress);
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed — no receipt");

    // Parse VaultCreated event to get the vaultId
    const event = receipt.logs
      .map((log) => {
        try {
          return this.contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e?.name === "VaultCreated");

    if (!event) throw new Error("VaultCreated event not found in receipt");

    return {
      vaultId: event.args.vaultId,
      transactionHash: receipt.hash,
    };
  }

  /** Revoke the agent from a vault (owner only). */
  async revokeAgent(vaultId: bigint | number): Promise<ContractTransactionReceipt> {
    const tx = await this.contract.revokeAgent(vaultId);
    return this._waitForTx(tx);
  }

  /** Update the agent for a vault (owner only). */
  async updateAgent(
    vaultId: bigint | number,
    newAgent: string
  ): Promise<ContractTransactionReceipt> {
    const tx = await this.contract.updateAgent(vaultId, newAgent);
    return this._waitForTx(tx);
  }

  // ─── Deposits ───────────────────────────────────

  /** Deposit native ETH into a vault. Amount as string (e.g. "0.5"). */
  async deposit(
    vaultId: bigint | number,
    amount: string
  ): Promise<ContractTransactionReceipt> {
    const value = parseEther(amount);
    const tx = await this.contract.deposit(vaultId, { value });
    return this._waitForTx(tx);
  }

  /**
   * Deposit an ERC-20 token into a vault.
   * Handles approval automatically if needed.
   * @param amount Human-readable amount (uses token's decimals)
   * @param decimals Token decimals (default 18)
   */
  async depositToken(
    vaultId: bigint | number,
    tokenAddress: string,
    amount: string,
    decimals: number = 18
  ): Promise<ContractTransactionReceipt> {
    const parsedAmount = parseUnits(amount, decimals);
    const token = new Contract(tokenAddress, ERC20_ABI, this.signer);

    // Check and set approval if needed
    const signerAddr = await this.signer.getAddress();
    const currentAllowance: bigint = await token.allowance(
      signerAddr,
      this.address
    );
    if (currentAllowance < parsedAmount) {
      const approveTx = await token.approve(this.address, parsedAmount);
      await approveTx.wait();
    }

    const tx = await this.contract.depositToken(
      vaultId,
      tokenAddress,
      parsedAmount
    );
    return this._waitForTx(tx);
  }

  // ─── Rules ──────────────────────────────────────

  /** Set spending rules for a vault (owner only). */
  async setRules(
    vaultId: bigint | number,
    rules: VaultRules
  ): Promise<ContractTransactionReceipt> {
    const onChainRules = {
      maxPerTransaction: rules.maxPerTransaction
        ? parseEther(rules.maxPerTransaction)
        : 0n,
      dailyLimit: rules.dailyLimit ? parseEther(rules.dailyLimit) : 0n,
      monthlyLimit: rules.monthlyLimit ? parseEther(rules.monthlyLimit) : 0n,
      allowedRecipients: rules.allowedRecipients ?? [],
      allowedTokens: rules.allowedTokens ?? [],
      validFrom: this._parseTimestamp(rules.validFrom),
      validUntil: this._parseTimestamp(rules.validUntil),
    };

    const tx = await this.contract.setRules(vaultId, onChainRules);
    return this._waitForTx(tx);
  }

  /** Get the current rules for a vault. */
  async getRules(vaultId: bigint | number): Promise<VaultRules> {
    const r = await this.contract.getRules(vaultId);
    return {
      maxPerTransaction: formatEther(r.maxPerTransaction),
      dailyLimit: formatEther(r.dailyLimit),
      monthlyLimit: formatEther(r.monthlyLimit),
      allowedRecipients: [...r.allowedRecipients],
      allowedTokens: [...r.allowedTokens],
      validFrom: Number(r.validFrom),
      validUntil: Number(r.validUntil),
    };
  }

  // ─── Spending ───────────────────────────────────

  /**
   * Agent spends from a vault.
   * @param token Token address, defaults to ETH (zero address)
   * @param decimals Token decimals (default 18)
   */
  async spend(
    vaultId: bigint | number,
    to: string,
    amount: string,
    token: string = ETH_ADDRESS,
    decimals: number = 18
  ): Promise<ContractTransactionReceipt> {
    const parsedAmount =
      token === ETH_ADDRESS
        ? parseEther(amount)
        : parseUnits(amount, decimals);
    const tx = await this.contract.spend(vaultId, to, parsedAmount, token);
    return this._waitForTx(tx);
  }

  // ─── Withdrawals ────────────────────────────────

  /**
   * Owner withdraws from a vault.
   * @param token Token address, use ETH_ADDRESS for native ETH
   * @param decimals Token decimals (default 18)
   */
  async withdraw(
    vaultId: bigint | number,
    token: string,
    amount: string,
    decimals: number = 18
  ): Promise<ContractTransactionReceipt> {
    const parsedAmount =
      token === ETH_ADDRESS
        ? parseEther(amount)
        : parseUnits(amount, decimals);
    const tx = await this.contract.withdraw(vaultId, token, parsedAmount);
    return this._waitForTx(tx);
  }

  // ─── View Methods ───────────────────────────────

  /** Get vault info (owner, agent, rulesSet). */
  async getVault(vaultId: bigint | number): Promise<VaultInfo> {
    const [owner, agent, rulesSet] = await this.contract.vaults(vaultId);
    return { owner, agent, rulesSet };
  }

  /**
   * Get remaining daily/monthly budget for a token.
   * @param token Defaults to ETH
   * @param decimals Token decimals for formatting (default 18)
   */
  async getRemainingBudget(
    vaultId: bigint | number,
    token: string = ETH_ADDRESS,
    decimals: number = 18
  ): Promise<RemainingBudget> {
    const [daily, monthly] = await this.contract.getRemainingBudget(
      vaultId,
      token
    );
    const fmt = token === ETH_ADDRESS ? formatEther : (v: bigint) => formatUnits(v, decimals);
    return {
      dailyRemaining: fmt(daily),
      monthlyRemaining: fmt(monthly),
    };
  }

  /**
   * Get vault balance for a token.
   * @param token Defaults to ETH
   * @param decimals Token decimals for formatting (default 18)
   */
  async getBalance(
    vaultId: bigint | number,
    token: string = ETH_ADDRESS,
    decimals: number = 18
  ): Promise<string> {
    if (token === ETH_ADDRESS) {
      const bal: bigint = await this.contract.ethBalances(vaultId);
      return formatEther(bal);
    } else {
      const bal: bigint = await this.contract.tokenBalances(vaultId, token);
      return formatUnits(bal, decimals);
    }
  }

  // ─── Helpers ────────────────────────────────────

  private async _waitForTx(
    tx: ContractTransactionResponse
  ): Promise<ContractTransactionReceipt> {
    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed — no receipt");
    return receipt;
  }

  private _parseTimestamp(value?: string | number): bigint {
    if (value === undefined || value === 0 || value === "") return 0n;
    if (typeof value === "number") return BigInt(value);
    // Try ISO date string
    const ms = Date.parse(value);
    if (!isNaN(ms)) return BigInt(Math.floor(ms / 1000));
    // Try numeric string
    const n = Number(value);
    if (!isNaN(n)) return BigInt(Math.floor(n));
    throw new Error(`Invalid timestamp: ${value}`);
  }
}
