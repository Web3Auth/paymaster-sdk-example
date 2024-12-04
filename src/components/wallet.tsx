"use client";

import { MultiChainAccount, SignerType } from "@web3auth/paymaster-sdk";
import { useCallback, useEffect, useState } from "react";
import { Address, PrivateKeyAccount } from "viem";
import { SmartAccount } from "viem/account-abstraction";

import { SOURCE_CHAIN, TARGET_CHAIN } from "@/config";
import ExternalSponsor from "./external-sponsor";
import WebAuthnActions from "./webauthn";
import EcdsaActions from "./ecdsa";

interface WalletProps {
  account: SmartAccount | MultiChainAccount;
  type: SignerType;
}

export default function Wallet({ account: _account, type }: WalletProps) {
  const [accountAddress, setAccountAddress] = useState<Address>();
  const [eoaWallet, setEoaWallet] = useState<PrivateKeyAccount>();

  
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
        <EcdsaActions account={_account as SmartAccount}/>
      )}
    </div>
  );
}
