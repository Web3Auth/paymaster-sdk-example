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
import { SmartAccount } from "viem/account-abstraction";

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

export const createMintNftCallData = (account: SmartAccount, recipient: Hex) => {
  return account.encodeCalls([
    {
      to: WEB3AUTH_NFT_ADDRESS,
      data: encodeFunctionData({
        abi: parseAbi(['function mint(address to)']),
        functionName: 'mint',
        args: [recipient],
      }),
    },
  ])
}
