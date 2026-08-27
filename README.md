# BOT RWA Valuator

A hackathon-ready Web3 MVP for generating transparent real-world asset valuation estimates and anchoring their proof on **BOT Chain Mainnet**.

## What it does

1. User connects an EVM wallet.
2. User selects an RWA type: real estate, vehicle, equipment, agriculture, or invoice.
3. The app calculates an estimate locally using transparent weighted formulas — **no AI API key is required**.
4. A deterministic report hash is generated in the browser.
5. The user can record the valuation hash and compact valuation data on BOT Chain.
6. The connected wallet confirms the transaction and pays the network gas in **BOT**.
7. The app waits for the real on-chain receipt and links to BOTScan.

> **Important:** The local valuation engine is an algorithmic/AI-ready MVP, not a guaranteed market valuation. It does not independently verify ownership, legal title, documents, market comparables, or debtor creditworthiness.

## BOT Chain configuration

| Setting | Value |
|---|---|
| Network | BOT Chain Mainnet |
| Chain ID | `677` |
| RPC | `https://rpc.botchain.ai` |
| Explorer | `https://scan.botchain.ai` |
| Native gas token | BOT |

## Project structure

```text
.
├── contracts/
│   ├── RWAValuator.sol
│   └── README.md
├── public/
├── src/
│   ├── valuation-engine/
│   ├── lib/
│   │   ├── bot-chain.ts
│   │   └── report-hash.ts
│   ├── components/
│   ├── pages/
│   └── App.tsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Run locally

Requires Node.js 20+.

```bash
npm install
cp .env.example .env
npm run dev
```

The app will run even before a contract address is configured. In that state, valuation is local-only and the UI will not pretend that anything was written to the blockchain.

## Deploy the smart contract

Deploy `contracts/RWAValuator.sol` to BOT Chain Mainnet using Remix, Hardhat, or Foundry.

Network settings:

```text
Chain ID: 677
RPC: https://rpc.botchain.ai
Explorer: https://scan.botchain.ai
```

After deployment, put the contract address in `.env`:

```env
VITE_RWA_VALUATOR_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

Restart the development server after changing the environment variable.

See `contracts/README.md` for the simplest Remix deployment flow.

## Real BOT transaction flow

The application uses the connected EVM wallet to call:

```solidity
recordValuation(...)
```

The transaction is **not simulated**. The wallet displays the real transaction, and the user pays the required BOT gas. The frontend only marks a valuation as anchored after the BOT Chain RPC returns a confirmed receipt.

## GitHub / Vercel

This repository is intentionally standalone and contains no Replit workspace, nested Git history, build output, or generated dependency folders.

For GitHub:

```bash
git init
git add .
git commit -m "Initial BOT RWA Valuator MVP"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

For Vercel, import the repository and use:

```text
Build command: npm run build
Output directory: dist
```

Add `VITE_RWA_VALUATOR_CONTRACT_ADDRESS` under the project's environment variables after the contract is deployed.

## Security notes

- Never commit `.env` or private keys.
- The frontend never needs a private key; wallet signing happens in the user's wallet.
- Do not put an AI provider secret in frontend code if an AI API is added later.
- Private documents should not be stored directly on-chain.
