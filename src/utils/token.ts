import { Address, Chain, createPublicClient, encodeFunctionData, erc20Abi, formatUnits, http, parseAbi, parseUnits } from "viem"
import { WEB3PAY_TEST_TOKEN } from "@/config"

export const queryErc20TokenBalance = async (address: Address, chain: Chain, rpcUrl: string, tokenAddress: Address = WEB3PAY_TEST_TOKEN) => {
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
  
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });

  return balance as bigint;
}

export const createTestTokenMintCall = (receiverAddress: Address, mintAmount: bigint = parseUnits('100', 6)) => {
  const mintInvocation = encodeFunctionData({
    abi: parseAbi(['function mint(address to, uint256 amount)']),
    functionName: 'mint',
    args: [receiverAddress, mintAmount],
  })
  return {
    to: WEB3PAY_TEST_TOKEN,
    data: mintInvocation,
  }
}

export const createTokenTransferCall = (tokenAddress: Address, receiverAddress: Address, amount: bigint) => {
  const transferInvocation = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [receiverAddress, amount],
  })
  return {
    to: tokenAddress,
    data: transferInvocation,
  }
}

export const parseW3PTestTokenValue = (amount: bigint) => {
  let value = formatUnits(amount, 6);
  value = parseFloat(value).toFixed(4);
  return `${value} W3PTEST`;
}
