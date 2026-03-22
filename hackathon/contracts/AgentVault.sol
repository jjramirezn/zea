// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAgentVault} from "./IAgentVault.sol";

/**
 * @title AgentVault
 * @notice AI agent wallet with human-defined spending guardrails.
 *         Humans create vaults, deposit funds, and set rules.
 *         Agents spend within those rules. Humans retain full control.
 * @dev Deploy target: Base mainnet. Solidity ^0.8.20.
 */
contract AgentVault is IAgentVault, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  Constants
    // ──────────────────────────────────────────────

    uint256 private constant DAY = 1 days;
    uint256 private constant MONTH = 30 days;
    address private constant ETH = address(0);

    // ──────────────────────────────────────────────
    //  Storage
    // ──────────────────────────────────────────────

    uint256 public nextVaultId;

    struct Vault {
        address owner;
        address agent;
        bool rulesSet;
    }

    /// @dev Core vault data (owner + agent).
    mapping(uint256 => Vault) public vaults;

    /// @dev ETH balance per vault.
    mapping(uint256 => uint256) public ethBalances;

    /// @dev ERC-20 balance per vault per token.
    mapping(uint256 => mapping(address => uint256)) public tokenBalances;

    // --- Rules storage (split to avoid nested dynamic arrays in mappings) ---

    struct RulesCore {
        uint256 maxPerTransaction;
        uint256 dailyLimit;
        uint256 monthlyLimit;
        uint256 validFrom;
        uint256 validUntil;
    }

    mapping(uint256 => RulesCore) private _rulesCore;
    mapping(uint256 => address[]) private _allowedRecipients;
    mapping(uint256 => address[]) private _allowedTokens;

    /// @dev Fast lookup for allowed recipients: vaultId => address => bool.
    mapping(uint256 => mapping(address => bool)) private _isAllowedRecipient;

    /// @dev Fast lookup for allowed tokens: vaultId => address => bool.
    mapping(uint256 => mapping(address => bool)) private _isAllowedToken;

    // --- Spending tracking ---

    struct SpendWindow {
        uint256 amount;
        uint256 resetAt; // timestamp when window resets
    }

    /// @dev vaultId => token => daily spend window
    mapping(uint256 => mapping(address => SpendWindow)) private _dailySpend;

    /// @dev vaultId => token => monthly spend window
    mapping(uint256 => mapping(address => SpendWindow)) private _monthlySpend;

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyOwner(uint256 vaultId) {
        require(msg.sender == vaults[vaultId].owner, "AgentVault: not owner");
        _;
    }

    modifier onlyAgent(uint256 vaultId) {
        require(msg.sender == vaults[vaultId].agent, "AgentVault: not agent");
        _;
    }

    modifier vaultExists(uint256 vaultId) {
        require(vaults[vaultId].owner != address(0), "AgentVault: vault !exist");
        _;
    }

    // ──────────────────────────────────────────────
    //  Vault lifecycle
    // ──────────────────────────────────────────────

    /// @inheritdoc IAgentVault
    function createVault(address agent) external returns (uint256 vaultId) {
        require(agent != address(0), "AgentVault: zero agent");

        vaultId = nextVaultId++;
        vaults[vaultId] = Vault({owner: msg.sender, agent: agent, rulesSet: false});

        emit VaultCreated(vaultId, msg.sender, agent);
    }

    /// @inheritdoc IAgentVault
    function revokeAgent(uint256 vaultId) external vaultExists(vaultId) onlyOwner(vaultId) {
        address old = vaults[vaultId].agent;
        require(old != address(0), "AgentVault: already revoked");
        vaults[vaultId].agent = address(0);
        emit AgentRevoked(vaultId, old);
    }

    /// @inheritdoc IAgentVault
    function updateAgent(uint256 vaultId, address newAgent) external vaultExists(vaultId) onlyOwner(vaultId) {
        require(newAgent != address(0), "AgentVault: zero agent");
        address old = vaults[vaultId].agent;
        vaults[vaultId].agent = newAgent;
        emit AgentUpdated(vaultId, old, newAgent);
    }

    // ──────────────────────────────────────────────
    //  Deposits
    // ──────────────────────────────────────────────

    /// @inheritdoc IAgentVault
    function deposit(uint256 vaultId) external payable vaultExists(vaultId) {
        require(msg.value > 0, "AgentVault: zero deposit");
        ethBalances[vaultId] += msg.value;
        emit Deposited(vaultId, ETH, msg.value);
    }

    /// @inheritdoc IAgentVault
    function depositToken(uint256 vaultId, address token, uint256 amount) external vaultExists(vaultId) {
        require(token != address(0), "AgentVault: use deposit()");
        require(amount > 0, "AgentVault: zero amount");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        tokenBalances[vaultId][token] += amount;

        emit Deposited(vaultId, token, amount);
    }

    // ──────────────────────────────────────────────
    //  Rules
    // ──────────────────────────────────────────────

    /// @inheritdoc IAgentVault
    function setRules(uint256 vaultId, Rules calldata rules) external vaultExists(vaultId) onlyOwner(vaultId) {
        // Store core scalars
        _rulesCore[vaultId] = RulesCore({
            maxPerTransaction: rules.maxPerTransaction,
            dailyLimit: rules.dailyLimit,
            monthlyLimit: rules.monthlyLimit,
            validFrom: rules.validFrom,
            validUntil: rules.validUntil
        });

        // Clear old recipient whitelist
        address[] storage oldR = _allowedRecipients[vaultId];
        for (uint256 i; i < oldR.length; ++i) {
            _isAllowedRecipient[vaultId][oldR[i]] = false;
        }
        delete _allowedRecipients[vaultId];

        // Set new recipient whitelist
        for (uint256 i; i < rules.allowedRecipients.length; ++i) {
            address r = rules.allowedRecipients[i];
            _allowedRecipients[vaultId].push(r);
            _isAllowedRecipient[vaultId][r] = true;
        }

        // Clear old token whitelist
        address[] storage oldT = _allowedTokens[vaultId];
        for (uint256 i; i < oldT.length; ++i) {
            _isAllowedToken[vaultId][oldT[i]] = false;
        }
        delete _allowedTokens[vaultId];

        // Set new token whitelist
        for (uint256 i; i < rules.allowedTokens.length; ++i) {
            address t = rules.allowedTokens[i];
            _allowedTokens[vaultId].push(t);
            _isAllowedToken[vaultId][t] = true;
        }

        vaults[vaultId].rulesSet = true;
        emit RulesSet(vaultId);
    }

    // ──────────────────────────────────────────────
    //  Spending (agent only)
    // ──────────────────────────────────────────────

    /// @inheritdoc IAgentVault
    function spend(
        uint256 vaultId,
        address to,
        uint256 amount,
        address token
    ) external vaultExists(vaultId) onlyAgent(vaultId) nonReentrant {
        require(amount > 0, "AgentVault: zero amount");
        require(to != address(0), "AgentVault: zero recipient");
        require(vaults[vaultId].rulesSet, "AgentVault: rules not set");

        _validateRules(vaultId, to, amount, token);
        _recordSpend(vaultId, token, amount);

        if (token == ETH) {
            require(ethBalances[vaultId] >= amount, "AgentVault: insufficient ETH");
            ethBalances[vaultId] -= amount;
            (bool ok,) = to.call{value: amount}("");
            require(ok, "AgentVault: ETH transfer failed");
        } else {
            require(tokenBalances[vaultId][token] >= amount, "AgentVault: insufficient token");
            tokenBalances[vaultId][token] -= amount;
            IERC20(token).safeTransfer(to, amount);
        }

        emit Spent(vaultId, token, to, amount);
    }

    // ──────────────────────────────────────────────
    //  Withdrawals (owner only)
    // ──────────────────────────────────────────────

    /// @inheritdoc IAgentVault
    function withdraw(
        uint256 vaultId,
        address token,
        uint256 amount
    ) external vaultExists(vaultId) onlyOwner(vaultId) nonReentrant {
        require(amount > 0, "AgentVault: zero amount");

        if (token == ETH) {
            require(ethBalances[vaultId] >= amount, "AgentVault: insufficient ETH");
            ethBalances[vaultId] -= amount;
            (bool ok,) = msg.sender.call{value: amount}("");
            require(ok, "AgentVault: ETH transfer failed");
        } else {
            require(tokenBalances[vaultId][token] >= amount, "AgentVault: insufficient token");
            tokenBalances[vaultId][token] -= amount;
            IERC20(token).safeTransfer(msg.sender, amount);
        }

        emit Withdrawn(vaultId, token, amount);
    }

    // ──────────────────────────────────────────────
    //  View helpers
    // ──────────────────────────────────────────────

    /// @notice Returns the full rules for a vault.
    function getRules(uint256 vaultId) external view returns (Rules memory) {
        RulesCore storage c = _rulesCore[vaultId];
        return Rules({
            maxPerTransaction: c.maxPerTransaction,
            dailyLimit: c.dailyLimit,
            monthlyLimit: c.monthlyLimit,
            allowedRecipients: _allowedRecipients[vaultId],
            allowedTokens: _allowedTokens[vaultId],
            validFrom: c.validFrom,
            validUntil: c.validUntil
        });
    }

    /// @notice Returns remaining daily/monthly budgets for a token in a vault.
    function getRemainingBudget(uint256 vaultId, address token)
        external
        view
        returns (uint256 dailyRemaining, uint256 monthlyRemaining)
    {
        RulesCore storage c = _rulesCore[vaultId];

        SpendWindow storage d = _dailySpend[vaultId][token];
        uint256 dailyUsed = (block.timestamp < d.resetAt) ? d.amount : 0;
        dailyRemaining = c.dailyLimit > dailyUsed ? c.dailyLimit - dailyUsed : 0;

        SpendWindow storage m = _monthlySpend[vaultId][token];
        uint256 monthlyUsed = (block.timestamp < m.resetAt) ? m.amount : 0;
        monthlyRemaining = c.monthlyLimit > monthlyUsed ? c.monthlyLimit - monthlyUsed : 0;
    }

    // ──────────────────────────────────────────────
    //  Internal
    // ──────────────────────────────────────────────

    function _validateRules(uint256 vaultId, address to, uint256 amount, address token) private view {
        RulesCore storage r = _rulesCore[vaultId];

        // Time window
        if (r.validFrom > 0) {
            require(block.timestamp >= r.validFrom, "AgentVault: rules not active");
        }
        if (r.validUntil > 0) {
            require(block.timestamp <= r.validUntil, "AgentVault: rules expired");
        }

        // Per-tx limit
        if (r.maxPerTransaction > 0) {
            require(amount <= r.maxPerTransaction, "AgentVault: exceeds tx limit");
        }

        // Recipient whitelist
        if (_allowedRecipients[vaultId].length > 0) {
            require(_isAllowedRecipient[vaultId][to], "AgentVault: recipient not allowed");
        }

        // Token whitelist
        if (_allowedTokens[vaultId].length > 0) {
            require(_isAllowedToken[vaultId][token], "AgentVault: token not allowed");
        }

        // Daily limit (check current window)
        if (r.dailyLimit > 0) {
            SpendWindow storage d = _dailySpend[vaultId][token];
            uint256 used = (block.timestamp < d.resetAt) ? d.amount : 0;
            require(used + amount <= r.dailyLimit, "AgentVault: daily limit exceeded");
        }

        // Monthly limit
        if (r.monthlyLimit > 0) {
            SpendWindow storage m = _monthlySpend[vaultId][token];
            uint256 used = (block.timestamp < m.resetAt) ? m.amount : 0;
            require(used + amount <= r.monthlyLimit, "AgentVault: monthly limit exceeded");
        }
    }

    function _recordSpend(uint256 vaultId, address token, uint256 amount) private {
        // Daily window
        SpendWindow storage d = _dailySpend[vaultId][token];
        if (block.timestamp >= d.resetAt) {
            d.amount = amount;
            d.resetAt = block.timestamp + DAY;
        } else {
            d.amount += amount;
        }

        // Monthly window
        SpendWindow storage m = _monthlySpend[vaultId][token];
        if (block.timestamp >= m.resetAt) {
            m.amount = amount;
            m.resetAt = block.timestamp + MONTH;
        } else {
            m.amount += amount;
        }
    }
}
