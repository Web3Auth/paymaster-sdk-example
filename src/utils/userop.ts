import { CrosschainTransactionType } from "@/types";
import { Call, MultiChainAccount, Web3AuthPaymaster } from "@web3auth/chain-abstraction-sdk";
import { Address, Hex, parseUnits } from "viem";
import { createTestTokenMintCall, createTokenTransferCall } from "./token";
import { WEB3PAY_TEST_TOKEN } from "@/config";

export const parseCrosschainUserOpData = (params: {
  txType: CrosschainTransactionType;
  accountAddress: Address;
  sourceChainIds: number[];
  targetChainId: number;
  inputTokens?: Address[];
  outputToken?: Address;
  sourceFunds?: Hex[];
}) => {
  console.log("params", params);
  const { txType, accountAddress, sourceChainIds, targetChainId } = params;
  const inputTokens = params.inputTokens || [WEB3PAY_TEST_TOKEN];
  const outputToken = params.outputToken || WEB3PAY_TEST_TOKEN;
  let targetAmount: bigint | undefined
  let calls: Call[] = [];
  let sourceFunds: Hex[] | undefined;

  if (txType !== CrosschainTransactionType.MULTI_SOURCE && sourceChainIds.length !== 1 && inputTokens.length !== 1) {
    throw new Error("Only `One` source chain and `One` input token are needed for non-multi-source transactions")
  }

  if (txType === CrosschainTransactionType.TRANSFER_LIQUIDITY) {
    targetAmount = parseUnits('10', 6);
    calls = [createTokenTransferCall(WEB3PAY_TEST_TOKEN, accountAddress, targetAmount)]
  } else if (txType === CrosschainTransactionType.MULTI_SOURCE) {
    targetAmount = parseUnits('10', 6);
    calls = [createTokenTransferCall(WEB3PAY_TEST_TOKEN, accountAddress, targetAmount)]
    inputTokens.push(WEB3PAY_TEST_TOKEN);
    if (sourceChainIds.length < 2) {
      throw new Error("At least `Two` source chains are needed for multi-source transactions")
    }
    if (!params.sourceFunds) {
      throw new Error('sourceFunds is required for multi-source transaction')
    }
    if (params.sourceFunds.length !== sourceChainIds.length) {
      throw new Error('Number of source funds must match number of source chain ids')
    }
    sourceFunds = params.sourceFunds
  } else {
    calls = [createTestTokenMintCall(accountAddress)];
  }

  return {
    inputTokens,
    outputToken,
    sourceChainIds,
    targetChainId,
    calls,
    sourceFunds,
    targetAmount,
  }
}

export const prepareCrosschainUserOp = async (params: {
  paymaster: Web3AuthPaymaster;
  account: MultiChainAccount;
  calls: Call[];
  sourceChainIds: number[];
  targetChainId: number;
  inputTokens: Address[];
  outputToken: Address;
  sourceFunds?: Hex[];
}) => {
  const { paymaster, account, calls, sourceChainIds, targetChainId, inputTokens, outputToken, sourceFunds } = params;
  const { estimatedGasFeesOnTargetChain, ...preparedMultiChainUserOperation } = await paymaster.core.prepareMultiChainUserOperation({
    account,
    calls,
    sourceChainIds,
    targetChainId,
    inputTokens,
    outputToken,
    sourceFunds,
  });

  return { estimatedGasFeesOnTargetChain, ...preparedMultiChainUserOperation };
};

