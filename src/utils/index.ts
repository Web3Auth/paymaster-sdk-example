import { MULTI_CHAIN_RPC_INFO, SUPPORTED_CHAINS } from "@/config";
import { http } from "viem";
import { createBundlerClient as createViemBundlerClient } from "viem/account-abstraction";

export const getChainConfigById = (chainId: number) => {
  const chainConfig = MULTI_CHAIN_RPC_INFO.find((config) => config.chainId === chainId);
  if (!chainConfig) {
    throw new Error(`Chain config not found for chainId: ${chainId}`);
  }
  const chain = SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
  if (!chain) {
    throw new Error(`Chain not found for chainId: ${chainId}`);
  }
  return { chain, rpcUrl: chainConfig.rpcUrl };
}

export const getBundlerClient = (chainId: number) => {
  const { rpcUrl, chain } = getChainConfigById(chainId);
  return createViemBundlerClient({
    chain: chain,
    transport: http(rpcUrl),
  });
}

export const getBlockExplorerUrl = (chainId: number) => {
  const chain = SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
  if (!chain) {
    throw new Error(`Chain not found for chainId: ${chainId}`);
  }
  return chain.blockExplorers?.default.url;
}
