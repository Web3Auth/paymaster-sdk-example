"use client";

import { useState } from "react";
import { SmartAccount } from "viem/account-abstraction";

import Menu from "@/components/menu";
import Wallet from "@/components/wallet";
import { MultiChainAccount, SignerType } from "@web3auth/paymaster-sdk";

export default function Home() {
  const [account, setAccount] = useState<SmartAccount | MultiChainAccount>();
  const [signerType, setSignerType] = useState<SignerType>(SignerType.ECDSA);

  async function handleAccountCreated(account: SmartAccount | MultiChainAccount, type: SignerType) {
    setAccount(account);
    setSignerType(type);
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="w-full absolute top-0 left-0 p-4 bg-gray-100 dark:bg-gray-800">
        <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
          Web3Auth Paymaster SDK Example
        </p>
      </div>
      {account ? (
        <Wallet
          account={account}
          type={signerType}
        />
      ) : (
        <Menu
          onAccountCreated={handleAccountCreated}
        />
      )}
    </div>
  );
}
