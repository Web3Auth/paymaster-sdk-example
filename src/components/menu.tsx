"use client";

import {
  MultiChainAccount,
  MultiChainKernelAccount,
  SignerType,
  WebAuthnSignerService,
} from "@web3auth/paymaster-sdk";
import { toEcdsaKernelSmartAccount } from "permissionless/accounts";
import { createPublicClient, http } from "viem";
import { SmartAccount } from "viem/account-abstraction";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { MULTI_CHAIN_RPC_INFO, SOURCE_CHAIN, SOURCE_CHAIN_RPC_URL, WEB3PAY_API_URL } from "@/config";

interface MenuProps {
  onAccountCreated: (account: SmartAccount | MultiChainAccount, type: SignerType) => void
}

export default function Menu({ onAccountCreated }: MenuProps) {
  async function createECDSAAccount() {
    const privKey = generatePrivateKey();
    const owner = privateKeyToAccount(privKey);
    const client = createPublicClient({
      chain: SOURCE_CHAIN,
      transport: http(SOURCE_CHAIN_RPC_URL),
    });
    const account: SmartAccount = await toEcdsaKernelSmartAccount({
      client,
      owners: [owner],
    });
    onAccountCreated(account, SignerType.ECDSA);
  }

  async function createWebAuthnAccount() {
    const webauthnSigner = await WebAuthnSignerService.initSigner({ type: "register", webAuthnServerUrl: WEB3PAY_API_URL });
    const multiChainAccount = new MultiChainKernelAccount(webauthnSigner, MULTI_CHAIN_RPC_INFO)
    onAccountCreated(multiChainAccount, SignerType.WEBAUTHN);
  }

  return (
    <div className="flex gap-2">
      <button
        className="bg-blue-400 p-2 rounded-md text-sm"
        onClick={createECDSAAccount}
      >
        Create ECDSA Account
      </button>
      <button
        className="bg-blue-400 p-2 rounded-md text-sm"
        onClick={createWebAuthnAccount}
      >
        Create WebAuthn Account
      </button>
    </div>
  );
}
