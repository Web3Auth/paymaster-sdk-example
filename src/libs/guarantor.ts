import {
  Account,
  Address,
  Chain,
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  getContract,
  Hex,
  http,
  maxInt256,
  Transport,
  WalletClient,
} from "viem";
import { AUTH_PAYMASTER_ABI } from "./abis/authPaymaster";
import {
  DEFAULT_VALID_UNTIL,
  SOURCE_CHAIN,
  SOURCE_CHAIN_RPC_URL,
  WEB3PAY_TEST_TOKEN,
} from "@/config";
import { waitForTransactionReceipt } from "viem/actions";
import { getPackedUserOperation } from "permissionless";
import { UserOperation } from "viem/account-abstraction";

export const getGuarantorSigForSimulation = async (params: {
  targetOpHash: Hex;
  walletClient: WalletClient<Transport, Chain, Account>;
  amount: bigint;
  authPmAddress: Address;
}) => {
  const { targetOpHash, walletClient, amount, authPmAddress } = params;
  const tokenAddress = WEB3PAY_TEST_TOKEN;

  const authFund = getContract({
    abi: AUTH_PAYMASTER_ABI,
    address: authPmAddress,
    client: createPublicClient({
      chain: SOURCE_CHAIN,
      transport: http(SOURCE_CHAIN_RPC_URL),
    }),
  });

  const guarantorHash = await authFund.read.getGuarantorHash([
    tokenAddress,
    amount,
    targetOpHash,
    DEFAULT_VALID_UNTIL,
  ]);

  const signature = await walletClient.signMessage({
    message: { raw: guarantorHash as Hex },
  });

  return signature;
};

export const approveAuthPaymasterToSpendToken = async (
  walletClient: WalletClient<Transport, Chain, Account>,
  amount: bigint,
  authPmAddress: Address,
) => {
  const testTokenContract = getContract({
    abi: erc20Abi,
    address: WEB3PAY_TEST_TOKEN,
    client: walletClient,
  });

  const allowance = await testTokenContract.read.allowance([walletClient.account.address, authPmAddress]) as bigint;
  if (allowance > amount) return;

  const approvalHash = await walletClient.writeContract({
    address: WEB3PAY_TEST_TOKEN,
    abi: erc20Abi,
    functionName: "approve",
    args: [authPmAddress, maxInt256],
  });

  const receipt = await waitForTransactionReceipt(walletClient, { hash: approvalHash });
  if (receipt.status !== "success") {
    throw new Error("Failed to approve auth paymaster to spend token");
  }
}

export const getGuarantorSigForUserOp = async (params: {
  walletClient: WalletClient<Transport, Chain, Account>;
  userOp: UserOperation<"0.7">;
  authPmAddress: Address;
}) => {
  const { walletClient, userOp, authPmAddress } = params;
  const authFund = getContract({
    abi: AUTH_PAYMASTER_ABI,
    address: authPmAddress,
    client: createPublicClient({
      chain: SOURCE_CHAIN,
      transport: http(SOURCE_CHAIN_RPC_URL),
    }),
  });

  const hash = (await authFund.read.getHash([
    getPackedUserOperation(userOp),
  ])) as Hex;

  const sig = await walletClient.signMessage({
    message: { raw: hash as Hex },
  });

  return sig;
}

export const generateCallDataForGuarantorFlow = async (params: {
  userOp: UserOperation<"0.7">;
  walletClient: WalletClient<Transport, Chain, Account>;
  amount: bigint;
  authPmAddress: Address;
}) => {
  const { userOp, walletClient, amount, authPmAddress } = params;

  const authPaymaster = getContract({
    abi: AUTH_PAYMASTER_ABI,
    address: authPmAddress,
    client: createPublicClient({
      chain: SOURCE_CHAIN,
      transport: http(SOURCE_CHAIN_RPC_URL),
    }),
  });

  const userOpHash = await authPaymaster.read.getHash([getPackedUserOperation(userOp)]) as Hex;

  // first we need to get guarantor signature
  const [guarantorSigForSim, actualGuarantorSig] = await Promise.all([
    getGuarantorSigForSimulation({
      targetOpHash: userOpHash,
      walletClient,
      amount: 0n,
      authPmAddress,
    }),
    getGuarantorSigForSimulation({
      targetOpHash: userOpHash,
      walletClient,
      amount,
      authPmAddress,
    }),
  ]);

  // prepare calldata
  const simulationCallData = {
    value: 0n,
    to: authPmAddress,
    data: encodeFunctionData({
      abi: AUTH_PAYMASTER_ABI,
      functionName: "prefundFromGuarantor",
      args: [
        WEB3PAY_TEST_TOKEN,
        0n,
        userOpHash,
        walletClient.account.address,
        DEFAULT_VALID_UNTIL,
        guarantorSigForSim,
      ],
    }),
  };
  const callData = {
    value: 0n,
    to: authPmAddress,
    data: encodeFunctionData({
      abi: AUTH_PAYMASTER_ABI,
      functionName: "prefundFromGuarantor",
      args: [
        WEB3PAY_TEST_TOKEN,
        amount,
        userOpHash,
        walletClient.account.address,
        DEFAULT_VALID_UNTIL,
        actualGuarantorSig,
      ],
    }),
  };

  return { simulationCallData, callData };
};
