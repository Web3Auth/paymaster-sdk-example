import { Web3AuthPrepareMultiChainUserOperationReturnType } from "@web3auth/chain-abstraction-sdk";
import { Hex } from "viem";

export enum CrosschainTransactionType {
  CROSSCHAIN_SPONSORSHIP = 0,
  TRANSFER_LIQUIDITY = 1,
  MULTI_SOURCE = 2,
}

export type PreparedCrossChainUserOp = Web3AuthPrepareMultiChainUserOperationReturnType & {
  sourceChainIds: number[];
  targetChainId: number;
  txAmount: number;
  sourceAmount1?: Hex;
  sourceAmount2?: Hex;
}
