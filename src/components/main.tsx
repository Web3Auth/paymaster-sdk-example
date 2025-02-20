"use client";

import { MultiChainAccount, Web3AuthPaymaster } from "@web3auth/chain-abstraction-sdk";
import { SignerType } from "@web3auth/erc7579";
import { useEffect, useState } from "react";
import { Address, Hex, zeroAddress } from "viem";
import Modal from "./modal";
import TxForm from "./tx-form";
import { CrosschainTransactionType, PreparedCrossChainUserOp } from "@/types";
import { initWeb3AuthPaymaster } from "@/utils/paymaster";
import BalanceForm from "./balance-form";
import { getBlockExplorerUrl, getBundlerClient } from "@/utils";
import { parseCrosschainUserOpData, prepareCrosschainUserOp } from "@/utils/userop";
import FundToken from "./fund-token";

interface WalletProps {
  account: MultiChainAccount;
  type: SignerType;
}

export default function Main({ account, type = SignerType.WEBAUTHN }: WalletProps) {
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Loading...");
  const [accountAddress, setAccountAddress] = useState<Address>(zeroAddress);
  const [txType, setTxType] = useState<CrosschainTransactionType>(CrosschainTransactionType.CROSSCHAIN_SPONSORSHIP);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [fundModalOpen, setFundModalOpen] = useState(true);
  const [finalUserOpHash, setFinalUserOpHash] = useState<Hex | undefined>(undefined);
  const [blockExplorerUrl, setBlockExplorerUrl] = useState<string | undefined>(undefined);
  const [paymaster, setPaymaster] = useState<Web3AuthPaymaster | undefined>(undefined);
  const [preparedTxDetails, setPreparedTxDetails] = useState<PreparedCrossChainUserOp | null>(null);

  async function handleButtonClick(txType: CrosschainTransactionType) {
    setTxType(txType);
    setTxModalOpen(true);
  }

  async function handlePrepareTx(sourceChainIds: number[], targetChainId: number, sourceFunds?: Hex[]) {
    setLoading(true);
    try {
      const paymaster = await initWeb3AuthPaymaster();
      setPaymaster(paymaster);
      const parsedCrossChainUserOpParams = parseCrosschainUserOpData({
        txType,
        accountAddress,
        sourceChainIds,
        targetChainId,
        sourceFunds,
      });
      console.log("parsedCrossChainUserOpParams", parsedCrossChainUserOpParams);

      setLoadingText("Preparing user operation...");
      const preparedOp = await prepareCrosschainUserOp({
        ...parsedCrossChainUserOpParams,
        paymaster,
        account,
      });

      setPreparedTxDetails({
        ...preparedOp,
        sourceChainIds,
        targetChainId,
        sourceAmount1: sourceFunds?.[0],
        sourceAmount2: sourceFunds?.[1],
      });
    } catch (error) {
      console.error("Error preparing crosschain user operation", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleTxExecute() {
    if (!preparedTxDetails ) return;
    if (!paymaster) return;

    setTxModalOpen(false);
    setLoading(true);

    try {
      setLoadingText("Signing crosschain user operation...");
      const { inputTokens, outputToken, ...preparedMutliChainOp } = preparedTxDetails;
      const signedMultiChainUserOp = await paymaster.core.signMultiChainUserOperation(
        preparedMutliChainOp,
        account,
        inputTokens,
        outputToken
      );
      setLoadingText("Executing crosschain user operation...");
      const { sourceUserOperationHashes, targetUserOperationHash } = await account.sendMultiChainUserOperation(signedMultiChainUserOp);
      console.log("sourceUserOperationHashes", sourceUserOperationHashes);

      setLoadingText("Waiting for source op receipts...");
      const receipts = await Promise.all(
        sourceUserOperationHashes.map((op) => {
          const bundlerClient = getBundlerClient(op.chainId);
          return bundlerClient.waitForUserOperationReceipt({ hash: op.userOperationHash });
        })
      );
      console.log("source op receipts", receipts);

      setLoadingText("Waiting for target op receipt...");
      const targetBundlerClient = getBundlerClient(preparedTxDetails.targetChainId);
      const targetReceipt = await targetBundlerClient.waitForUserOperationReceipt({ hash: targetUserOperationHash });
      console.log("targetReceipt", targetReceipt);

      setBlockExplorerUrl(getBlockExplorerUrl(preparedTxDetails.targetChainId));
      setFinalUserOpHash(targetReceipt.receipt.transactionHash);
    } catch (error) {
      console.error("Error executing crosschain user operation", error);
    } finally {
      setLoading(false);
      setPreparedTxDetails(null);
    }
  }

  useEffect(() => {
    (async () => {
      const address = await account.getAddress();
      setAccountAddress(address);
      setLoading(false);
    })();
  }, [account]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-gray-300 rounded-md p-6">
      <p className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">Web3Auth Chain Abstraction Demo</p>
      {loading ? (
        <div>{loadingText}</div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 w-full">
            <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
              Smart Account: <b className="text-sm">{accountAddress}</b>
            </p>
            <p className="text-sm bg-red-100 p-2 rounded-md text-gray-800">{type}</p>
          </div>
          <div className="my-4 flex flex-col gap-2 w-full">
            <button className="bg-teal-500 p-2 rounded-md text-sm w-full text-white font-bold" onClick={() => setFundModalOpen(true)}>
              Fund Test Token
            </button>
            <button className="bg-green-500 p-2 rounded-md text-sm w-full text-white font-bold" onClick={() => setBalanceModalOpen(true)}>
              Show Test Token Balances
            </button>
            <br />
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
          {txModalOpen && (
            <Modal>
              <TxForm
                type={txType}
                onCancel={() => {
                  setTxModalOpen(false);
                  setPreparedTxDetails(null);
                }}
                onPrepare={handlePrepareTx}
                onExecute={handleTxExecute}
                preparedTxDetails={preparedTxDetails}
              />
            </Modal>
          )}
          {balanceModalOpen && (
            <Modal>
              <BalanceForm account={accountAddress} onClose={() => setBalanceModalOpen(false)} />
            </Modal>
          )}
          {fundModalOpen && (
            <Modal>
              <FundToken accountAddress={accountAddress} onCancel={() => setFundModalOpen(false)} />
            </Modal>
          )}
          {finalUserOpHash && blockExplorerUrl && (
            <div className="mt-4 w-full bg-gray-100 p-2 rounded-md">
              <p className="text-xs text-gray-700">
                Target Transaction Hash:&nbsp;
                <a className="text-xs text-blue-400 font-bold underline" target="_blank" href={`${blockExplorerUrl}/tx/${finalUserOpHash}`}>
                  {finalUserOpHash}
                </a>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
