// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title AgentVault (ERC-8004 inspired)
 * @notice Holds funds for an AI agent. The owner (cooperative) deposits USDC,
 *         sets spending limits, and authorizes the agent wallet as operator.
 *         The agent can autonomously spend up to the daily limit.
 */
contract AgentVault {
    address public owner;
    address public agent;
    IERC20 public paymentToken; // USDC

    uint256 public dailyLimit;
    uint256 public spentToday;
    uint256 public lastResetDay;

    event Payment(
        address indexed from,
        address indexed to,
        uint256 amount,
        string reason
    );
    event Deposit(address indexed from, uint256 amount);
    event AgentUpdated(address indexed newAgent);
    event DailyLimitUpdated(uint256 newLimit);
    event Withdrawal(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == agent, "not agent");
        _;
    }

    constructor(address _paymentToken, address _agent, uint256 _dailyLimit) {
        owner = msg.sender;
        paymentToken = IERC20(_paymentToken);
        agent = _agent;
        dailyLimit = _dailyLimit;
        lastResetDay = block.timestamp / 1 days;
    }

    function deposit(uint256 amount) external {
        paymentToken.transferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, amount);
    }

    function pay(address to, uint256 amount, string calldata reason) external onlyAgent {
        _resetIfNewDay();
        require(spentToday + amount <= dailyLimit, "daily limit exceeded");
        spentToday += amount;
        paymentToken.transfer(to, amount);
        emit Payment(agent, to, amount, reason);
    }

    function withdraw(uint256 amount) external onlyOwner {
        paymentToken.transfer(owner, amount);
        emit Withdrawal(owner, amount);
    }

    function setAgent(address _agent) external onlyOwner {
        agent = _agent;
        emit AgentUpdated(_agent);
    }

    function setDailyLimit(uint256 _limit) external onlyOwner {
        dailyLimit = _limit;
        emit DailyLimitUpdated(_limit);
    }

    function remainingToday() external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        if (today > lastResetDay) return dailyLimit;
        if (dailyLimit > spentToday) return dailyLimit - spentToday;
        return 0;
    }

    function balance() external view returns (uint256) {
        return paymentToken.balanceOf(address(this));
    }

    function _resetIfNewDay() internal {
        uint256 today = block.timestamp / 1 days;
        if (today > lastResetDay) {
            spentToday = 0;
            lastResetDay = today;
        }
    }
}
