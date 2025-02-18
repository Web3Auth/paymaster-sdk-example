"use client";

import { CHAIN_3, CHAIN_1, CHAIN_2, TEST_TRANSFER_AMOUNT } from "@/config";
import { CrosschainTransactionType } from "@/types";
import { useState } from "react";
import { formatUnits, Hex, parseUnits, toHex } from "viem";
import Dropdown from "./dropdown";
import MultiSourceTx from "./multi-sourc-tx";

interface ITxFormProps {
  type: CrosschainTransactionType;
  onCancel: () => void;
  onExecute: (
    sourceChainIds: number[],
    targetChainId: number,
    sourceFunds?: Hex[]
  ) => void;
}

export default function TxForm({ type, onCancel, onExecute }: ITxFormProps) {
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
        (Mint amount: 10 W3PTEST)
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

  function handleExecute() {
    let sourceFunds: Hex[] | undefined;
    if (type === CrosschainTransactionType.MULTI_SOURCE) {
      sourceFunds = [
        toHex(parseUnits(sourceAmount1.toString(), 6)),
        toHex(parseUnits(sourceAmount2.toString(), 6)),
      ];
    }
    if (!targetChainId) {
      return;
    }

    const sourceChainIds = [sourceChainId1, sourceChainId2].filter((chainId) => chainId !== undefined) as number[];
    onExecute(sourceChainIds, targetChainId, sourceFunds);
  }

  return (
    <div className="flex flex-col gap-2 w-xl min-w-xl p-4">
      <p className="font-bold">{getTextForTxType()}</p>
      <div className="flex flex-col bg-gray-100 rounded-md p-2">
        <p className="text-xs text-gray-500 whitespace-pre text-center ml-[-15px]">{getDescriptionForTxType()}</p>
      </div>
      {/** Source Chain */}
      {
        type === CrosschainTransactionType.MULTI_SOURCE ? (
          <MultiSourceTx
            handleSourceChain1Selected={handleSourceChainId1Selected}
            handleSourceChain2Selected={handleSourceChainId2Selected}
            sourceAmount1={sourceAmount1}
            sourceAmount1OnChange={setSourceAmount1}
            sourceAmount2={sourceAmount2}
            sourceAmount2OnChange={setSourceAmount2}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-gray-900">Source Chain:</p>
            <div className="flex gap-2">
              <Dropdown options={[CHAIN_1, CHAIN_2, CHAIN_3]} onSelect={handleSourceChainId1Selected} />
            </div>
          </div>
        )
      }
      {/** Target Chain */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-gray-900">Target Chain:</p>
        <div className="flex gap-2">
          <Dropdown options={[CHAIN_1, CHAIN_2, CHAIN_3]} onSelect={handleTargetChainSelected} />
        </div>
      </div>
      {
        type === CrosschainTransactionType.MULTI_SOURCE && (
          <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-md">
            <p className="text-xs font-bold text-gray-600">
              Transaction amount to target: <b>{formatUnits(TEST_TRANSFER_AMOUNT, 6)}&nbsp;W3P</b>
            </p>
          </div>
        )
      }
      <div className="flex gap-2">
        <button
          className="bg-blue-500 p-2 rounded-md text-sm w-full text-white font-bold"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="bg-blue-500 p-2 rounded-md text-sm w-full text-white font-bold"
          onClick={handleExecute}
        >
          Execute
        </button>
      </div>
    </div>
  );
}
