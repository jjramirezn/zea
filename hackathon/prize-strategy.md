# Synthesis Hackathon — Prize Strategy

**Project:** Agent Wallet with Human Guardrails  
**Concept:** Smart contract where a human deposits funds, sets spending rules (amount caps, time windows, approved categories), and an AI agent (with ERC-8004 on-chain identity) executes transactions autonomously within those rails. On-chain, auditable, transparent.

---

## Tier 1 — Best Fit (Core alignment with our project)

### 1. Agents With Receipts — ERC-8004 (Protocol Labs)
| Place | Prize |
|-------|-------|
| 1st | $4,000 |
| 2nd | $3,000 |
| 3rd | $1,004 |
| **Total pool** | **$8,004** |

**Why we fit:** This IS our project. Agent with ERC-8004 identity executing on-chain transactions with verifiable receipts. Our guardrails contract produces auditable on-chain logs of every agent action.  
**What to demonstrate:** ERC-8004 identity for the agent, on-chain transaction receipts, autonomous execution within human-set boundaries, DevSpot compatibility.

### 2. 🤖 Let the Agent Cook — No Humans Required (Protocol Labs)
| Place | Prize |
|-------|-------|
| 1st | $4,000 |
| 2nd | $2,500 |
| 3rd | $1,500 |
| **Total pool** | **$8,000** |

**Why we fit:** Once rules are set, the agent operates fully autonomously — discover opportunities, plan transactions, execute, verify on-chain. The guardrails ARE the safety mechanism they want to see.  
**What to demonstrate:** Complete autonomous decision loop, multi-tool orchestration, safety guardrails (our core feature!), ERC-8004 identity, real-world spending use case.

### 3. Best Use of Delegations (MetaMask)
| Place | Prize |
|-------|-------|
| 1st | $3,000 |
| 2nd | $1,500 |
| **Total pool** | **$4,500** |

**Why we fit:** Our spending rules = delegations. Human delegates spending authority to agent with caveats (amount caps, time windows, categories). This is literally the MetaMask Delegation Framework use case.  
**What to demonstrate:** ERC-7715 delegation pattern, caveat-based permissions (spending limits, time locks, category restrictions), sub-delegation if agent can further delegate to sub-agents.  
**Dream-tier:** Intent-based delegations + ZK proofs for private spending rules.

### 4. stETH Agent Treasury (Lido Labs Foundation)
| Place | Prize |
|-------|-------|
| 1st | $2,000 |
| 2nd | $1,000 |
| **Total pool** | **$3,000** |

**Why we fit:** Direct overlap — agent treasury where agent spends yield but can't touch principal. Our guardrails can enforce "spend only stETH yield" as a rule.  
**What to demonstrate:** Contract that holds stETH, lets agent spend yield only, enforced permission controls, working demo.

### 5. Best Use of Locus (Locus)
| Place | Prize |
|-------|-------|
| 1st | $2,000 |
| 2nd | $500 |
| 3rd | $500 |
| **Total pool** | **$3,000** |

**Why we fit:** Agent-native payments with spending controls and auditability — that's literally our project description.  
**What to demonstrate:** Locus integration for agent payments, spending controls, autonomous payment flows, audit trail.

---

## Tier 2 — Strong Fit (Requires integration work but aligned)

### 6. Synthesis Open Track
| Prize | **$25,059** |
|-------|------------|

**Why we fit:** Open track — any project qualifies. Community-voted, so a compelling "human guardrails for AI agents" narrative could resonate.  
**What to demonstrate:** Overall quality, compelling demo, clear narrative.

### 7. Best Agent on Celo (Celo)
| Place | Prize |
|-------|-------|
| 1st | $3,000 |
| 2nd | $2,000 |
| **Total pool** | **$5,000** |

**Why we fit:** Deploy our contracts on Celo (EVM-compatible, low fees). Agent wallet with real-world utility and economic agency.  
**What to demonstrate:** Deploy on Celo, show real-world utility (agent paying for services), on-chain integration.

### 8. ERC-8183 Open Build (Virtuals)
| Prize | **$2,000** |
|-------|-----------|

**Why we fit:** If ERC-8183 complements our ERC-8004 integration, we can add it. Need to check spec compatibility.  
**What to demonstrate:** Substantive ERC-8183 integration with clear value.

