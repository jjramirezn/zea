import { Wallet, JsonRpcProvider, ContractFactory, formatEther, parseUnits } from 'ethers';
import { readFileSync } from 'fs';

const RPC = 'https://api.avax.network/ext/bc/C/rpc';
const USDC_AVAX = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E'; // Native USDC on Avalanche
const AGENT_ADDRESS = '0x8514C18bcc7ee6A4b47dfF18D5407f069112433C';
const DAILY_LIMIT = parseUnits('50', 6); // $50/day in USDC (6 decimals)

const DEPLOYER_KEY = process.env.DEPLOYER_KEY;
if (!DEPLOYER_KEY) { console.error('Set DEPLOYER_KEY env var'); process.exit(1); }

const abi = JSON.parse(readFileSync('/home/satoshi/clawd/x402/build/AgentVault_flat_sol_AgentVault.abi', 'utf8'));
const bin = readFileSync('/home/satoshi/clawd/x402/build/AgentVault_flat_sol_AgentVault.bin', 'utf8');

const provider = new JsonRpcProvider(RPC);
const wallet = new Wallet(DEPLOYER_KEY, provider);

console.log('Deployer:', wallet.address);
const bal = await provider.getBalance(wallet.address);
console.log('AVAX balance:', formatEther(bal));

if (bal === 0n) {
  console.error('No AVAX for gas! Send some to', wallet.address);
  process.exit(1);
}

console.log('Deploying AgentVault...');
console.log('  USDC:', USDC_AVAX);
console.log('  Agent:', AGENT_ADDRESS);
console.log('  Daily limit: $50 USDC');

const factory = new ContractFactory(abi, '0x' + bin, wallet);
const contract = await factory.deploy(USDC_AVAX, AGENT_ADDRESS, DAILY_LIMIT);
console.log('Tx hash:', contract.deploymentTransaction().hash);
console.log('Waiting for confirmation...');
await contract.waitForDeployment();
const addr = await contract.getAddress();
console.log('✅ AgentVault deployed at:', addr);
console.log('Snowtrace:', `https://snowtrace.io/address/${addr}`);
