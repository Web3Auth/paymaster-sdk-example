import { PaymasterSettings, PaymasterVersion } from "@web3auth/paymaster-sdk";
import { Address } from "viem";
import { optimismSepolia, baseSepolia, polygonAmoy } from "viem/chains";

export const SOURCE_CHAIN_1 = baseSepolia;
export const SOURCE_CHAIN_2 = polygonAmoy;
export const TARGET_CHAIN = optimismSepolia;

const proxyRpcUrl = "https://rpc-proxy.web3auth.dev";
export const SOURCE_CHAIN_1_RPC_URL = `${proxyRpcUrl}?network=${SOURCE_CHAIN_1.id}`;
export const SOURCE_CHAIN_2_RPC_URL = `${proxyRpcUrl}?network=${SOURCE_CHAIN_2.id}`;
export const TARGET_CHAIN_RPC_URL = `${proxyRpcUrl}?network=${TARGET_CHAIN.id}`;

export const MULTI_CHAIN_RPC_INFO = [
  { chainId: SOURCE_CHAIN_1.id, rpcUrl: SOURCE_CHAIN_1_RPC_URL },
  { chainId: SOURCE_CHAIN_2.id, rpcUrl: SOURCE_CHAIN_2_RPC_URL },
  { chainId: TARGET_CHAIN.id, rpcUrl: TARGET_CHAIN_RPC_URL },
];

export const WETH_CONTRACT_MAP: Record<number, Address> = {
  [SOURCE_CHAIN_1.id]: "0x4200000000000000000000000000000000000006",
  [SOURCE_CHAIN_2.id]: "0x52eF3d68BaB452a294342DC3e5f464d7f610f72E",
  [TARGET_CHAIN.id]: "0x4200000000000000000000000000000000000006",
};
export const INPUT_TOKEN_1 = WETH_CONTRACT_MAP[SOURCE_CHAIN_1.id];
export const INPUT_TOKEN_2 = WETH_CONTRACT_MAP[SOURCE_CHAIN_2.id];
export const OUTPUT_TOKEN = WETH_CONTRACT_MAP[TARGET_CHAIN.id];

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
