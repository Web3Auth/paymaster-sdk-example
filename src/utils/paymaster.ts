import { MULTI_CHAIN_RPC_INFO } from "@/config"
import { Web3AuthPaymaster } from "@web3auth/chain-abstraction-sdk"

export const initWeb3AuthPaymaster = async () => {
  const paymasterApiKey = process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY;
  if (!paymasterApiKey) {
    throw new Error("Web3Auth Paymaster API key is not set");
  }

  const web3AuthPaymaster = new Web3AuthPaymaster({
    apiKey: paymasterApiKey,
    chains: MULTI_CHAIN_RPC_INFO,
  });

  return web3AuthPaymaster;
}
