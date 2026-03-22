import { Contract, JsonRpcProvider, Wallet, formatEther, formatUnits, parseEther, parseUnits } from "ethers";

const RPC_URL = "https://mainnet.base.org";
const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";

const ABI = [
  "function vaults(uint256) view returns (address owner, address agent, bool rulesSet)",
  "function ethBalances(uint256) view returns (uint256)",
  "function tokenBalances(uint256, address) view returns (uint256)",
  "function getRules(uint256) view returns (tuple(uint256 maxPerTransaction, uint256 dailyLimit, uint256 monthlyLimit, address[] allowedRecipients, address[] allowedTokens, uint256 validFrom, uint256 validUntil))",
  "function getRemainingBudget(uint256, address) view returns (uint256 dailyRemaining, uint256 monthlyRemaining)",
  "function spend(uint256 vaultId, address to, uint256 amount, address token)",
  "event Spent(uint256 indexed vaultId, address indexed token, address indexed to, uint256 amount)",
];

function getContract(needsSigner = false) {
  const contractAddr = process.env.VAULT_CONTRACT;
  if (!contractAddr) { console.error(JSON.stringify({ error: "VAULT_CONTRACT env var not set" })); process.exit(1); }

  const provider = new JsonRpcProvider(RPC_URL);

  if (needsSigner) {
    const pk = process.env.PRIVATE_KEY;
    if (!pk) { console.error(JSON.stringify({ error: "PRIVATE_KEY env var not set" })); process.exit(1); }
    const wallet = new Wallet(pk, provider);
    return { contract: new Contract(contractAddr, ABI, wallet), provider };
  }

  return { contract: new Contract(contractAddr, ABI, provider), provider };
}

async function status(vaultId: number) {
  const { contract } = getContract();

  const [owner, agent, rulesSet] = await contract.vaults(vaultId);
  const ethBalance = await contract.ethBalances(vaultId);
  const rules = await contract.getRules(vaultId);
  const [dailyRemaining, monthlyRemaining] = await contract.getRemainingBudget(vaultId, ETH_ADDRESS);

  console.log(JSON.stringify({
    vaultId,
    owner,
    agent,
    rulesSet,
    ethBalance: formatEther(ethBalance),
    rules: {
      maxPerTransaction: formatEther(rules.maxPerTransaction),
      dailyLimit: formatEther(rules.dailyLimit),
      monthlyLimit: formatEther(rules.monthlyLimit),
      allowedRecipients: [...rules.allowedRecipients],
      allowedTokens: [...rules.allowedTokens],
      validFrom: Number(rules.validFrom),
      validUntil: Number(rules.validUntil),
    },
    remainingBudget: {
      dailyRemaining: formatEther(dailyRemaining),
      monthlyRemaining: formatEther(monthlyRemaining),
    },
  }, null, 2));
}

async function spend(vaultId: number, to: string, amount: string, token?: string) {
  const { contract } = getContract(true);
  const tokenAddr = token || ETH_ADDRESS;
  const parsedAmount = tokenAddr === ETH_ADDRESS ? parseEther(amount) : parseUnits(amount, 18);

  try {
    const tx = await contract.spend(vaultId, to, parsedAmount, tokenAddr);
    const receipt = await tx.wait();
    console.log(JSON.stringify({
      success: true,
      transactionHash: receipt.hash,
      vaultId,
      to,
      amount,
      token: tokenAddr,
    }, null, 2));
  } catch (err: any) {
    console.error(JSON.stringify({
      success: false,
      error: err.reason || err.message || String(err),
    }, null, 2));
    process.exit(1);
  }
}

async function history(vaultId: number) {
  const { contract, provider } = getContract();
  const currentBlock = await provider.getBlockNumber();
  // Look back ~7 days (~30k blocks on Base at 2s/block)
  const fromBlock = Math.max(0, currentBlock - 30000);

  const filter = contract.filters.Spent(vaultId);
  const events = await contract.queryFilter(filter, fromBlock, currentBlock);

  const parsed = await Promise.all(events.map(async (e: any) => {
    const block = await e.getBlock();
    return {
      transactionHash: e.transactionHash,
      blockNumber: e.blockNumber,
      timestamp: block.timestamp,
      date: new Date(Number(block.timestamp) * 1000).toISOString(),
      token: e.args[1],
      to: e.args[2],
      amount: formatEther(e.args[3]),
    };
  }));

  console.log(JSON.stringify({ vaultId, events: parsed }, null, 2));
}

// CLI entrypoint
const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case "status":
    if (!args[0]) { console.error("Usage: vault status <vaultId>"); process.exit(1); }
    status(Number(args[0])).catch(e => { console.error(JSON.stringify({ error: e.message })); process.exit(1); });
    break;
  case "spend":
    if (args.length < 3) { console.error("Usage: vault spend <vaultId> <to> <amount> [token]"); process.exit(1); }
    spend(Number(args[0]), args[1], args[2], args[3]).catch(e => { console.error(JSON.stringify({ error: e.message })); process.exit(1); });
    break;
  case "history":
    if (!args[0]) { console.error("Usage: vault history <vaultId>"); process.exit(1); }
    history(Number(args[0])).catch(e => { console.error(JSON.stringify({ error: e.message })); process.exit(1); });
    break;
  default:
    console.error("Commands: status, spend, history");
    process.exit(1);
}
