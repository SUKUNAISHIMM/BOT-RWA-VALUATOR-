import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { defineChain } from 'viem';

export const BOT_CHAIN_ID = 677;
export const BOT_CHAIN_HEX = '0x2a5';
export const BOT_RPC_URL = 'https://rpc.botchain.ai';
export const BOT_EXPLORER_URL = 'https://scan.botchain.ai';
export const BOT_CHAIN = defineChain({
  id: BOT_CHAIN_ID,
  name: 'BOT Chain Mainnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: [BOT_RPC_URL] } },
  blockExplorers: { default: { name: 'BOTScan', url: BOT_EXPLORER_URL } },
});

export const rwaValuatorAbi = [
  {
    type: 'function',
    name: 'recordValuation',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assetId', type: 'string' },
      { name: 'assetType', type: 'string' },
      { name: 'estimatedValue', type: 'uint256' },
      { name: 'riskScore', type: 'uint256' },
      { name: 'confidenceScore', type: 'uint256' },
      { name: 'reportHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getValuation',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'string' }],
    outputs: [
      { name: 'assetId', type: 'string' },
      { name: 'assetType', type: 'string' },
      { name: 'estimatedValue', type: 'uint256' },
      { name: 'riskScore', type: 'uint256' },
      { name: 'confidenceScore', type: 'uint256' },
      { name: 'reportHash', type: 'bytes32' },
      { name: 'submitter', type: 'address' },
      { name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'ValuationRecorded',
    anonymous: false,
    inputs: [
      { name: 'assetId', type: 'string', indexed: false },
      { name: 'assetType', type: 'string', indexed: false },
      { name: 'estimatedValue', type: 'uint256', indexed: false },
      { name: 'riskScore', type: 'uint256', indexed: false },
      { name: 'confidenceScore', type: 'uint256', indexed: false },
      { name: 'reportHash', type: 'bytes32', indexed: false },
      { name: 'submitter', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const;

export type InjectedProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

export const contractAddress = (import.meta.env.VITE_RWA_VALUATOR_CONTRACT_ADDRESS || '') as Address | '';

export function hasWalletProvider() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

export function getPublicClient(): PublicClient {
  return createPublicClient({ chain: BOT_CHAIN, transport: http(BOT_RPC_URL) });
}

export function getWalletClient(): WalletClient {
  if (!window.ethereum) throw new Error('No EVM wallet detected. Install or unlock a wallet extension.');
  return createWalletClient({ chain: BOT_CHAIN, transport: custom(window.ethereum) });
}

export async function connectWallet(): Promise<{ address: Address; chainId: number }> {
  const walletClient = getWalletClient();
  const [address] = await walletClient.requestAddresses();
  const chainId = await walletClient.getChainId();
  return { address, chainId };
}

export async function switchToBotChain() {
  if (!window.ethereum) throw new Error('No EVM wallet detected.');
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BOT_CHAIN_HEX }] });
  } catch (error) {
    if ((error as { code?: number }).code !== 4902) throw error;
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: BOT_CHAIN_HEX,
        chainName: BOT_CHAIN.name,
        nativeCurrency: BOT_CHAIN.nativeCurrency,
        rpcUrls: [BOT_RPC_URL],
        blockExplorerUrls: [BOT_EXPLORER_URL],
      }],
    });
  }
}

export type ValuationTransactionParams = {
  address: Address;
  assetId: string;
  assetType: string;
  estimatedValue: number;
  riskScore: number;
  confidenceScore: number;
  reportHash: `0x${string}`;
};

export async function submitValuationOnChain(params: ValuationTransactionParams): Promise<Hash> {
  if (!contractAddress) throw new Error('Contract address is not configured. Add VITE_RWA_VALUATOR_CONTRACT_ADDRESS to the app environment.');
  const walletClient = getWalletClient();
  return walletClient.writeContract({
    address: contractAddress,
    abi: rwaValuatorAbi,
    functionName: 'recordValuation',
    account: params.address,
    chain: BOT_CHAIN,
    args: [
      params.assetId,
      params.assetType,
      BigInt(params.estimatedValue),
      BigInt(params.riskScore),
      BigInt(params.confidenceScore),
      params.reportHash,
    ],
  });
}

export async function confirmValuationTransaction(hash: Hash) {
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
  return receipt;
}

export async function recordValuationOnChain(params: ValuationTransactionParams): Promise<{ hash: Hash; receipt: Awaited<ReturnType<PublicClient['waitForTransactionReceipt']>> }> {
  const hash = await submitValuationOnChain(params);
  const receipt = await confirmValuationTransaction(hash);
  return { hash, receipt };
}

export async function readValuation(assetId: string) {
  if (!contractAddress) throw new Error('Contract address is not configured.');
  return getPublicClient().readContract({
    address: contractAddress,
    abi: rwaValuatorAbi,
    functionName: 'getValuation',
    args: [assetId],
  });
}

export async function getWalletValuations(address: Address) {
  if (!contractAddress) return [];
  const logs = await getPublicClient().getLogs({
    address: contractAddress,
    event: rwaValuatorAbi[2],
    args: { submitter: address },
    fromBlock: 0n,
  });
  return logs.map((log) => ({
    ...log.args,
    transactionHash: log.transactionHash,
  }));
}