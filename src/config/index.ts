import { PaymasterSettings, PaymasterVersion } from "@web3auth/chain-abstraction-sdk";
import { Address, parseUnits } from "viem";
import { sepolia, baseSepolia, polygonAmoy } from "viem/chains";

export const CHAIN_1 = baseSepolia;
export const CHAIN_2 = polygonAmoy;
export const CHAIN_3 = sepolia;

const proxyRpcUrl = "https://rpc-proxy.web3auth.dev";
export const CHAIN_1_RPC_URL = `${proxyRpcUrl}?network=${CHAIN_1.id}`;
export const CHAIN_2_RPC_URL = `${proxyRpcUrl}?network=${CHAIN_2.id}`;
export const CHAIN_3_RPC_URL = `${proxyRpcUrl}?network=${CHAIN_3.id}`;

export const MULTI_CHAIN_RPC_INFO = [
  { chainId: CHAIN_1.id, rpcUrl: CHAIN_1_RPC_URL },
  { chainId: CHAIN_2.id, rpcUrl: CHAIN_2_RPC_URL },
  { chainId: CHAIN_3.id, rpcUrl: CHAIN_3_RPC_URL },
];

export const WETH_CONTRACT_MAP: Record<number, Address> = {
  [CHAIN_1.id]: "0x4200000000000000000000000000000000000006",
  [CHAIN_2.id]: "0x52eF3d68BaB452a294342DC3e5f464d7f610f72E",
  [CHAIN_3.id]: "0x4200000000000000000000000000000000000006",
};
export const INPUT_TOKEN_1 = WETH_CONTRACT_MAP[CHAIN_1.id];
export const INPUT_TOKEN_2 = WETH_CONTRACT_MAP[CHAIN_2.id];
export const OUTPUT_TOKEN = WETH_CONTRACT_MAP[CHAIN_3.id];

export const WEB3PAY_API_URL = "https://lrc-accounts.web3auth.io/api";

// Note: This NFT is only available on Polygon Amoy
export const WEB3AUTH_NFT_ADDRESS: Address =
  "0xD0f3053e39040Eb2e0bc8B4eF8f7bF92636aCd25";
export const WEB3PAY_TEST_TOKEN: Address =
  "0x33ce8240046670f56f5021A37bB55b35B8C9df8A";
export const PAYMASTER_ADDRESS: Address =
  "0x4462408cd14a9b319F931D191a858A0C474F57f3";
export const DEFAULT_VALID_AFTER = Number("0x0000000000001234");
export const DEFAULT_VALID_UNTIL = 1907424000000;

export const MULTI_CHAIN_PAYMASTER_SETTINGS: PaymasterSettings = {
  apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
  chains: MULTI_CHAIN_RPC_INFO,
  paymasterVersion: PaymasterVersion.V0_2_0,
};

export const TEST_TRANSFER_AMOUNT = parseUnits('10', 6);