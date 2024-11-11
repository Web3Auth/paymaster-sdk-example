import {
  Account,
  Address,
  Chain,
  erc20Abi,
  getContract,
  maxInt256,
  Transport,
  WalletClient,
} from "viem";
import { WEB3PAY_TEST_TOKEN } from "@/config";
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
