/**
 * AgentVault client — lets Zea pay for diagnoses on-chain via Avalanche C-Chain.
 * Each successful diagnosis triggers a $0.05 USDC payment from the vault.
 */

const AVAX_RPC = 'https://api.avax.network/ext/bc/C/rpc';
const VAULT_ADDRESS = '0x87D43066906B393df07aD27AaE3d66E821361aC1';
const USDC_ADDRESS = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';
const DIAGNOSIS_COST = 50000; // $0.05 USDC (6 decimals)
const SERVICE_RECIPIENT = '0x5950a309F5E91C48f5532d2FE6F1BaB0587f0B82'; // fees go back to cooperative/owner

const VAULT_ABI = [
  'function pay(address to, uint256 amount, string reason)',
  'function balance() view returns (uint256)',
  'function remainingToday() view returns (uint256)',
  'function dailyLimit() view returns (uint256)',
  'function agent() view returns (address)',
  'function owner() view returns (address)',
  'event Payment(address indexed from, address indexed to, uint256 amount, string reason)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)'
];

let ethers = null;
let wallet = null;
let vault = null;
let provider = null;

async function init() {
  if (vault) return true;

  const agentKey = process.env.AGENT_PRIVATE_KEY;
  if (!agentKey) {
    console.warn('[vault] AGENT_PRIVATE_KEY not set — on-chain payments disabled');
    return false;
  }

  try {
    // Dynamic import ethers
    ethers = await import('ethers');
    provider = new ethers.JsonRpcProvider(AVAX_RPC);
    wallet = new ethers.Wallet(agentKey, provider);
    vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wallet);

    // Verify agent is authorized
    const onChainAgent = await vault.agent();
    if (onChainAgent.toLowerCase() !== wallet.address.toLowerCase()) {
      console.error(`[vault] Wallet ${wallet.address} is NOT the authorized agent (expected ${onChainAgent})`);
      vault = null;
      return false;
    }

    const bal = await vault.balance();
    const remaining = await vault.remainingToday();
    console.log(`[vault] ✅ Connected to AgentVault on Avalanche`);
    console.log(`[vault]    Address: ${VAULT_ADDRESS}`);
    console.log(`[vault]    Agent: ${wallet.address}`);
    console.log(`[vault]    Vault balance: $${Number(bal) / 1e6} USDC`);
    console.log(`[vault]    Remaining today: $${Number(remaining) / 1e6} USDC`);
    return true;
  } catch (err) {
    console.error('[vault] Failed to initialize:', err.message);
    vault = null;
    return false;
  }
}

/**
 * Pay for a diagnosis on-chain.
 * @param {string} reason - e.g. "diagnosis:botrytis_cinerea"
 * @returns {{ success, txHash, error }}
 */
async function payForDiagnosis(reason) {
  if (!vault) {
    const ok = await init();
    if (!ok) return { success: false, error: 'vault not configured' };
  }

  try {
    // Check agent has gas
    const gasBalance = await provider.getBalance(wallet.address);
    if (gasBalance === 0n) {
      return { success: false, error: 'agent has no AVAX for gas' };
    }

    const tx = await vault.pay(SERVICE_RECIPIENT, DIAGNOSIS_COST, reason);
    const receipt = await tx.wait();

    console.log(`[vault] 💰 Paid $0.05 USDC for: ${reason} (tx: ${receipt.hash})`);

    return {
      success: true,
      txHash: receipt.hash,
      amount: '$0.05',
      snowtrace: `https://snowtrace.io/tx/${receipt.hash}`
    };
  } catch (err) {
    console.error('[vault] Payment failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get vault status (read-only, no gas needed).
 */
async function getVaultStatus() {
  if (!vault) {
    const ok = await init();
    if (!ok) return null;
  }

  try {
    const [bal, remaining, limit] = await Promise.all([
      vault.balance(),
      vault.remainingToday(),
      vault.dailyLimit()
    ]);

    return {
      vault: VAULT_ADDRESS,
      agent: wallet.address,
      balance: `$${(Number(bal) / 1e6).toFixed(2)}`,
      remainingToday: `$${(Number(remaining) / 1e6).toFixed(2)}`,
      dailyLimit: `$${(Number(limit) / 1e6).toFixed(2)}`,
      network: 'Avalanche C-Chain',
      snowtrace: `https://snowtrace.io/address/${VAULT_ADDRESS}`
    };
  } catch (err) {
    return { error: err.message };
  }
}

export { init, payForDiagnosis, getVaultStatus, DIAGNOSIS_COST, VAULT_ADDRESS };
