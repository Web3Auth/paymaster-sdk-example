"use client";

import { TEST_TRANSFER_AMOUNT, SUPPORTED_CHAINS } from "@/config";
import { CrosschainTransactionType, PreparedCrossChainUserOp } from "@/types";
import { useEffect, useState } from "react";
import { formatUnits, Hex, parseUnits, toHex } from "viem";
import Dropdown from "./dropdown";
import MultiSourceTx from "./multi-sourc-tx";
import TxDetails from "./tx-details";

interface ITxFormProps {
  type: CrosschainTransactionType;
  onCancel: () => void;
  onPrepare: (sourceChainIds: number[], targetChainId: number, sourceFunds?: Hex[]) => Promise<void>;
  onExecute: () => Promise<void>;
  preparedTxDetails: PreparedCrossChainUserOp | null;
}

export default function TxForm({ type, onCancel, onPrepare, onExecute, preparedTxDetails }: ITxFormProps) {
  const [sourceAmount1, setSourceAmount1] = useState(0);
  const [sourceAmount2, setSourceAmount2] = useState(0);
  const [sourceChainId1, setSourceChainId1] = useState<number | undefined>(undefined);
  const [sourceChainId2, setSourceChainId2] = useState<number | undefined>(undefined);
  const [targetChainId, setTargetChainId] = useState<number | undefined>(undefined);

  function getTextForTxType() {
    switch (type) {
      case CrosschainTransactionType.CROSSCHAIN_SPONSORSHIP:
        return "Crosschain Transaction Sponsorship";
      case CrosschainTransactionType.TRANSFER_LIQUIDITY:
        return "Crosschain Liquidity Transfer";
      case CrosschainTransactionType.MULTI_SOURCE:
        return "Cross Liquidity Transfer (from multiple source chains)";
      default:
        return "Unknown Transaction Type";
    }
  }

  function getDescriptionForTxType() {
    switch (type) {
      case CrosschainTransactionType.CROSSCHAIN_SPONSORSHIP:
        return `
        Use a Test ERC-20 token from the source chain to pay fees 
        for minting a Test Token on the target chain.
        (Mint amount: 100 W3PTEST)
        `;
      case CrosschainTransactionType.TRANSFER_LIQUIDITY:
        return `
        Transfer Test ERC-20 token from the selected source chain 
        to the selected target chain.
        (Transfer amount: 10 W3PTEST)
        `;
      case CrosschainTransactionType.MULTI_SOURCE:
        return `
        Transfer Test ERC-20 token from multiple source chains 
        to the selected target chain.
        (Transfer amount: 10 W3PTEST)
        `;
      default:
        return "Unknown Transaction Type";
    }
  }

  function handleSourceChainId1Selected(chainId: number) {
    setSourceChainId1(chainId);
  }

  function handleSourceChainId2Selected(chainId: number) {
    setSourceChainId2(chainId);
  }

  function handleTargetChainSelected(chainId: number) {
    setTargetChainId(chainId);
  }

  async function handlePrepareClick() {
    let sourceFunds: Hex[] | undefined;
    if (type === CrosschainTransactionType.MULTI_SOURCE) {
      sourceFunds = [parseUnits(sourceAmount1.toString(), 6), parseUnits(sourceAmount2.toString(), 6)].map((n) => toHex(n));
    }
    if (!targetChainId) return;

    const sourceChainIds = [sourceChainId1, sourceChainId2].filter((chainId) => chainId !== undefined) as number[];
    await onPrepare(sourceChainIds, targetChainId, sourceFunds);
  }

  useEffect(() => {
    if (preparedTxDetails) {
      setSourceChainId1(preparedTxDetails.sourceChainIds[0]);
      setSourceChainId2(preparedTxDetails.sourceChainIds[1]);
      setTargetChainId(preparedTxDetails.targetChainId);
      const srcAmount1 = Number(formatUnits(BigInt(preparedTxDetails.sourceAmount1 ?? "0"), 6));
      setSourceAmount1(srcAmount1);
      const srcAmount2 = Number(formatUnits(BigInt(preparedTxDetails.sourceAmount2 ?? "0"), 6));
      setSourceAmount2(srcAmount2);
    }
  }, [preparedTxDetails]);

  return (
    <div className="flex flex-col gap-2 w-xl min-w-xl p-4">
      <p className="font-bold">{getTextForTxType()}</p>
      <div className="flex flex-col bg-gray-100 rounded-md p-2">
        <p className="text-xs text-gray-500 whitespace-pre text-center ml-[-15px]">{getDescriptionForTxType()}</p>
      </div>
      {/** Source Chain */}
      {type === CrosschainTransactionType.MULTI_SOURCE ? (
        <MultiSourceTx
          handleSourceChain1Selected={handleSourceChainId1Selected}
          handleSourceChain2Selected={handleSourceChainId2Selected}
          sourceAmount1={sourceAmount1}
          sourceAmount1OnChange={setSourceAmount1}
          sourceAmount2={sourceAmount2}
          sourceAmount2OnChange={setSourceAmount2}
          sourceChainId1={sourceChainId1}
          sourceChainId2={sourceChainId2}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-gray-900">Source Chain:</p>
          <div className="flex gap-2">
            <Dropdown options={SUPPORTED_CHAINS} onSelect={handleSourceChainId1Selected} value={sourceChainId1} />
          </div>
        </div>
      )}
      {/** Target Chain */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-gray-900">Target Chain:</p>
        <div className="flex gap-2">
          <Dropdown options={SUPPORTED_CHAINS} onSelect={handleTargetChainSelected} value={targetChainId} />
        </div>
      </div>
      {type === CrosschainTransactionType.MULTI_SOURCE && (
        <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-md">
          <p className="text-xs font-bold text-gray-600">
            Transaction amount to target: <b>{formatUnits(TEST_TRANSFER_AMOUNT, 6)}&nbsp;W3P</b>
          </p>
        </div>
      )}

      {preparedTxDetails && (
        <TxDetails preparedTxDetails={preparedTxDetails} />
      )}

      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={onCancel} className="bg-blue-500 p-2 rounded-md text-sm w-full text-white font-bold">
          Cancel
        </button>
        {!preparedTxDetails ? (
          <button type="button" onClick={handlePrepareClick} className="bg-blue-500 p-2 rounded-md text-sm w-full text-white font-bold">
            Prepare Transaction
          </button>
        ) : (
          <button type="button" onClick={onExecute} className="bg-blue-500 p-2 rounded-md text-sm w-full text-white font-bold">
            Execute Transaction
          </button>
        )}
      </div>
    </div>
  );
}
