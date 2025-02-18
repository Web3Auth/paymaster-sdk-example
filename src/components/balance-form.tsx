"use client";

import { CHAIN_1, CHAIN_1_RPC_URL, CHAIN_2, CHAIN_2_RPC_URL, CHAIN_3, CHAIN_3_RPC_URL } from "@/config";
import { queryErc20TokenBalance } from "@/utils/token";
import { useEffect, useState } from "react";
import { Address } from "viem";

interface IBalanceFormProps {
  account: Address;
  onClose: () => void;
}

export default function BalanceForm({ account, onClose }: IBalanceFormProps) {
  const [loading, setLoading] = useState(true);
  const [sourceBalance1, setSourceBalance1] = useState<bigint>(0n);
  const [sourceBalance2, setSourceBalance2] = useState<bigint>(0n);
  const [targetBalance, setTargetBalance] = useState<bigint>(0n);

  useEffect(() => {
    (async () => {
      try {
        const [sourceBalance1, sourceBalance2, targetBalance] = await Promise.all([
          queryErc20TokenBalance(account, CHAIN_1, CHAIN_1_RPC_URL),
          queryErc20TokenBalance(account, CHAIN_2, CHAIN_2_RPC_URL),
          queryErc20TokenBalance(account, CHAIN_3, CHAIN_3_RPC_URL),
        ])
  
        setSourceBalance1(sourceBalance1);
        setSourceBalance2(sourceBalance2);
        setTargetBalance(targetBalance);
      } catch (error) {
        console.error("error fetching balances", error);
      } finally {
        setLoading(false);
      }
    })()
  }, [account]);

  return (
    <div className="flex flex-col gap-2 min-w-80">
      {
        loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold">Test Token Balances</p>
              <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
                Account: <b className="text-sm">{account}</b>
              </p>
              <p className="text-xs font-bold">{CHAIN_1.name}</p>
              <div className="flex items-center gap-2 w-full bg-gray-100 p-2 rounded-md">
                <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
                  W3P Balance: <b className="text-sm">{sourceBalance1}</b>
                </p>
              </div>
              <p className="text-xs font-bold">{CHAIN_2.name}</p>
              <div className="flex items-center gap-2 w-full bg-gray-100 p-2 rounded-md">
                <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
                  W3P Balance: <b className="text-sm">{sourceBalance2}</b>
                </p>
              </div>
              <p className="text-xs font-bold">{CHAIN_3.name}</p>
              <div className="flex items-center gap-2 w-full bg-gray-100 p-2 rounded-md">
                <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
                  W3P Balance: <b className="text-sm">{targetBalance}</b>
                </p>
              </div>
            </div>
            <button
              className="bg-blue-500 p-2 rounded-md text-sm w-full text-white font-bold"
              onClick={onClose}
            >
              Close
            </button>
          </>
        )
      }
    </div>
  )
}
