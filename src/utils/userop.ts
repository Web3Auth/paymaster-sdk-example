import { CrosschainTransactionType } from "@/types";
import { Call, MultiChainAccount, Web3AuthPaymaster } from "@web3auth/chain-abstraction-sdk";
import { Address, Hex, parseUnits } from "viem";
import { createTestTokenMintCall, createTokenTransferCall } from "./token";
import { WEB3PAY_TEST_TOKEN, SOURCE_CHAIN_1, TARGET_CHAIN, SOURCE_CHAIN_2 } from "@/config";

export const parseCrosschainUserOpData = (txType: CrosschainTransactionType, accountAddress: Address, sourceFunds_: Hex[] | undefined) => {
  const inputTokens: Address[] = [WEB3PAY_TEST_TOKEN]
  const outputToken = WEB3PAY_TEST_TOKEN;
  const sourceChainIds: number[] = [SOURCE_CHAIN_1.id];
  const targetChainId = TARGET_CHAIN.id;
  const transferAmount = parseUnits('10', 6);
  let calls: Call[] = [createTestTokenMintCall(accountAddress)];
  let sourceFunds: Hex[] | undefined;

  if (txType === CrosschainTransactionType.TRANSFER_LIQUIDITY) {
    calls = [createTokenTransferCall(WEB3PAY_TEST_TOKEN, accountAddress, transferAmount)]
  } else if (txType === CrosschainTransactionType.MULTI_SOURCE) {
    calls = [createTokenTransferCall(WEB3PAY_TEST_TOKEN, accountAddress, transferAmount)]
    sourceChainIds.push(SOURCE_CHAIN_2.id);
    inputTokens.push(WEB3PAY_TEST_TOKEN);
    if (!sourceFunds_) {
      throw new Error('sourceFunds is required for multi-source transaction')
    }
    if (sourceFunds_.length !== sourceChainIds.length) {
      throw new Error('Number of source funds must match number of source chain ids')
    }
    sourceFunds = sourceFunds_
  }

  return {
    inputTokens,
    outputToken,
    sourceChainIds,
    targetChainId,
    calls,
    sourceFunds,
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

