import { createWebAuthnKernelSmartAccountClient } from "@/account/smartAccount";
import { fundTestToken } from "@/account/utils";
import { WebAuthnCredentials } from "@/account/webauthnSigner";
import { SOURCE_CHAIN_RPC_URL, TARGET_CHAIN_RPC_URL, TARGET_CHAIN, WEB3PAY_TEST_TOKEN } from "@/config";
import { SOURCE_CHAIN } from "@/config";
import { createMintNftCallData } from "@/libs/utils";
import { getWeb3AuthValidatorAddress, PaymasterVersion, ValidatorType, Web3AuthPaymaster } from "@web3auth/paymaster-sdk";
import { createSmartAccountClient } from "permissionless";
import { useState } from "react";
import { http, Hex, PrivateKeyAccount, encodeFunctionData, erc20Abi, createWalletClient, parseUnits } from "viem";
import { SmartAccount } from "viem/account-abstraction";
import { waitForTransactionReceipt } from "viem/actions";

interface WebAuthnActionsProps {
  account: SmartAccount;
  webAuthnCredentials: WebAuthnCredentials;
  sponsor: PrivateKeyAccount;
}

export default function WebAuthnActions({ account, sponsor, webAuthnCredentials }: WebAuthnActionsProps) {
  const [funded, setFunded] = useState(false);

  async function fundAccountIfNeeded() {
    if (!funded) {
      console.log("Funding test token to account");
      await fundTestToken(account.address);
      console.log("Funded test token to account");
      setFunded(true);
    }
  }

  // send user operation without sponsor
  async function sendUserOperation() {
    await fundAccountIfNeeded();
    const accountClient = createSmartAccountClient({
      account,
      bundlerTransport: http(SOURCE_CHAIN_RPC_URL),
    });

    const paymaster = new Web3AuthPaymaster({
      apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
      chains: [{ chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL }],
    });

    const userOperation = await paymaster.core.prepareUserOperation({
      chainId: SOURCE_CHAIN.id,
      accountClient,
      userOperation: {
        callData: "0x",
      },
    });

    const hash = await accountClient.sendUserOperation({
      ...userOperation,
      account,
    })
    const { receipt } = await accountClient.waitForUserOperationReceipt({ hash })
    console.log("receipt", receipt);
  }

  // send user operation with sponsor
  async function sendUserOperationWithSponsor() {
    if (!sponsor) throw new Error("Sponsor is required");
    await fundAccountIfNeeded();
    const accountClient = createSmartAccountClient({
      account,
      bundlerTransport: http(SOURCE_CHAIN_RPC_URL),
    });
    const paymaster = new Web3AuthPaymaster({
      apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
      chains: [{ chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL }],
      sponsor: sponsor?.address,
    });
    const userOperation = await paymaster.core.prepareUserOperation({
      chainId: SOURCE_CHAIN.id,
      accountClient,
      userOperation: {
        callData: await account.encodeCalls([paymaster.core.createTokenApprovalCall()]),
      },
      signMessageWithSponsor: async (hash: Hex) => {
        return sponsor.signMessage({ message: { raw: hash } })
      },
    })

    const hash = await accountClient.sendUserOperation({
      ...userOperation,
      account,
    })
    const { receipt } = await accountClient.waitForUserOperationReceipt({ hash })
    console.log("receipt", receipt);
  }

  async function prepareMultichainAccounts() {
    const validatorAddress = getWeb3AuthValidatorAddress(
      TARGET_CHAIN.id,
      PaymasterVersion.V0_2_0,
      ValidatorType.WEB_AUTHN
    );
    const sourceAccountClient = createSmartAccountClient({
      account,
      bundlerTransport: http(SOURCE_CHAIN_RPC_URL),
    });
    const targetAccountClient = await createWebAuthnKernelSmartAccountClient(TARGET_CHAIN, TARGET_CHAIN_RPC_URL, webAuthnCredentials, validatorAddress);
    return { sourceAccountClient, targetAccountClient };
  }

  // send user operation with multichain sponsor
  async function sendUserOpWithCrosschainSponsor() {
    await fundAccountIfNeeded();
    const { sourceAccountClient, targetAccountClient } = await prepareMultichainAccounts();
    // initialize paymaster
    const paymaster = new Web3AuthPaymaster({
      apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
      chains: [
        { chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL },
        { chainId: TARGET_CHAIN.id, rpcUrl: TARGET_CHAIN_RPC_URL },
      ],
    });

    // prepare multichain user operation
    const { sourceUserOp, targetUserOp } = await paymaster.core.prepareMultiChainUserOperation({
      sourceAccountClient,
      targetAccountClient,
      userOperation: {
        callData: await createMintNftCallData(targetAccountClient.account, account.address),
      },
      sourceChainId: SOURCE_CHAIN.id,
      targetChainId: TARGET_CHAIN.id,
    })

    const sourceHash = await sourceAccountClient.sendUserOperation({ ...sourceUserOp, account: sourceAccountClient.account })
    console.log('Source user op hash:', sourceHash)

    const { receipt } = await sourceAccountClient.waitForUserOperationReceipt({ hash: sourceHash })
    console.log("receipt", receipt);

    // wait for 5 seconds before polling for target user op status
    await new Promise((resolve) => setTimeout(resolve, 5_000))

    const targetHash = paymaster.core.getTargetUserOperationHash(targetUserOp)
    console.log('targetUserOpHash', targetHash)
  }

  // send user operation with multichain external account sponsor
  async function sendUserOpWithExternalCrossChainSponsor() {
    await fundAccountIfNeeded();
    if (!sponsor) throw new Error("Sponsor is required");
    const { sourceAccountClient, targetAccountClient } = await prepareMultichainAccounts();
    // initialize paymaster
    const paymaster = new Web3AuthPaymaster({
      apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
      chains: [
        { chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL },
        { chainId: TARGET_CHAIN.id, rpcUrl: TARGET_CHAIN_RPC_URL },
      ],
      paymasterVersion: PaymasterVersion.V0_2_0,
      sponsor: sponsor.address,
    });
    // prepare multichain user operation with sponsor
    const { sourceUserOp, targetUserOp, estimatedGasFeesOnTargetChain } = await paymaster.core.prepareMultiChainUserOperation({
        sourceAccountClient,
        targetAccountClient,
        userOperation: {
          callData: await createMintNftCallData(targetAccountClient.account, account.address),
        },
        sourceChainId: SOURCE_CHAIN.id,
        targetChainId: TARGET_CHAIN.id,
        signMessageWithSponsor: async (message: Hex) => {
          return sponsor.signMessage({ message: { raw: message } })
        },
      })
    console.log("estimatedGasFeesOnTargetChain", estimatedGasFeesOnTargetChain);

    const sourceHash = await sourceAccountClient.sendUserOperation({ ...sourceUserOp, account: sourceAccountClient.account })
    console.log('Source user op hash:', sourceHash)

    const { receipt } = await sourceAccountClient.waitForUserOperationReceipt({ hash: sourceHash })
    console.log("receipt", receipt);

    // wait for 5 seconds before polling for target user op status
    await new Promise((resolve) => setTimeout(resolve, 5_000))

    const targetHash = paymaster.core.getTargetUserOperationHash(targetUserOp)
    console.log('targetUserOpHash', targetHash)
  }

  async function getTokenApproval(paymaster: Web3AuthPaymaster) {
    await fundAccountIfNeeded();
    const tokenApprovalCall = paymaster.core.createTokenApprovalCall({ chainId: SOURCE_CHAIN.id })
      const sponsorWalletClient = createWalletClient({
        account: sponsor,
      chain: SOURCE_CHAIN,
      transport: http(SOURCE_CHAIN_RPC_URL),
    })
    const approvalHash = await sponsorWalletClient.sendTransaction(tokenApprovalCall)
    const approvalReceipt = await waitForTransactionReceipt(sponsorWalletClient, { hash: approvalHash })
    console.log("approvalReceipt", approvalReceipt);
  }

  async function sendCrosschainLiquidityTransaction() {
    await fundAccountIfNeeded();
    const { sourceAccountClient, targetAccountClient } = await prepareMultichainAccounts();
    // initialize paymaster
    const paymaster = new Web3AuthPaymaster({
      apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
      chains: [
        { chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL },
        { chainId: TARGET_CHAIN.id, rpcUrl: TARGET_CHAIN_RPC_URL },
      ],
    });
    const transferAmount = parseUnits('10', 6)
    const targetCallData = await targetAccountClient.account.encodeCalls([
      {
        to: WEB3PAY_TEST_TOKEN,
        value: 0n,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [targetAccountClient.account.address, transferAmount],
        }),
      },
    ])

    const { sourceUserOp, targetUserOp } =
      await paymaster.core.prepareMultiChainUserOperation({
        sourceAccountClient,
        targetAccountClient,
        userOperation: {
          callData: targetCallData,
        },
        sourceChainId: SOURCE_CHAIN.id,
        targetChainId: TARGET_CHAIN.id,
        targetAmount: transferAmount,
        signMessageWithSponsor: async (message: Hex) => {
          return sponsor.signMessage({ message: { raw: message } })
        },
      })
    await getTokenApproval(paymaster);

    const sourceHash = await sourceAccountClient.sendUserOperation({ ...sourceUserOp, account: sourceAccountClient.account })
    console.log('Source user op hash:', sourceHash)

    const { receipt } = await sourceAccountClient.waitForUserOperationReceipt({ hash: sourceHash })
    console.log("receipt", receipt);

    // wait for 5 seconds before polling for target user op status
    await new Promise((resolve) => setTimeout(resolve, 5_000))

    const targetHash = paymaster.core.getTargetUserOperationHash(targetUserOp)
    console.log('targetUserOpHash', targetHash)
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <button className="bg-blue-400 p-2 rounded-md text-sm w-full" onClick={sendUserOperation}>Send User Operation</button>
      <button className="bg-blue-400 p-2 rounded-md text-sm w-full" onClick={sendUserOperationWithSponsor}>Send User Operation With Sponsor</button>
      <button className="bg-blue-400 p-2 rounded-md text-sm w-full" onClick={sendUserOpWithCrosschainSponsor}>Send User Operation with Crosschain Sponsor</button>
      <button className="bg-blue-400 p-2 rounded-md text-sm w-full" onClick={sendUserOpWithExternalCrossChainSponsor}>Send User Operation with External Crosschain Sponsor</button>
      <button className="bg-blue-400 p-2 rounded-md text-sm w-full" onClick={sendCrosschainLiquidityTransaction}>Send Cross chain User Operation</button>
    </div>
  );
}