### 9. Best Self Agent ID Integration (Self)
| Prize | **$1,000** |
|-------|-----------|

**Why we fit:** ZK-powered agent identity where identity is "load-bearing." Our agent needs verified identity to operate within guardrails — Self Agent ID could replace or complement ERC-8004 identity.  
**What to demonstrate:** Self Protocol ZK identity as core auth mechanism for agent spending.

### 10. Agents that pay (bond.credit)
| Prize | **$1,000** |
|-------|-----------|

**Why we fit:** Our agent autonomously pays for things within guardrails. Could demonstrate creditworthiness through consistent rule-following.  
**What to demonstrate:** Autonomous trading/spending agent with ERC-8004 identity on Arbitrum.

### 11. Go Gasless — Status Network
| Prize | **$50 per qualifying submission** |
|-------|----------------------------------|

**Why we fit:** Easy qualifier — deploy our contracts on Status Network Sepolia, do a gasless tx. Free $50.  
**What to demonstrate:** Deploy contract, gasless transaction, AI agent component, README.

---

## Tier 3 — Stretch Goals (Could pivot slightly)

### 12. Agentic Finance — Uniswap API (Uniswap)
| 1st $2,500 | 2nd $1,500 | 3rd $1,000 | **Total: $5,000** |

**Why:** Agent could swap tokens as part of spending. Add Uniswap as an approved spending action.

### 13. Yield-Powered AI Agents (Zyfai)
| 1st | **$600** |

**Why:** Similar to stETH treasury — agent earns yield, spends from it. Small prize but easy add-on.

### 14. Private Agents, Trusted Actions (Venice)
| 1st $5,750 | 2nd $3,450 | 3rd $2,300 | **Total: $11,500** |

**Why:** Large prizes. If we use Venice for private inference, the agent's decision-making stays private while actions are public/auditable. Need to integrate Venice VVV token.

---

## Prize Potential Summary

### Realistic Target (1st place in best-fit tracks)
| Track | Target | Amount |
|-------|--------|-------:|
| Agents With Receipts — ERC-8004 | 1st | $4,000 |
| Let the Agent Cook | 1st | $4,000 |
| Best Use of Delegations | 1st | $3,000 |
| stETH Agent Treasury | 1st | $2,000 |
| Best Use of Locus | 1st | $2,000 |
| Status Network (qualifier) | Qualify | $50 |
| **Subtotal** | | **$15,050** |

### Optimistic Target (add Tier 2)
| Track | Target | Amount |
|-------|--------|-------:|
| All Tier 1 above | | $15,050 |
| Open Track | Top 3 | $5,000+ |
| Best Agent on Celo | 1st | $3,000 |
| Private Agents (Venice) | 2nd | $3,450 |
| Uniswap Agentic Finance | 2nd | $1,500 |
| Self Agent ID | Win | $1,000 |
| bond.credit | Win | $1,000 |
| ERC-8183 | Win | $2,000 |
| **Subtotal** | | **$32,000+** |

### Maximum Theoretical (every relevant prize, 1st place)
**~$42,000+**

---

## Recommended Strategy

### Must-target (perfect fit, highest ROI):
1. **Agents With Receipts — ERC-8004** — this is our home track
2. **Let the Agent Cook** — same project, different angle (autonomy focus)
3. **Best Use of Delegations** — spending rules = delegations, natural fit

### Should-target (moderate extra work):
4. **stETH Agent Treasury** — add stETH yield-only spending rule
5. **Best Use of Locus** — integrate Locus for payment execution
6. **Best Agent on Celo** — deploy on Celo (trivial if EVM-compatible)
7. **Open Track** — submit anyway, no extra work

### Nice-to-have (if time permits):
8. **Venice (Private Agents)** — big prizes, needs Venice inference integration
9. **Status Network** — easy $50 qualifier
10. **Uniswap** — add token swaps as agent capability

### Architecture Implication
Build a modular agent wallet that can:
- Plug into multiple chains (Base, Celo, Arbitrum, Status)
- Use ERC-8004 identity (core)
- Accept MetaMask delegations (ERC-7715) for spending rules
- Integrate Locus for payments
- Support stETH yield-only mode
- Produce verifiable on-chain receipts for every action
