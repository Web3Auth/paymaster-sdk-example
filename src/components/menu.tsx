"use client";

import {
  MultiChainAccount,
  MultiChainKernelAccount,
} from "@web3auth/chain-abstraction-sdk";
import { SignerType, WebAuthnSignerService } from "@web3auth/erc7579";
import {
  MULTI_CHAIN_RPC_INFO,
  WEB3PAY_API_URL,
} from "@/config";
import { useState } from "react";

interface MenuProps {
  onAccountCreated: (
    account: MultiChainAccount,
    type: SignerType
  ) => void;
}

export default function Menu({ onAccountCreated }: MenuProps) {
  const [provider, setProvider] = useState<"kernel" | "nexus">("kernel");

  function handleProviderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const _provider = e.target.value as "kernel" | "nexus";
    setProvider(_provider);
  }

  async function createWebAuthnAccount() {
    const username = `01_${provider}_demo_${Date.now()}`;
    const webauthnSigner = await WebAuthnSignerService.initSigner({
      type: "register",
      webAuthnServerUrl: WEB3PAY_API_URL,
      username,
    });
    const multiKernelChainAccount = new MultiChainKernelAccount(
      webauthnSigner,
      MULTI_CHAIN_RPC_INFO
    );
    onAccountCreated(multiKernelChainAccount, SignerType.WEBAUTHN);
  }

  async function loginWebAuthnAccount() {
    const webauthnSigner = await WebAuthnSignerService.initSigner({
      type: "login",
      webAuthnServerUrl: WEB3PAY_API_URL,
    });
    const multiKernelChainAccount = new MultiChainKernelAccount(
      webauthnSigner,
      MULTI_CHAIN_RPC_INFO
    );
    onAccountCreated(multiKernelChainAccount, SignerType.WEBAUTHN);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-gray-500">Provider</span>
      <div className="flex">
        <div className="flex items-center me-4">
          <input
            onChange={handleProviderChange}
            id="inline-radio"
            type="radio"
            value="kernel"
            name="provider"
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            checked={provider === "kernel"}
          />
          <label
            htmlFor="inline-radio"
            className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
          >
            Kernel
          </label>
        </div>
        <div className="flex items-center me-4">
          <input
            onChange={handleProviderChange}
            id="inline-2-radio"
            type="radio"
            value="nexus"
            name="provider"
            disabled={true}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            checked={provider === "nexus"}
          />
          <label
            htmlFor="inline-2-radio"
            className="ms-2 text-sm font-medium text-gray-400 dark:text-gray-300"
          >
            Nexus
          </label>
        </div>
      </div>
      <button
        className="bg-blue-400 py-2 px-4 rounded-md text-sm text-white"
        onClick={createWebAuthnAccount}
      >
        Create New WebAuthn Account
      </button>
      <button
        className="bg-blue-400 py-2 px-4 rounded-md text-sm text-white"
        onClick={loginWebAuthnAccount}
      >
        Login to existing WebAuthn Account
      </button>
    </div>
  );
}
