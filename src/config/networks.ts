import { arbitrumSepolia, polygonAmoy } from 'viem/chains'

export const SOURCE_CHAIN = arbitrumSepolia
export const TARGET_CHAIN = polygonAmoy

const proxyRpcUrl = 'https://rpc-proxy.web3auth.io'
export const SOURCE_CHAIN_RPC_URL = `${proxyRpcUrl}?network=${SOURCE_CHAIN.id}`
export const TARGET_CHAIN_RPC_URL = `${proxyRpcUrl}?network=${TARGET_CHAIN.id}`
