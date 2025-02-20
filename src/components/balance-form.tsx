"use client";

import { CHAIN_1, CHAIN_1_RPC_URL, CHAIN_2, CHAIN_2_RPC_URL, CHAIN_3, CHAIN_3_RPC_URL, CHAIN_4, CHAIN_4_RPC_URL, CHAIN_5, CHAIN_5_RPC_URL } from "@/config";
import { parseW3PTestTokenValue, queryErc20TokenBalance } from "@/utils/token";
import { useEffect, useState } from "react";
import { Address } from "viem";

interface IBalanceFormProps {
  account: Address;
  onClose: () => void;
}

export default function BalanceForm({ account, onClose }: IBalanceFormProps) {
  const [loading, setLoading] = useState(true);
  const [balance1, setBalance1] = useState<string>("0");
  const [balance2, setBalance2] = useState<string>("0");
  const [balance3, setBalance3] = useState<string>("0");
  const [balance4, setBalance4] = useState<string>("0");
  const [balance5, setBalance5] = useState<string>("0");

  useEffect(() => {
    (async () => {
      try {
        const [balance1, balance2, balance3, balance4, balance5] = await Promise.all([
          queryErc20TokenBalance(account, CHAIN_1, CHAIN_1_RPC_URL),
          queryErc20TokenBalance(account, CHAIN_2, CHAIN_2_RPC_URL),
          queryErc20TokenBalance(account, CHAIN_3, CHAIN_3_RPC_URL),
          queryErc20TokenBalance(account, CHAIN_4, CHAIN_4_RPC_URL),
          queryErc20TokenBalance(account, CHAIN_5, CHAIN_5_RPC_URL),
        ])
  
        setBalance1(parseW3PTestTokenValue(balance1));
        setBalance2(parseW3PTestTokenValue(balance2));
        setBalance3(parseW3PTestTokenValue(balance3));
        setBalance4(parseW3PTestTokenValue(balance4));
        setBalance5(parseW3PTestTokenValue(balance5));
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
                  W3P Balance: <b className="text-sm">{balance1}</b>
                </p>
              </div>
              <p className="text-xs font-bold">{CHAIN_2.name}</p>
              <div className="flex items-center gap-2 w-full bg-gray-100 p-2 rounded-md">
                <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
                  W3P Balance: <b className="text-sm">{balance2}</b>
                </p>
              </div>
              <p className="text-xs font-bold">{CHAIN_3.name}</p>
              <div className="flex items-center gap-2 w-full bg-gray-100 p-2 rounded-md">
                <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
                  W3P Balance: <b className="text-sm">{balance3}</b>
                </p>
              </div>
              <p className="text-xs font-bold">{CHAIN_4.name}</p>
              <div className="flex items-center gap-2 w-full bg-gray-100 p-2 rounded-md">
                <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
                  W3P Balance: <b className="text-sm">{balance4}</b>
                </p>
              </div>
              <p className="text-xs font-bold">{CHAIN_5.name}</p>
              <div className="flex items-center gap-2 w-full bg-gray-100 p-2 rounded-md">
                <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
                  W3P Balance: <b className="text-sm">{balance5}</b>
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
