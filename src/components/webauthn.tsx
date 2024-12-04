import { SOURCE_CHAIN_RPC_URL, TARGET_CHAIN_RPC_URL, TARGET_CHAIN, MULTI_CHAIN_PAYMASTER_SETTINGS } from "@/config";
import { SOURCE_CHAIN } from "@/config";
import { createBundlerClient, createMintNftCallData, createTestTokenTransfer } from "@/libs/utils";
import { MultiChainAccount, Web3AuthPaymaster, getSupportedFeeTokens } from "@web3auth/paymaster-sdk";
import { createSmartAccountClient } from "permissionless";
import { useState } from "react";
import { http, PrivateKeyAccount, createWalletClient, parseUnits } from "viem";
import { waitForTransactionReceipt } from "viem/actions";

interface WebAuthnActionsProps {
  multiChainAccount: MultiChainAccount;
  sponsor: PrivateKeyAccount;
}

export default function WebAuthnActions({ multiChainAccount, sponsor }: WebAuthnActionsProps) {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  // send user operation without sponsor
  async function sendUserOperation() {
    setLoading(true);
    setLoadingText("Funding account...");

    const paymaster = new Web3AuthPaymaster({
      apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
      chains: [{ chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL }],
    });
    const account = await multiChainAccount.getAccount(SOURCE_CHAIN.id);

    setLoadingText("Preparing user operation...");
    const userOperation = await paymaster.core.prepareUserOperation({
      chainId: SOURCE_CHAIN.id,
      account,
      calls: [createTestTokenTransfer()],
      feeToken: getSupportedFeeTokens(SOURCE_CHAIN.id)[0],
    });

    setLoadingText("Sending user operation...");
    const accountClient = createSmartAccountClient({
      account,
      chain: SOURCE_CHAIN,
      bundlerTransport: http(SOURCE_CHAIN_RPC_URL),
    });
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

    // get smart account for source chain
    const account = await multiChainAccount.getAccount(SOURCE_CHAIN.id);
    const accountClient = createSmartAccountClient({
      account,
      chain: SOURCE_CHAIN,
      bundlerTransport: http(SOURCE_CHAIN_RPC_URL),
    });
    const paymaster = new Web3AuthPaymaster({
      apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
      chains: [{ chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL }],
      sponsor: sponsor,
    });

    setLoadingText("Preparing user operation...");
    const userOperation = await paymaster.core.prepareUserOperation({
      chainId: SOURCE_CHAIN.id,
      account,
      calls: [createTestTokenTransfer()],
      feeToken: getSupportedFeeTokens(SOURCE_CHAIN.id)[0],
    })
    
    const hash = await accountClient.sendUserOperation({
      ...userOperation,
      account,
    })
    const { receipt } = await accountClient.waitForUserOperationReceipt({ hash })
    console.log("receipt", receipt);
    setLoading(false);
  }

  // send user operation with multichain sponsor
  async function sendUserOpWithCrosschainSponsor() {
    setLoading(true);
    setLoadingText("Funding account...");
    // initialize paymaster
    const paymaster = new Web3AuthPaymaster(MULTI_CHAIN_PAYMASTER_SETTINGS);

    // get smart account address
    const accountAddress = await multiChainAccount.getAddress();
    // prepare multichain user operation
    setLoadingText("Preparing user operation...");
    const prepareMultiChainUserOperationResult = await paymaster.core.prepareMultiChainUserOperation({
      account: multiChainAccount,
      calls: [createMintNftCallData(accountAddress)],
      sourceChainId: SOURCE_CHAIN.id,
      targetChainId: TARGET_CHAIN.id,
      feeToken: getSupportedFeeTokens(TARGET_CHAIN.id)[0],
    })
    setLoadingText("Sending user operation...");

    const { sourceUserOperationHash, targetUserOperationHash } = await multiChainAccount.sendMultiChainUserOperation(prepareMultiChainUserOperationResult)

    const sourceBundlerClient = createBundlerClient(SOURCE_CHAIN, SOURCE_CHAIN_RPC_URL);
    const { receipt } = await sourceBundlerClient.waitForUserOperationReceipt({ hash: sourceUserOperationHash })
    console.log("receipt", receipt);

    // wait for 5 seconds before polling for target user op status
    await new Promise((resolve) => setTimeout(resolve, 5_000))

    console.log('targetUserOperationHash', targetUserOperationHash)
    setLoading(false);
  }

  // send user operation with multichain external account sponsor
  async function sendUserOpWithExternalCrossChainSponsor() {
    setLoading(true);
    setLoadingText("Funding account...");
    if (!sponsor) throw new Error("Sponsor is required");

    // initialize paymaster with sponsor
    const paymaster = new Web3AuthPaymaster({ ...MULTI_CHAIN_PAYMASTER_SETTINGS, sponsor });
    // prepare multichain user operation with sponsor
    setLoadingText("Preparing user operation...");

    // get smart account address
    const accountAddress = await multiChainAccount.getAddress();

    const { estimatedGasFeesOnTargetChain, ...prepareMultiChainUserOperationResult } = await paymaster.core.prepareMultiChainUserOperation({
      account: multiChainAccount,
      calls: [createMintNftCallData(accountAddress)],
      sourceChainId: SOURCE_CHAIN.id,
      targetChainId: TARGET_CHAIN.id,
      feeToken: getSupportedFeeTokens(TARGET_CHAIN.id)[0],
    })
    console.log("estimatedGasFeesOnTargetChain", estimatedGasFeesOnTargetChain);
    setLoadingText("Sending user operation...");

    await getTokenApproval(paymaster);

    const { sourceUserOperationHash, targetUserOperationHash } = await multiChainAccount.sendMultiChainUserOperation(prepareMultiChainUserOperationResult)

    const sourceBundlerClient = createBundlerClient(SOURCE_CHAIN, SOURCE_CHAIN_RPC_URL);
    const { receipt } = await sourceBundlerClient.waitForUserOperationReceipt({ hash: sourceUserOperationHash })
    console.log("receipt", receipt);

    // wait for 5 seconds before polling for target user op status
    await new Promise((resolve) => setTimeout(resolve, 5_000))

    console.log('targetUserOperationHash', targetUserOperationHash)
    setLoading(false);
  }

  async function sendCrosschainLiquidityTransaction() {
    setLoading(true);
    setLoadingText("Funding account...");

    // initialize paymaster
    const paymaster = new Web3AuthPaymaster({
      apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
      chains: [
        { chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL },
        { chainId: TARGET_CHAIN.id, rpcUrl: TARGET_CHAIN_RPC_URL },
      ],
    });
    const transferAmount = parseUnits('10', 6)

    // get smart account address
    const accountAddress = await multiChainAccount.getAddress();

    setLoadingText("Preparing user operation...");
    const prepareMultiChainUserOperationResult = await paymaster.core.prepareMultiChainUserOperation({
        account: multiChainAccount,
        calls: [createTestTokenTransfer(accountAddress, transferAmount)],
        sourceChainId: SOURCE_CHAIN.id,
        targetChainId: TARGET_CHAIN.id,
        targetAmount: transferAmount,
        feeToken: getSupportedFeeTokens(TARGET_CHAIN.id)[0],
      })

    setLoadingText("Sending user operation...");
    const { sourceUserOperationHash, targetUserOperationHash } = await multiChainAccount.sendMultiChainUserOperation(prepareMultiChainUserOperationResult)
    console.log('sourceUserOperationHash:', sourceUserOperationHash)

    const sourceBundlerClient = createBundlerClient(SOURCE_CHAIN, SOURCE_CHAIN_RPC_URL);
    const { receipt } = await sourceBundlerClient.waitForUserOperationReceipt({ hash: sourceUserOperationHash })
    console.log("receipt", receipt);

    // wait for 5 seconds before polling for target user op status
    await new Promise((resolve) => setTimeout(resolve, 5_000))

    console.log('targetUserOperationHash', targetUserOperationHash)
    setLoading(false);
  }

  async function getTokenApproval(paymaster: Web3AuthPaymaster) {
    if (!sponsor) throw new Error("Sponsor is required");

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
