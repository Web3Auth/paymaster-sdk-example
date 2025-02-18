"use client";

import { useState } from "react";

import Menu from "@/components/menu";
import Main from "@/components/main";
import { MultiChainAccount } from "@web3auth/chain-abstraction-sdk";
import { SignerType } from "@web3auth/erc7579";

export default function Home() {
  const [account, setAccount] = useState<MultiChainAccount>();
  const [signerType, setSignerType] = useState<SignerType>(SignerType.ECDSA);

  async function handleAccountCreated(
    account: MultiChainAccount,
    type: SignerType
  ) {
    setAccount(account);
    setSignerType(type);
    const address = await account.getAddress();
    console.log(address);
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="w-full absolute top-0 left-0 p-4 bg-gray-100 dark:bg-gray-800">
        <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
          Web3Auth Paymaster SDK Example
        </p>
      </div>
      {account ? (
        <Main account={account} type={signerType} />
      ) : (
        <Menu onAccountCreated={handleAccountCreated} />
      )}
    </div>
  );
}
