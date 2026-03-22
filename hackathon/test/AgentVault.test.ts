import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AgentVault, MockERC20 } from "../typechain-types";

const ETH = ethers.ZeroAddress;
const DAY = 86400;
const MONTH = 30 * DAY;

async function deployFixture() {
  const [owner, agent, recipient, stranger, newAgent] = await ethers.getSigners();

  const Vault = await ethers.getContractFactory("AgentVault");
  const vault = await Vault.deploy();

  const Token = await ethers.getContractFactory("MockERC20");
  const token = await Token.deploy("Mock", "MCK", ethers.parseEther("1000000"));

  return { vault, token, owner, agent, recipient, stranger, newAgent };
}

/** Create vault + deposit ETH + set permissive rules */
async function readyVaultFixture() {
  const base = await deployFixture();
  const { vault, token, owner, agent, recipient } = base;

  // Create vault
  await vault.createVault(agent.address);
  const vaultId = 0n;

  // Deposit ETH
  await vault.deposit(vaultId, { value: ethers.parseEther("10") });

  // Deposit tokens
  await token.approve(await vault.getAddress(), ethers.parseEther("1000"));
  await vault.depositToken(vaultId, await token.getAddress(), ethers.parseEther("1000"));

  // Set permissive rules
  const rules = {
    maxPerTransaction: ethers.parseEther("5"),
    dailyLimit: ethers.parseEther("10"),
    monthlyLimit: ethers.parseEther("100"),
    allowedRecipients: [recipient.address],
    allowedTokens: [ETH, await token.getAddress()],
    validFrom: 0,
    validUntil: 0,
  };
  await vault.setRules(vaultId, rules);

  return { ...base, vaultId, rules };
}

