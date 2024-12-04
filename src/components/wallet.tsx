"use client";

import { getSupportedFeeTokens, MultiChainAccount, SignerType, Web3AuthPaymaster } from "@web3auth/paymaster-sdk";
import { createSmartAccountClient } from "permissionless/clients";
import { useCallback, useEffect, useState } from "react";
import { Address, Hex, http, PrivateKeyAccount } from "viem";
import { SmartAccount } from "viem/account-abstraction";

import { SOURCE_CHAIN, SOURCE_CHAIN_RPC_URL, TARGET_CHAIN } from "@/config";
import ExternalSponsor from "./external-sponsor";
import WebAuthnActions from "./webauthn";
import { createTestTokenTransfer } from "@/libs/utils";

interface WalletProps {
  account: SmartAccount | MultiChainAccount;
  type: SignerType;
}

export default function Wallet({ account: _account, type }: WalletProps) {
  const [accountAddress, setAccountAddress] = useState<Address>();
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading...");
  const [eoaWallet, setEoaWallet] = useState<PrivateKeyAccount>();
  const [targetOpHash, setTargetOpHash] = useState<Hex>();

  // single chain userOp
  async function sendUserOperation() {
    try {
      setLoading(true);
      
      const account = _account as SmartAccount;

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

  const onEoaWalletFunded = useCallback((account: PrivateKeyAccount) => {
    setEoaWallet(account);
  }, []);

  useEffect(() => {
    (async () => {
      console.log("type", type);
      let address: Address;
      if (type === SignerType.ECDSA) {
        address = (_account as SmartAccount).address;
      } else {
        address = await (_account as MultiChainAccount).getAddress();
      }
      setAccountAddress(address);
    })()
  }, [_account, type]);

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
          Smart Account: <b className="text-sm">{accountAddress}</b>
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
      {type === "webauthn" && eoaWallet ? (
        <WebAuthnActions multiChainAccount={_account as MultiChainAccount} sponsor={eoaWallet}/>
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
