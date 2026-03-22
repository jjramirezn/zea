// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAgentVault {
    // ──────────────────────────────────────────────
    //  Types
    // ──────────────────────────────────────────────

    struct Rules {
        uint256 maxPerTransaction;
        uint256 dailyLimit;
        uint256 monthlyLimit;
        address[] allowedRecipients;
        address[] allowedTokens;
        uint256 validFrom;
        uint256 validUntil;
    }

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event VaultCreated(uint256 indexed vaultId, address indexed owner, address indexed agent);
    event Deposited(uint256 indexed vaultId, address indexed token, uint256 amount);
    event RulesSet(uint256 indexed vaultId);
    event Spent(uint256 indexed vaultId, address indexed token, address indexed to, uint256 amount);
    event Withdrawn(uint256 indexed vaultId, address indexed token, uint256 amount);
    event AgentRevoked(uint256 indexed vaultId, address indexed agent);
    event AgentUpdated(uint256 indexed vaultId, address indexed oldAgent, address indexed newAgent);

    // ──────────────────────────────────────────────
    //  External functions
    // ──────────────────────────────────────────────

    function createVault(address agent) external returns (uint256 vaultId);
    function deposit(uint256 vaultId) external payable;
    function depositToken(uint256 vaultId, address token, uint256 amount) external;
    function setRules(uint256 vaultId, Rules calldata rules) external;
    function spend(uint256 vaultId, address to, uint256 amount, address token) external;
    function withdraw(uint256 vaultId, address token, uint256 amount) external;
    function revokeAgent(uint256 vaultId) external;
    function updateAgent(uint256 vaultId, address newAgent) external;
}
