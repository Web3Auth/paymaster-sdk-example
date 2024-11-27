import { arbitrumSepolia, polygonAmoy } from 'viem/chains'

export const SOURCE_CHAIN = arbitrumSepolia
export const TARGET_CHAIN = polygonAmoy

const proxyRpcUrl = 'https://rpc-proxy.web3auth.io'
export const SOURCE_CHAIN_RPC_URL = `${proxyRpcUrl}?network=${SOURCE_CHAIN.id}`
export const TARGET_CHAIN_RPC_URL = `${proxyRpcUrl}?network=${TARGET_CHAIN.id}`

export const WEB3PAY_API_URL = 'https://lrc-accounts.web3auth.io/api'

export const WEB3AUTH_NFT_ADDRESS = '0xD0f3053e39040Eb2e0bc8B4eF8f7bF92636aCd25'
export const WEB3PAY_TEST_TOKEN = '0xe12349b2E35F6053Ed079E281427fc1F25b3C087'
export const DEFAULT_VALID_AFTER = Number("0x0000000000001234");
export const DEFAULT_VALID_UNTIL = 1907424000000;