describe("AgentVault", function () {
  // ──────────────────────────────────────────────
  // 1. Vault Creation
  // ──────────────────────────────────────────────
  describe("Vault Creation", function () {
    it("should create a vault with correct owner and agent", async function () {
      const { vault, owner, agent } = await loadFixture(deployFixture);
      await expect(vault.createVault(agent.address))
        .to.emit(vault, "VaultCreated")
        .withArgs(0, owner.address, agent.address);

      const v = await vault.vaults(0);
      expect(v.owner).to.equal(owner.address);
      expect(v.agent).to.equal(agent.address);
    });

    it("should increment vaultId", async function () {
      const { vault, agent } = await loadFixture(deployFixture);
      await vault.createVault(agent.address);
      await vault.createVault(agent.address);
      expect(await vault.nextVaultId()).to.equal(2);
    });

    it("should revert on zero agent address", async function () {
      const { vault } = await loadFixture(deployFixture);
      await expect(vault.createVault(ethers.ZeroAddress)).to.be.revertedWith("AgentVault: zero agent");
    });
  });

  // ──────────────────────────────────────────────
  // 2. Deposits
  // ──────────────────────────────────────────────
  describe("Deposits", function () {
    it("should deposit ETH", async function () {
      const { vault, agent } = await loadFixture(deployFixture);
      await vault.createVault(agent.address);
      await expect(vault.deposit(0, { value: ethers.parseEther("1") }))
        .to.emit(vault, "Deposited")
        .withArgs(0, ETH, ethers.parseEther("1"));
      expect(await vault.ethBalances(0)).to.equal(ethers.parseEther("1"));
    });

    it("should deposit ERC-20 tokens", async function () {
      const { vault, token, agent } = await loadFixture(deployFixture);
      await vault.createVault(agent.address);
      const tokenAddr = await token.getAddress();
      await token.approve(await vault.getAddress(), ethers.parseEther("100"));
      await expect(vault.depositToken(0, tokenAddr, ethers.parseEther("100")))
        .to.emit(vault, "Deposited")
        .withArgs(0, tokenAddr, ethers.parseEther("100"));
      expect(await vault.tokenBalances(0, tokenAddr)).to.equal(ethers.parseEther("100"));
    });

    it("should allow anyone to deposit", async function () {
      const { vault, agent, stranger } = await loadFixture(deployFixture);
      await vault.createVault(agent.address);
      await vault.connect(stranger).deposit(0, { value: ethers.parseEther("1") });
      expect(await vault.ethBalances(0)).to.equal(ethers.parseEther("1"));
    });

    it("should revert on zero ETH deposit", async function () {
      const { vault, agent } = await loadFixture(deployFixture);
      await vault.createVault(agent.address);
      await expect(vault.deposit(0, { value: 0 })).to.be.revertedWith("AgentVault: zero deposit");
    });

    it("should revert on zero token deposit", async function () {
      const { vault, token, agent } = await loadFixture(deployFixture);
      await vault.createVault(agent.address);
      await expect(vault.depositToken(0, await token.getAddress(), 0)).to.be.revertedWith("AgentVault: zero amount");
    });

    it("should revert depositToken with address(0) token", async function () {
      const { vault, agent } = await loadFixture(deployFixture);
      await vault.createVault(agent.address);
      await expect(vault.depositToken(0, ETH, 100)).to.be.revertedWith("AgentVault: use deposit()");
    });
  });

  // ──────────────────────────────────────────────
  // 3. Rules
  // ──────────────────────────────────────────────
  describe("Rules", function () {
    it("should set rules and emit event", async function () {
      const { vault, agent, recipient } = await loadFixture(deployFixture);
      await vault.createVault(agent.address);
      const rules = {
        maxPerTransaction: 100,
        dailyLimit: 1000,
        monthlyLimit: 10000,
        allowedRecipients: [recipient.address],
        allowedTokens: [],
        validFrom: 0,
        validUntil: 0,
      };
      await expect(vault.setRules(0, rules)).to.emit(vault, "RulesSet").withArgs(0);
    });

    it("should only allow owner to set rules", async function () {
      const { vault, agent } = await loadFixture(deployFixture);
      await vault.createVault(agent.address);
      const rules = {
        maxPerTransaction: 100, dailyLimit: 1000, monthlyLimit: 10000,
        allowedRecipients: [], allowedTokens: [], validFrom: 0, validUntil: 0,
      };
      await expect(vault.connect(agent).setRules(0, rules)).to.be.revertedWith("AgentVault: not owner");
    });

    it("should clear old whitelists on rules update", async function () {
      const { vault, agent, recipient, stranger } = await loadFixture(deployFixture);
      await vault.createVault(agent.address);
      await vault.deposit(0, { value: ethers.parseEther("10") });

      // Set rules with recipient allowed
      await vault.setRules(0, {
        maxPerTransaction: ethers.parseEther("5"), dailyLimit: ethers.parseEther("10"),
        monthlyLimit: ethers.parseEther("100"), allowedRecipients: [recipient.address],
        allowedTokens: [ETH], validFrom: 0, validUntil: 0,
      });

      // Update rules with stranger as allowed recipient (removes recipient)
      await vault.setRules(0, {
        maxPerTransaction: ethers.parseEther("5"), dailyLimit: ethers.parseEther("10"),
        monthlyLimit: ethers.parseEther("100"), allowedRecipients: [stranger.address],
        allowedTokens: [ETH], validFrom: 0, validUntil: 0,
      });

      // Agent can't spend to old recipient
      await expect(
        vault.connect(agent).spend(0, recipient.address, ethers.parseEther("1"), ETH)
      ).to.be.revertedWith("AgentVault: recipient not allowed");

      // Agent can spend to new recipient
      await vault.connect(agent).spend(0, stranger.address, ethers.parseEther("1"), ETH);
    });
  });

  // ──────────────────────────────────────────────
  // 4. Spending
  // ──────────────────────────────────────────────
  describe("Spending", function () {
    it("should spend ETH", async function () {
      const { vault, agent, recipient, vaultId } = await loadFixture(readyVaultFixture);
      const before = await ethers.provider.getBalance(recipient.address);
      await vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("1"), ETH);
      const after = await ethers.provider.getBalance(recipient.address);
      expect(after - before).to.equal(ethers.parseEther("1"));
    });

    it("should spend ERC-20", async function () {
      const { vault, token, agent, recipient, vaultId } = await loadFixture(readyVaultFixture);
      const tokenAddr = await token.getAddress();
      await vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("1"), tokenAddr);
      expect(await token.balanceOf(recipient.address)).to.equal(ethers.parseEther("1"));
    });

    it("should respect maxPerTransaction", async function () {
      const { vault, agent, recipient, vaultId } = await loadFixture(readyVaultFixture);
      await expect(
        vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("6"), ETH)
      ).to.be.revertedWith("AgentVault: exceeds tx limit");
    });

    it("should respect dailyLimit", async function () {
      const { vault, agent, recipient, vaultId } = await loadFixture(readyVaultFixture);
      // Spend 5 twice = 10 (at limit)
      await vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("5"), ETH);
      await vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("5"), ETH);
      // Third should fail
      await expect(
        vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("1"), ETH)
      ).to.be.revertedWith("AgentVault: daily limit exceeded");
    });

    it("should respect monthlyLimit", async function () {
      const { vault, token, agent, recipient, vaultId } = await loadFixture(readyVaultFixture);
      const tokenAddr = await token.getAddress();
      // Set rules with low monthly limit
      await vault.setRules(vaultId, {
        maxPerTransaction: ethers.parseEther("50"), dailyLimit: ethers.parseEther("50"),
        monthlyLimit: ethers.parseEther("10"), allowedRecipients: [recipient.address],
        allowedTokens: [tokenAddr], validFrom: 0, validUntil: 0,
      });
      await vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("10"), tokenAddr);
      await time.increase(DAY + 1); // new daily window but same monthly
      await expect(
        vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("1"), tokenAddr)
      ).to.be.revertedWith("AgentVault: monthly limit exceeded");
    });

    it("should respect allowedRecipients", async function () {
      const { vault, agent, stranger, vaultId } = await loadFixture(readyVaultFixture);
      await expect(
        vault.connect(agent).spend(vaultId, stranger.address, ethers.parseEther("1"), ETH)
      ).to.be.revertedWith("AgentVault: recipient not allowed");
    });

    it("should respect allowedTokens", async function () {
      const { vault, agent, recipient, vaultId } = await loadFixture(readyVaultFixture);
      // Deploy another token not in the whitelist
      const Token2 = await ethers.getContractFactory("MockERC20");
      const token2 = await Token2.deploy("Bad", "BAD", ethers.parseEther("1000"));
      await token2.approve(await vault.getAddress(), ethers.parseEther("100"));
      await vault.depositToken(vaultId, await token2.getAddress(), ethers.parseEther("100"));

      await expect(
        vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("1"), await token2.getAddress())
      ).to.be.revertedWith("AgentVault: token not allowed");
    });

    it("should respect time windows (not yet active)", async function () {
      const { vault, agent, recipient, vaultId } = await loadFixture(readyVaultFixture);
      const future = (await time.latest()) + 3600;
      await vault.setRules(vaultId, {
        maxPerTransaction: ethers.parseEther("5"), dailyLimit: ethers.parseEther("10"),
        monthlyLimit: ethers.parseEther("100"), allowedRecipients: [recipient.address],
        allowedTokens: [ETH], validFrom: future, validUntil: 0,
      });
      await expect(
        vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("1"), ETH)
      ).to.be.revertedWith("AgentVault: rules not active");
    });

    it("should respect time windows (expired)", async function () {
      const { vault, agent, recipient, vaultId } = await loadFixture(readyVaultFixture);
      const past = (await time.latest()) - 1;
      await vault.setRules(vaultId, {
        maxPerTransaction: ethers.parseEther("5"), dailyLimit: ethers.parseEther("10"),
        monthlyLimit: ethers.parseEther("100"), allowedRecipients: [recipient.address],
        allowedTokens: [ETH], validFrom: 0, validUntil: past,
      });
      await expect(
        vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("1"), ETH)
      ).to.be.revertedWith("AgentVault: rules expired");
    });

    it("should only allow agent to spend", async function () {
      const { vault, owner, recipient, vaultId } = await loadFixture(readyVaultFixture);
      await expect(
        vault.connect(owner).spend(vaultId, recipient.address, ethers.parseEther("1"), ETH)
      ).to.be.revertedWith("AgentVault: not agent");
    });

    it("should revert without rules set", async function () {
      const { vault, agent, recipient } = await loadFixture(deployFixture);
      await vault.createVault(agent.address);
      await vault.deposit(0, { value: ethers.parseEther("1") });
      await expect(
        vault.connect(agent).spend(0, recipient.address, ethers.parseEther("1"), ETH)
      ).to.be.revertedWith("AgentVault: rules not set");
    });

    it("should revert on insufficient ETH", async function () {
      const { vault, agent, recipient, vaultId } = await loadFixture(readyVaultFixture);
      await expect(
        vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("5"), ETH)
      ).not.to.be.reverted;
      // Now balance is 5 ETH, try to spend 5 more (within daily limit of 10)
      await expect(
        vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("5"), ETH)
      ).not.to.be.reverted;
      // Now 0 ETH left
      await expect(
        vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("1"), ETH)
      ).to.be.revertedWith("AgentVault: daily limit exceeded");
    });
  });

  // ──────────────────────────────────────────────
  // 5. Rolling Windows
  // ──────────────────────────────────────────────
  describe("Rolling Windows", function () {
    it("daily limit resets after 24h", async function () {
      const { vault, agent, recipient, vaultId } = await loadFixture(readyVaultFixture);
      // Exhaust daily limit
      await vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("5"), ETH);
      await vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("5"), ETH);
      await expect(
        vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("1"), ETH)
      ).to.be.revertedWith("AgentVault: daily limit exceeded");

      // Advance 24h+1s
      await time.increase(DAY + 1);

      // Should work again (but vault only has 0 ETH, deposit more)
      await vault.deposit(vaultId, { value: ethers.parseEther("5") });
      await vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("1"), ETH);
    });

    it("monthly limit resets after 30 days", async function () {
      const { vault, token, agent, recipient, vaultId } = await loadFixture(readyVaultFixture);
      const tokenAddr = await token.getAddress();
      // Set low monthly limit
      await vault.setRules(vaultId, {
        maxPerTransaction: ethers.parseEther("10"), dailyLimit: ethers.parseEther("10"),
        monthlyLimit: ethers.parseEther("5"), allowedRecipients: [recipient.address],
        allowedTokens: [tokenAddr], validFrom: 0, validUntil: 0,
      });
      await vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("5"), tokenAddr);
      await time.increase(DAY + 1);
      await expect(
        vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("1"), tokenAddr)
      ).to.be.revertedWith("AgentVault: monthly limit exceeded");

      // Advance 30 days
      await time.increase(MONTH);
      await vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("1"), tokenAddr);
    });
  });

  // ──────────────────────────────────────────────
  // 6. Withdrawals
  // ──────────────────────────────────────────────
  describe("Withdrawals", function () {
    it("owner can withdraw ETH", async function () {
      const { vault, owner, vaultId } = await loadFixture(readyVaultFixture);
      const before = await ethers.provider.getBalance(owner.address);
      const tx = await vault.withdraw(vaultId, ETH, ethers.parseEther("5"));
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const after = await ethers.provider.getBalance(owner.address);
      expect(after - before + gasCost).to.equal(ethers.parseEther("5"));
    });

    it("owner can withdraw tokens", async function () {
      const { vault, token, owner, vaultId } = await loadFixture(readyVaultFixture);
      const tokenAddr = await token.getAddress();
      const before = await token.balanceOf(owner.address);
      await vault.withdraw(vaultId, tokenAddr, ethers.parseEther("100"));
      const after = await token.balanceOf(owner.address);
      expect(after - before).to.equal(ethers.parseEther("100"));
    });

    it("only owner can withdraw", async function () {
      const { vault, agent, vaultId } = await loadFixture(readyVaultFixture);
      await expect(
        vault.connect(agent).withdraw(vaultId, ETH, ethers.parseEther("1"))
      ).to.be.revertedWith("AgentVault: not owner");
    });

    it("reverts on insufficient ETH balance", async function () {
      const { vault, vaultId } = await loadFixture(readyVaultFixture);
      await expect(
        vault.withdraw(vaultId, ETH, ethers.parseEther("999"))
      ).to.be.revertedWith("AgentVault: insufficient ETH");
    });

    it("reverts on insufficient token balance", async function () {
      const { vault, token, vaultId } = await loadFixture(readyVaultFixture);
      await expect(
        vault.withdraw(vaultId, await token.getAddress(), ethers.parseEther("99999"))
      ).to.be.revertedWith("AgentVault: insufficient token");
    });
  });

  // ──────────────────────────────────────────────
  // 7. Agent Management
  // ──────────────────────────────────────────────
  describe("Agent Management", function () {
    it("should revoke agent", async function () {
      const { vault, agent, vaultId } = await loadFixture(readyVaultFixture);
      await expect(vault.revokeAgent(vaultId))
        .to.emit(vault, "AgentRevoked")
        .withArgs(vaultId, agent.address);
      expect((await vault.vaults(vaultId)).agent).to.equal(ethers.ZeroAddress);
    });

    it("should update agent", async function () {
      const { vault, agent, newAgent, vaultId } = await loadFixture(readyVaultFixture);
      await expect(vault.updateAgent(vaultId, newAgent.address))
        .to.emit(vault, "AgentUpdated")
        .withArgs(vaultId, agent.address, newAgent.address);
      expect((await vault.vaults(vaultId)).agent).to.equal(newAgent.address);
    });

    it("revoked agent can't spend", async function () {
      const { vault, agent, recipient, vaultId } = await loadFixture(readyVaultFixture);
      await vault.revokeAgent(vaultId);
      await expect(
        vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("1"), ETH)
      ).to.be.revertedWith("AgentVault: not agent");
    });

    it("only owner can revoke", async function () {
      const { vault, agent, vaultId } = await loadFixture(readyVaultFixture);
      await expect(vault.connect(agent).revokeAgent(vaultId)).to.be.revertedWith("AgentVault: not owner");
    });

    it("only owner can update agent", async function () {
      const { vault, agent, newAgent, vaultId } = await loadFixture(readyVaultFixture);
      await expect(vault.connect(agent).updateAgent(vaultId, newAgent.address)).to.be.revertedWith("AgentVault: not owner");
    });
  });

  // ──────────────────────────────────────────────
  // 8. View Functions
  // ──────────────────────────────────────────────
  describe("View Functions", function () {
    it("getRules returns correct data", async function () {
      const { vault, token, recipient, vaultId, rules } = await loadFixture(readyVaultFixture);
      const tokenAddr = await token.getAddress();
      const r = await vault.getRules(vaultId);
      expect(r.maxPerTransaction).to.equal(rules.maxPerTransaction);
      expect(r.dailyLimit).to.equal(rules.dailyLimit);
      expect(r.monthlyLimit).to.equal(rules.monthlyLimit);
      expect(r.allowedRecipients).to.deep.equal([recipient.address]);
      expect(r.allowedTokens).to.deep.equal([ETH, tokenAddr]);
    });

    it("getRemainingBudget is accurate", async function () {
      const { vault, agent, recipient, vaultId } = await loadFixture(readyVaultFixture);
      // Before spending
      let [daily, monthly] = await vault.getRemainingBudget(vaultId, ETH);
      expect(daily).to.equal(ethers.parseEther("10"));
      expect(monthly).to.equal(ethers.parseEther("100"));

      // Spend 3 ETH
      await vault.connect(agent).spend(vaultId, recipient.address, ethers.parseEther("3"), ETH);
      [daily, monthly] = await vault.getRemainingBudget(vaultId, ETH);
      expect(daily).to.equal(ethers.parseEther("7"));
      expect(monthly).to.equal(ethers.parseEther("97"));
    });
  });
});
