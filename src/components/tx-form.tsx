"use client";

import { TARGET_CHAIN, SOURCE_CHAIN_1, SOURCE_CHAIN_2, TEST_TRANSFER_AMOUNT } from "@/config";
import { CrosschainTransactionType } from "@/types";
import { useState } from "react";
import { formatUnits, Hex, parseUnits, toHex } from "viem";

interface ITxFormProps {
  type: CrosschainTransactionType;
  onCancel: () => void;
  onExecute: (multiSrcProps?: {
    sourceAmount1: Hex;
    sourceAmount2: Hex;
  }) => void;
}

export default function TxForm({ type, onCancel, onExecute }: ITxFormProps) {
  const [sourceAmount1, setSourceAmount1] = useState(0);
  const [sourceAmount2, setSourceAmount2] = useState(0);

  function getTextForTxType() {
    switch (type) {
      case CrosschainTransactionType.CROSSCHAIN_SPONSORSHIP:
        return "Crosschain Sponsorship";
      case CrosschainTransactionType.TRANSFER_LIQUIDITY:
        return "Transfer Liquidity";
      case CrosschainTransactionType.MULTI_SOURCE:
        return "Multi-Source Liquidity Transfer";
      default:
        return "Unknown Transaction Type";
    }
  }

  function getDescriptionForTxType() {
    switch (type) {
      case CrosschainTransactionType.CROSSCHAIN_SPONSORSHIP:
        return "Sponsor a crosschain transaction";
      case CrosschainTransactionType.TRANSFER_LIQUIDITY:
        return "Transfer liquidity to a different chain";
      case CrosschainTransactionType.MULTI_SOURCE:
        return "Transfer liquidity from multiple source chains to a target chain";
      default:
        return "Unknown Transaction Type";
    }
  }

  function handleExecute() {
    if (type === CrosschainTransactionType.MULTI_SOURCE) {
      onExecute({
        sourceAmount1: toHex(parseUnits(sourceAmount1.toString(), 6)),
        sourceAmount2: toHex(parseUnits(sourceAmount2.toString(), 6)),
      });
    } else {
      onExecute();
    }
  }

  return (
    <div className="flex flex-col gap-2 min-w-xl">
      <p className="text-sm font-bold">{getTextForTxType()}</p>
      <p className="text-xs text-gray-500">{getDescriptionForTxType()}</p>
      {
        type === CrosschainTransactionType.MULTI_SOURCE && (
          <div className="flex flex-col gap-2 bg-gray-200 p-2 rounded-md">
            <p className="text-sm font-bold text-gray-500">Target Chain:</p>
            <div className="flex flex-row gap-2 items-center mb-4">
              <p className="text-xs font-bold text-gray-600">
                {TARGET_CHAIN.name}
              </p>
              <p className="text-sm font-bold text-gray-600">
                {formatUnits(TEST_TRANSFER_AMOUNT, 6)}&nbsp;W3P
              </p>
            </div>
            <p className="text-sm font-bold text-gray-500">Source Chains:</p>
            <div className="flex gap-2">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-gray-600">
                  {SOURCE_CHAIN_1.name}
                </p>
                <input
                  type="number"
                  value={sourceAmount1}
                  onChange={(e) => setSourceAmount1(Number(e.target.value))}
                  className="p-2 text-sm border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-gray-600">
                  {SOURCE_CHAIN_2.name}
                </p>
                <input
                  type="number"
                  value={sourceAmount2}
                  onChange={(e) => setSourceAmount2(Number(e.target.value))}
                  className="p-2 text-sm border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
            </div>
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
