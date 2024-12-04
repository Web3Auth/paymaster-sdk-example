import { SOURCE_CHAIN } from "@/config";
import { SOURCE_CHAIN_RPC_URL } from "@/config";
import { getSupportedFeeTokens, Web3AuthPaymaster } from "@web3auth/paymaster-sdk";
import { useState } from "react";
import { Hex, http } from "viem";
import { SmartAccount } from "viem/account-abstraction";
import { createTestTokenTransfer } from "@/libs/utils";
import { createSmartAccountClient } from "permissionless";

interface EcdsaActionsProps {
  account: SmartAccount;
}

export default function EcdsaActions({ account }: EcdsaActionsProps) {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading...");
  const [targetOpHash, setTargetOpHash] = useState<Hex>();
  
  // single chain userOp with ECDSA account
  async function sendUserOperation() {
    try {
      setLoading(true);

      const paymaster = new Web3AuthPaymaster({
        apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
        chains: [{ chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL }],
        web3AuthClientId: "test-client-id",
      });

      setLoadingText("Preparing user operation ...");

      const feeToken = getSupportedFeeTokens(SOURCE_CHAIN.id)[0];

      // approve paymaster for erc20 token gas
      const tokenApprovalCall = await paymaster.core.createTokenApprovalCallIfRequired({ tokenAddress: feeToken, accountAddress: account.address })
      const calls = [createTestTokenTransfer()];
      if (tokenApprovalCall) {
        calls.unshift(tokenApprovalCall);
      }

      const userOperation = await paymaster.core.prepareUserOperation({
        account,
        chainId: SOURCE_CHAIN.id,
        calls,
        feeToken,
      })
  
      setLoadingText("Sending user operation ...");
      const accountClient = createSmartAccountClient({
        account,
        chain: SOURCE_CHAIN,
        bundlerTransport: http(SOURCE_CHAIN_RPC_URL),
      })
      const hash = await accountClient.sendUserOperation({
        ...userOperation,
        account,
      })
      setTargetOpHash(hash);
      const { receipt } = await accountClient.waitForUserOperationReceipt({ hash })
      console.log("receipt", receipt);
    } catch (error) {
      console.error("error", (error as Error).stack);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex relative flex-col gap-2 w-full">
      <button className="bg-blue-400 p-2 rounded-md text-sm w-full" onClick={sendUserOperation}>Send User Operation (with ERC20 Token gas)</button>
      {targetOpHash && (
        <p className="text-xs bg-green-300 p-2 rounded-md my-4 text-gray-800">
          Target userOp hash: {targetOpHash}
        </p>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 text-sm text-gray-800">
          {loadingText}
        </div>
      )}
    </div>
  )
}
