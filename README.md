# 💰 HabitForge: Blockchain-Powered Savings Challenges

Welcome to HabitForge, a decentralized platform built on the Stacks blockchain that helps users build better financial habits through gamified savings challenges! Users commit to saving goals, track daily habits, and earn tokenized rewards for consistency. This solves the real-world problem of low savings rates and poor financial discipline by leveraging Web3 incentives, community accountability, and immutable smart contracts.

By tokenizing rewards as fungible tokens (e.g., $FORGE) and NFTs for milestones, HabitForge motivates users to stick to challenges like "Save $100/week" or "No-spend days," with penalties for failures redistributed as rewards. All powered by Clarity smart contracts for transparency and security.

## ✨ Features

🔒 User registration and profile management  
🎯 Create and join customizable savings challenges  
💵 Deposit funds into secure vaults with automated locking  
📊 Track habits and progress on-chain  
🏆 Earn tokenized rewards (fungible tokens and NFTs) for milestones  
⚖️ Penalty mechanisms for missed goals, redistributed to successful participants  
👥 Community governance for challenge parameters  
📈 Staking rewards for long-term holders  
🔍 Verifiable on-chain history for all actions  
🚀 Integration with Stacks wallets for seamless participation

## 🛠 How It Works

**For Users (Participants)**  
- Register your profile via the UserRegistry contract.  
- Browse or create a challenge using ChallengeFactory (e.g., "30-day savings sprint").  
- Deposit STX or tokens into the SavingsVault, which locks funds based on challenge rules.  
- Use HabitTracker to log daily habits (e.g., via oracle-verified check-ins).  
- Upon completion, claim rewards from RewardToken and MilestoneNFT contracts.  
- If you fail, penalties are redistributed via the Governance contract.  

**For Challenge Creators**  
- Deploy a new challenge with parameters like duration, min deposit, and reward multipliers.  
- Set habit requirements (e.g., daily savings logs).  
- Earn a small creator fee from participant deposits.  

**For Verifiers and Auditors**  
- Query the OracleContract for external data verification (e.g., habit proofs).  
- Use get-challenge-details or verify-progress functions to check on-chain status.  

That's it! Your savings journey is now tokenized, incentivized, and unstoppable.

## 📂 Smart Contracts Overview

This project utilizes 8 Clarity smart contracts for modularity, security, and scalability. Each handles a specific aspect of the platform:

1. **UserRegistry.clar**  
   - Manages user registrations, profiles, and authentication.  
   - Functions: register-user, get-user-profile, update-preferences.  

2. **ChallengeFactory.clar**  
   - Factory for creating new savings challenges with custom rules.  
   - Functions: create-challenge, get-challenge-by-id, list-active-challenges.  

3. **SavingsVault.clar**  
   - Secure vault for depositing and locking funds during challenges.  
   - Functions: deposit-funds, withdraw-on-completion, enforce-penalty.  

4. **HabitTracker.clar**  
   - Tracks user habits and progress with on-chain verifiable logs.  
   - Functions: log-habit, get-progress, validate-milestone.  

5. **RewardToken.clar**  
   - Fungible token (SIP-010 compliant) for distributing rewards.  
   - Functions: mint-rewards, transfer-tokens, get-balance.  

6. **MilestoneNFT.clar**  
   - NFT contract (SIP-009) for unique achievement badges.  
   - Functions: mint-nft, transfer-nft, get-owner.  

7. **Governance.clar**  
   - DAO-style governance for voting on platform parameters and reward distributions.  
   - Functions: propose-change, vote-on-proposal, execute-proposal.  

8. **OracleContract.clar**  
   - Integrates external data feeds for habit verification (e.g., API proofs).  
   - Functions: submit-oracle-data, query-oracle, validate-external-proof.  

These contracts interact seamlessly: e.g., ChallengeFactory deploys instances that reference SavingsVault and RewardToken.

## 🚀 Getting Started

1. Install the Clarinet SDK for Stacks development.  
2. Clone the repo: `git clone https://github.com/yourusername/habitforge.git`  
3. Deploy contracts: `clarinet deploy`  
4. Interact via Stacks Explorer or a custom dApp frontend.  

Join the revolution in habit-building—save more, earn more, on-chain! 🚀