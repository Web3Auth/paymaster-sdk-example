import {
  Account,
  Address,
  Chain,
  encodeFunctionData,
  erc20Abi,
  getContract,
  Hex,
  maxInt256,
  parseAbi,
  Transport,
  WalletClient,
} from "viem";
import { WEB3AUTH_NFT_ADDRESS, WEB3PAY_TEST_TOKEN } from "@/config";
import { waitForTransactionReceipt } from "viem/actions";

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

export const createTestTokenTransfer = (paymasterAddress: Address) => {
  return {
    to: WEB3PAY_TEST_TOKEN as Address,
    value: 0n,
    data: encodeFunctionData({
      abi: parseAbi(['function transfer(address to, uint256 amount)']),
      functionName: 'transfer',
      args: [paymasterAddress, 1n],
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
