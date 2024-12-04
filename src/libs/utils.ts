import {
  Account,
  Address,
  Chain,
  createClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  getContract,
  Hex,
  http,
  maxInt256,
  parseAbi,
  Transport,
  WalletClient,
} from "viem";
import { PAYMASTER_ADDRESS, SOURCE_CHAIN, SOURCE_CHAIN_RPC_URL, WEB3AUTH_NFT_ADDRESS, WEB3PAY_TEST_TOKEN } from "@/config";
import { waitForTransactionReceipt } from "viem/actions";
import { bundlerActions } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";

export const createBundlerClient = (chain: Chain, rpcUrl: string) => {
  const bundlerTransport = http(rpcUrl)
  return createClient({ chain, transport: bundlerTransport }).extend(bundlerActions)
}

export const fundTestToken = async (receiverAddress: Hex) => {
  const randomAccount = privateKeyToAccount(process.env.NEXT_PUBLIC_TEST_PRIVATE_KEY as Hex)

  const client = createWalletClient({
    account: randomAccount,
    chain: SOURCE_CHAIN,
    transport: http(SOURCE_CHAIN_RPC_URL),
  })

  const txHash = await client.sendTransaction({
    to: WEB3PAY_TEST_TOKEN,
    value: 0n,
    data: encodeFunctionData({
      abi: parseAbi(['function mint(address to, uint256 amount)']),
      functionName: 'mint',
      args: [receiverAddress, 900000000000000000n],
    }),
  })
  console.log(`Funded test token to account ${receiverAddress}. Tx Hash: ${txHash}`)
  await waitForTransactionReceipt(client, { hash: txHash })
  console.log(`Funded test token to account ${receiverAddress} with tx receipt`)
}


export const approveAuthPaymasterToSpendToken = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  amount: bigint,
  authPmAddress: Address
) => {
  const testTokenContract = getContract({
    abi: erc20Abi,
    address: WEB3PAY_TEST_TOKEN,
    client: walletClient,
  });

  const allowance = (await testTokenContract.read.allowance([
    walletClient.account.address,
    authPmAddress,
  ])) as bigint;
  if (allowance > amount) return;

  const approvalHash = await walletClient.writeContract({
    address: WEB3PAY_TEST_TOKEN,
    abi: erc20Abi,
    functionName: "approve",
    args: [authPmAddress, maxInt256],
  });

  const receipt = await waitForTransactionReceipt(walletClient, {
    hash: approvalHash,
  });
  if (receipt.status !== "success") {
    throw new Error("Failed to approve auth paymaster to spend token");
  }
};

export const createTestTokenTransfer = (recipient: Address = PAYMASTER_ADDRESS, amount: bigint = 1n) => {
  return {
    to: WEB3PAY_TEST_TOKEN as Address,
    value: 0n,
    data: encodeFunctionData({
      abi: parseAbi(['function transfer(address to, uint256 amount)']),
      functionName: 'transfer',
      args: [recipient, amount],
    }),
  }
}

export const createMintNftCallData = (recipient: Hex) => {
  return {
    to: WEB3AUTH_NFT_ADDRESS as Address,
    data: encodeFunctionData({
      abi: parseAbi(['function mint(address to)']),
      functionName: 'mint',
      args: [recipient],
    }),
  }
}
