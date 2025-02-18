import { CHAIN_1, CHAIN_2, CHAIN_3, WEB3PAY_TEST_TOKEN } from "@/config";
import { fundTestToken } from "@web3auth/chain-abstraction-sdk";
import Dropdown from "./dropdown";
import { useState } from "react";
import { getChainConfigById } from "@/utils";
import { Address, createPublicClient, http, PublicClient } from "viem";

export default function FundToken({ onCancel, accountAddress }: { onCancel: () => void, accountAddress: Address }) {
  const [chainId, setChainId] = useState<number>();
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string, type: "success" | "error" } | undefined>();

  async function handleFunding() {
    if (!chainId) return;
    setLoading(true);

    try {
      const { chain, rpcUrl } = getChainConfigById(chainId);
      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
      });
      await fundTestToken(publicClient as PublicClient, accountAddress);
      setMessage({ text: "Funding successful", type: "success" });
    } catch (error) {
      console.error(error);
      setMessage({ text: "Funding failed", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 w-xl min-w-xl p-4">
      <p className="font-bold">Fund Test Token (W3PTEST)</p>
      <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-md">
        <p className="text-xs text-gray-900">Token Address</p>
        <p className="text-xs font-bold text-gray-700 dark:text-gray-100">{WEB3PAY_TEST_TOKEN}</p>
      </div>
      {
        loading ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-gray-900">Funding...</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
            <p className="text-sm font-bold text-gray-900">Select Chain:</p>
            <div className="flex gap-2">
              <Dropdown options={[CHAIN_1, CHAIN_2, CHAIN_3]} onSelect={setChainId} />
            </div>
          </div>
          {message && (
            <div className={`p-2 rounded-md text-sm w-full ${message.type === "success" ? "bg-green-100" : "bg-red-100"}`}>
              {message.text}
            </div>
          )}
          <div className="flex gap-2">
            <button
              className="bg-blue-500 p-2 rounded-md text-sm w-full text-white font-bold"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="bg-blue-500 p-2 rounded-md text-sm w-full text-white font-bold"
              onClick={handleFunding}
            >
              Fund
            </button>
          </div>
          </>
        )
      }
    </div>
  )
}
