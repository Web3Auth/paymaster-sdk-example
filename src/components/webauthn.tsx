import { createWebAuthnKernelSmartAccountClient } from "@/account/smartAccount";
import { fundTestToken } from "@/account/utils";
import { WebAuthnCredentials } from "@/account/webauthnSigner";
import { SOURCE_CHAIN_RPC_URL, TARGET_CHAIN_RPC_URL, TARGET_CHAIN, WEB3PAY_TEST_TOKEN } from "@/config";
import { SOURCE_CHAIN } from "@/config";
import { createMintNftCallData, createTestTokenTransfer } from "@/libs/utils";
import { getWeb3AuthValidatorAddress, PaymasterVersion, ValidatorType, Web3AuthPaymaster } from "@web3auth/paymaster-sdk";
import { createSmartAccountClient } from "permissionless";
import { useState } from "react";
import { http, PrivateKeyAccount, encodeFunctionData, erc20Abi, createWalletClient, parseUnits } from "viem";
import { SmartAccount } from "viem/account-abstraction";
import { waitForTransactionReceipt } from "viem/actions";

interface WebAuthnActionsProps {
  account: SmartAccount;
  webAuthnCredentials: WebAuthnCredentials;
  sponsor: PrivateKeyAccount;
}

export default function WebAuthnActions({ account, sponsor, webAuthnCredentials }: WebAuthnActionsProps) {
  const [funded, setFunded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
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
    setLoading(true);
    setLoadingText("Funding account...");
    await fundAccountIfNeeded();
    const accountClient = createSmartAccountClient({
      account,
      bundlerTransport: http(SOURCE_CHAIN_RPC_URL),
    });

    const paymaster = new Web3AuthPaymaster({
      apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
      chains: [{ chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL }],
    });
    const paymasterAddress = paymaster.core.getPaymasterAddress()

    setLoadingText("Preparing user operation...");
    const userOperation = await paymaster.core.prepareUserOperation({
      chainId: SOURCE_CHAIN.id,
      accountClient,
      userOperation: {
        callData: await createTestTokenTransfer(account, paymasterAddress),
      },
    });
    setLoadingText("Sending user operation...");
    const hash = await accountClient.sendUserOperation({
      ...userOperation,
      account,
    })
    const { receipt } = await accountClient.waitForUserOperationReceipt({ hash })
    console.log("receipt", receipt);
    setLoading(false);
  }

  // send user operation with sponsor
  async function sendUserOperationWithSponsor() {
    if (!sponsor) throw new Error("Sponsor is required");
    setLoading(true);
    setLoadingText("Funding account...");
    await fundAccountIfNeeded();
    const accountClient = createSmartAccountClient({
      account,
      bundlerTransport: http(SOURCE_CHAIN_RPC_URL),
    });
    const paymaster = new Web3AuthPaymaster({
      apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
      chains: [{ chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL }],
      sponsor: sponsor,
    });
    const paymasterAddress = paymaster.core.getPaymasterAddress()

    setLoadingText("Preparing user operation...");
    const userOperation = await paymaster.core.prepareUserOperation({
      chainId: SOURCE_CHAIN.id,
      accountClient,
      userOperation: {
        callData: await createTestTokenTransfer(account, paymasterAddress),
      },
    })
    
    const hash = await accountClient.sendUserOperation({
      ...userOperation,
      account,
    })
    const { receipt } = await accountClient.waitForUserOperationReceipt({ hash })
    console.log("receipt", receipt);
    setLoading(false);
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
    setLoading(true);
    setLoadingText("Funding account...");
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
    setLoadingText("Preparing user operation...");
    const { sourceUserOp, targetUserOp } = await paymaster.core.prepareMultiChainUserOperation({
      // account
      // destinationChainId
      // sourceChainId
      // userOp
      // feeToken
      sourceAccountClient,
      targetAccountClient,
      userOperation: {
        callData: await createMintNftCallData(targetAccountClient.account, account.address),
      },
      sourceChainId: SOURCE_CHAIN.id,
      targetChainId: TARGET_CHAIN.id,
    })
    setLoadingText("Sending user operation...");
    const sourceHash = await sourceAccountClient.sendUserOperation({ ...sourceUserOp, account: sourceAccountClient.account })
    console.log('Source user op hash:', sourceHash)

    const { receipt } = await sourceAccountClient.waitForUserOperationReceipt({ hash: sourceHash })
    console.log("receipt", receipt);

    // wait for 5 seconds before polling for target user op status
    await new Promise((resolve) => setTimeout(resolve, 5_000))

    const targetHash = paymaster.core.getTargetUserOperationHash(targetUserOp)
    console.log('targetUserOpHash', targetHash)
    setLoading(false);
  }

  // send user operation with multichain external account sponsor
  async function sendUserOpWithExternalCrossChainSponsor() {
    setLoading(true);
    setLoadingText("Funding account...");
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
      sponsor,
    });
    // prepare multichain user operation with sponsor
    setLoadingText("Preparing user operation...");
    const { sourceUserOp, targetUserOp, estimatedGasFeesOnTargetChain } = await paymaster.core.prepareMultiChainUserOperation({
        sourceAccountClient,
        targetAccountClient,
        userOperation: {
          callData: await createMintNftCallData(targetAccountClient.account, account.address),
        },
        sourceChainId: SOURCE_CHAIN.id,
        targetChainId: TARGET_CHAIN.id,
      })
    console.log("estimatedGasFeesOnTargetChain", estimatedGasFeesOnTargetChain);
    setLoadingText("Sending user operation...");

    await getTokenApproval(paymaster);

    const sourceHash = await sourceAccountClient.sendUserOperation({ ...sourceUserOp, account: sourceAccountClient.account })
    console.log('Source user op hash:', sourceHash)

    const { receipt } = await sourceAccountClient.waitForUserOperationReceipt({ hash: sourceHash })
    console.log("receipt", receipt);

    // wait for 5 seconds before polling for target user op status
    await new Promise((resolve) => setTimeout(resolve, 5_000))

    const targetHash = paymaster.core.getTargetUserOperationHash(targetUserOp)
    console.log('targetUserOpHash', targetHash)
    setLoading(false);
  }

  async function sendCrosschainLiquidityTransaction() {
    setLoading(true);
    setLoadingText("Funding account...");
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
    setLoadingText("Preparing user operation...");
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
      })

    setLoadingText("Sending user operation...");
    const sourceHash = await sourceAccountClient.sendUserOperation({ ...sourceUserOp, account: sourceAccountClient.account })
    console.log('Source user op hash:', sourceHash)

    const { receipt } = await sourceAccountClient.waitForUserOperationReceipt({ hash: sourceHash })
    console.log("receipt", receipt);

    // wait for 5 seconds before polling for target user op status
    await new Promise((resolve) => setTimeout(resolve, 5_000))

    const targetHash = paymaster.core.getTargetUserOperationHash(targetUserOp)
    console.log('targetUserOpHash', targetHash)
    setLoading(false);
  }

  async function getTokenApproval(paymaster: Web3AuthPaymaster) {
    if (!sponsor) throw new Error("Sponsor is required");

    await fundAccountIfNeeded();
    const tokenApprovalCall = await paymaster.core.createTokenApprovalCallIfRequired({ chainId: SOURCE_CHAIN.id, accountAddress: sponsor.address })
    if (!tokenApprovalCall) return;
    const sponsorWalletClient = createWalletClient({
      account: sponsor,
      chain: SOURCE_CHAIN,
      transport: http(SOURCE_CHAIN_RPC_URL),
    })
    const approvalHash = await sponsorWalletClient.sendTransaction(tokenApprovalCall)
    const approvalReceipt = await waitForTransactionReceipt(sponsorWalletClient, { hash: approvalHash })
    console.log("approvalReceipt", approvalReceipt);
  }

  return (
    <div className="flex relative flex-col gap-2 w-full">
      <button className="bg-blue-400 p-2 rounded-md text-sm w-full" onClick={sendUserOperation}>Send User Operation</button>
      <button className="bg-blue-400 p-2 rounded-md text-sm w-full" onClick={sendUserOperationWithSponsor}>Send User Operation With Sponsor</button>
      <button className="bg-blue-400 p-2 rounded-md text-sm w-full" onClick={sendUserOpWithCrosschainSponsor}>Send User Operation with Crosschain Sponsor</button>
      <button className="bg-blue-400 p-2 rounded-md text-sm w-full" onClick={sendUserOpWithExternalCrossChainSponsor}>Send User Operation with External Crosschain Sponsor</button>
      <button className="bg-blue-400 p-2 rounded-md text-sm w-full" onClick={sendCrosschainLiquidityTransaction}>Send Cross chain User Operation</button>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 text-sm text-gray-800">
          {loadingText}
        </div>
      )}
    </div>
  );
}
