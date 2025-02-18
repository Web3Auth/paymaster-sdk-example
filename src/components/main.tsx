"use client";

import { SOURCE_CHAIN_1, SOURCE_CHAIN_2, TARGET_CHAIN } from "@/config";
import { MultiChainAccount } from "@web3auth/chain-abstraction-sdk";
import { SignerType } from "@web3auth/erc7579";
import { useEffect, useState } from "react";
import { Address, Hex, zeroAddress } from "viem";
import Modal from "./modal";
import TxForm from "./tx-form";
import { CrosschainTransactionType } from "@/types";
import { initWeb3AuthPaymaster } from "@/utils/paymaster";
import BalanceForm from "./balance-form";
import { getBundlerClient } from "@/utils";
import { parseCrosschainUserOpData, prepareCrosschainUserOp } from "@/utils/userop";

interface WalletProps {
  account: MultiChainAccount;
  type: SignerType;
}

export default function Main({ account, type = SignerType.WEBAUTHN }: WalletProps) {
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Loading...');
  const [accountAddress, setAccountAddress] = useState<Address>(zeroAddress);
  const [txType, setTxType] = useState<CrosschainTransactionType>(CrosschainTransactionType.CROSSCHAIN_SPONSORSHIP);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [finalUserOpHash, setFinalUserOpHash] = useState<Hex | undefined>(undefined);

  async function handleButtonClick(txType: CrosschainTransactionType) {
    setTxType(txType);
    setTxModalOpen(true);
  }

  async function handleTxExecute(multiSrcProps?: {
    sourceAmount1: Hex;
    sourceAmount2: Hex;
  }) {
    setTxModalOpen(false);
    setLoading(true);

    try {
      const paymaster = await initWeb3AuthPaymaster();
      let sourceFunds: Hex[] | undefined;
      if (txType === CrosschainTransactionType.MULTI_SOURCE && multiSrcProps) {
        console.log("multiSrcProps", multiSrcProps);
        const { sourceAmount1, sourceAmount2 } = multiSrcProps;
        sourceFunds = [sourceAmount1, sourceAmount2];
      }
      const parsedCrossChainUserOpParams = parseCrosschainUserOpData(txType, accountAddress, sourceFunds);

      setLoadingText('Preparing user operation...');
      const { estimatedGasFeesOnTargetChain, ...preparedMultiChainUserOperation } = await prepareCrosschainUserOp({
        ...parsedCrossChainUserOpParams,
        paymaster,
        account,
      });
      console.log("estimatedGasFeesOnTargetChain", estimatedGasFeesOnTargetChain);
      console.log("preparedMultiChainUserOperation", preparedMultiChainUserOperation);

      setLoadingText('Executing crosschain user operation...');
      const { sourceUserOperationHashes, targetUserOperationHash } = await account.sendMultiChainUserOperation(preparedMultiChainUserOperation);
      console.log('sourceUserOperationHashes', sourceUserOperationHashes);

      setLoadingText("Waiting for source op receipts...");
      const receipts = await Promise.all(sourceUserOperationHashes.map((op) => {
        const bundlerClient = getBundlerClient(op.chainId);
        return bundlerClient.waitForUserOperationReceipt({ hash: op.userOperationHash });
      }))
      console.log('source op receipts', receipts);

      setLoadingText("Waiting for target op receipt...");
      const targetBundlerClient = getBundlerClient(TARGET_CHAIN.id);
      const targetReceipt = await targetBundlerClient.waitForUserOperationReceipt({ hash: targetUserOperationHash });
      console.log('targetReceipt', targetReceipt);

      setFinalUserOpHash(targetReceipt.receipt.transactionHash);
    } catch (error) {
      console.error('Error executing crosschain user operation', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const address = await account.getAddress();
      setAccountAddress(address);
      setLoading(false);
    })()
  }, [account]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-gray-300 rounded-md p-6">
      <p className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
        Web3Auth Chain Abstraction Demo
      </p>
      {
        loading ? (
          <div>{loadingText}</div>
        ) : (
          <>
            <div className="flex items-center gap-2 w-full mb-4">
              <p className="text-xs bg-blue-100 p-1 rounded-md text-gray-800">
                <b>Source Chain 1:</b> {SOURCE_CHAIN_1.name}
              </p>
              <p className="text-xs bg-violet-100 p-1 rounded-md text-gray-800">
                <b>Source Chain 2:</b> {SOURCE_CHAIN_2.name}
              </p>
              <p className="text-xs bg-violet-100 p-1 rounded-md text-gray-800">
                <b>Target Chain:</b> {TARGET_CHAIN.name}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 w-full">
              <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
                Smart Account: <b className="text-sm">{accountAddress}</b>
              </p>
              <p className="text-sm bg-red-100 p-2 rounded-md text-gray-800">
                {type}
              </p>
            </div>
            <div className="my-4 flex flex-col gap-2 w-full">
              <button
                className="bg-blue-500 p-2 rounded-md text-sm w-full text-white font-bold"
                onClick={() => setBalanceModalOpen(true)}
              >
                Show Test Token Balances
              </button>
              <button
                className="bg-blue-500 p-2 rounded-md text-sm w-full text-white font-bold"
                onClick={() => handleButtonClick(CrosschainTransactionType.CROSSCHAIN_SPONSORSHIP)}
              >
                Sponsor Crosschain Transaction
              </button>
              <button
                className="bg-blue-500 p-2 rounded-md text-sm w-full text-white font-bold"
                onClick={() => handleButtonClick(CrosschainTransactionType.TRANSFER_LIQUIDITY)}
              >
                Transfer Liquidity to Different Chain
              </button>
              <button
                className="bg-blue-500 p-2 rounded-md text-sm w-full text-white font-bold"
                onClick={() => handleButtonClick(CrosschainTransactionType.MULTI_SOURCE)}
              >
                Transfer Liquidity from Multiple Source Chains to Target Chain
              </button>
            </div>
            {
              txModalOpen && (
                <Modal>
                  <TxForm type={txType} onCancel={() => setTxModalOpen(false)} onExecute={handleTxExecute} />
                </Modal>
              )
            }
            {
              balanceModalOpen && (
                <Modal>
                  <BalanceForm account={accountAddress} onClose={() => setBalanceModalOpen(false)} />
                </Modal>
              )
            }
            {finalUserOpHash && (
              <div className="mt-4 w-full bg-gray-200 p-2 rounded-md">
                <p className="text-xs">
                  Target Transaction Hash:{" "}
                  <a
                    className="text-xs text-blue-400 font-bold underline"
                    target="_blank"
                    href={`https://sepolia.etherscan.io/tx/${finalUserOpHash}`}
                  >
                    {finalUserOpHash}
                  </a>
                </p>
              </div>
            )}
          </>
        )
      }
    </div>
  )
}
