"use client";

import { Web3AuthPaymaster } from "@web3auth/paymaster-sdk";
import { createSmartAccountClient } from "permissionless/clients";
import { useCallback, useState } from "react";
import { Hex, http, PrivateKeyAccount } from "viem";
import { SmartAccount } from "viem/account-abstraction";

import { fundTestToken } from "@/account/utils";
import { WebAuthnCredentials } from "@/account/webauthnSigner";
import { SOURCE_CHAIN, SOURCE_CHAIN_RPC_URL, TARGET_CHAIN } from "@/config";
import ExternalSponsor from "./external-sponsor";
import WebAuthnActions from "./webauthn";
import { createTestTokenTransfer } from "@/libs/utils";

interface WalletProps {
  account: SmartAccount;
  type: "ecdsa" | "webauthn";
  webAuthnCredentials?: WebAuthnCredentials;
}

export default function Wallet({ account, type, webAuthnCredentials }: WalletProps) {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading...");
  const [eoaWallet, setEoaWallet] = useState<PrivateKeyAccount>();
  const [funded, setFunded] = useState(false);
  const [targetOpHash, setTargetOpHash] = useState<Hex>();

  async function sendUserOperation() {
    try {
      setLoading(true);
      await fundAccountIfNeeded();

      const paymaster = new Web3AuthPaymaster({
        apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
        chains: [{ chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL }],
      });
      const paymasterAddress = paymaster.core.getPaymasterAddress()

      const accountClient = createSmartAccountClient({
        account,
        bundlerTransport: http(SOURCE_CHAIN_RPC_URL),
      });
      setLoadingText("Preparing user operation ...");
      const userOperation = await paymaster.core.prepareUserOperation({
        chainId: SOURCE_CHAIN.id,
        accountClient,
        userOperation: {
          callData: await createTestTokenTransfer(account, paymasterAddress),
        },
      });
  
      setLoadingText("Sending user operation ...");
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

  async function fundAccountIfNeeded() {
    if (!funded) {
      setLoadingText("Funding test token to account ...");
      console.log("Funding test token to account");
      await fundTestToken(account.address);
      console.log("Funded test token to account");
      setFunded(true);
    }
  }

  const onEoaWalletFunded = useCallback((account: PrivateKeyAccount) => {
    setEoaWallet(account);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center gap-3 border border-gray-300 rounded-md p-6">
      <h1>Wallet</h1>
      <div className="flex items-center gap-2 w-full mb-4">
        <p className="text-xs bg-blue-100 p-1 rounded-md text-gray-800">
          <b>Source Chain:</b> {SOURCE_CHAIN.name}
        </p>
        <p className="text-xs bg-violet-100 p-1 rounded-md text-gray-800">
          <b>Target Chain:</b> {TARGET_CHAIN.name}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 w-full">
        <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
          Smart Account: <b className="text-sm">{account.address}</b>
        </p>
        <p className="text-sm bg-red-100 p-2 rounded-md text-gray-800">
          {type}
        </p>
      </div>
      {type === "webauthn" && (
        <ExternalSponsor
        onEoaWalletFunded={onEoaWalletFunded}
          eoaWallet={eoaWallet}
        />
      )}
      {type === "webauthn" && webAuthnCredentials && eoaWallet ? (
        <WebAuthnActions account={account} webAuthnCredentials={webAuthnCredentials} sponsor={eoaWallet}/>
      ) : (
        <button
          className="bg-blue-400 mt-8 p-2 rounded-md text-sm w-full"
          onClick={sendUserOperation}
          disabled={loading}
        >
          Send User Operation (with ERC20 Token gas)
        </button>
      )}
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
  );
}
