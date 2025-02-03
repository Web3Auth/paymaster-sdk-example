import {
  TARGET_CHAIN_RPC_URL,
  TARGET_CHAIN,
  MULTI_CHAIN_PAYMASTER_SETTINGS,
  INPUT_TOKEN_1,
  OUTPUT_TOKEN,
  WETH_CONTRACT_MAP,
  SOURCE_CHAIN_2,
  INPUT_TOKEN_2,
} from "@/config";
import { SOURCE_CHAIN_1 } from "@/config";
import {
  createBundlerClient,
  createMintW3PTokenCall,
  createTokenTransferCall,
} from "@/libs/utils";
import { MultiChainAccount, Web3AuthPaymaster } from "@web3auth/paymaster-sdk";
import { useState } from "react";
import { parseEther, parseUnits, toHex } from "viem";

interface WebAuthnActionsProps {
  multiChainAccount: MultiChainAccount;
  // sponsor: PrivateKeyAccount;
}

export default function WebAuthnActions({
  multiChainAccount,
}: WebAuthnActionsProps) {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [showTxModal, setShowTxModal] = useState(false);
  const [targetAmount, setTargetAmount] = useState(0);
  const [sourceAmount1, setSourceAmount1] = useState(0);
  const [sourceAmount2, setSourceAmount2] = useState(0);
  const [targetTxHash, setTargetTxHash] = useState<string>();

  // send user operation with multichain sponsor
  async function sendUserOpWithCrosschainSponsor() {
    setLoading(true);
    setLoadingText("Preparing user operation...");
    try {
      // initialize paymaster
      const paymaster = new Web3AuthPaymaster(MULTI_CHAIN_PAYMASTER_SETTINGS);

      // get smart account address
      const accountAddress = await multiChainAccount.getAddress();
      // prepare multichain user operation

      const prepareMultiChainUserOperationResult =
        await paymaster.core.prepareMultiChainUserOperation({
          account: multiChainAccount,
          calls: [createMintW3PTokenCall(accountAddress)],
          sourceChainIds: [SOURCE_CHAIN_2.id],
          targetChainId: TARGET_CHAIN.id,
          inputTokens: [INPUT_TOKEN_2],
          outputToken: OUTPUT_TOKEN,
        });
      setLoadingText("Sending user operation...");

      const { targetUserOperationHash, sourceUserOperationHashes } =
        await multiChainAccount.sendMultiChainUserOperation(
          prepareMultiChainUserOperationResult
        );
      console.log("sourceUserOperationHashes", sourceUserOperationHashes);

      setLoadingText("Waiting for user operation receipt...");
      const targetBundlerClient = createBundlerClient(
        TARGET_CHAIN,
        TARGET_CHAIN_RPC_URL
      );
      const { receipt } = await targetBundlerClient.waitForUserOperationReceipt(
        { hash: targetUserOperationHash }
      );
      console.log("receipt", receipt);
      setTargetTxHash(receipt.transactionHash);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  }

  async function sendCrosschainLiquidityTransaction() {
    setLoading(true);
    setLoadingText("Initializing paymaster...");
    try {
      // initialize paymaster
      const paymaster = new Web3AuthPaymaster(MULTI_CHAIN_PAYMASTER_SETTINGS);
      const transferAmount = parseUnits("0.01", 18);

      // get smart account address
      const accountAddress = await multiChainAccount.getAddress();

      setLoadingText("Preparing user operation...");
      const prepareMultiChainUserOperationResult =
        await paymaster.core.prepareMultiChainUserOperation({
          account: multiChainAccount,
          calls: [createTokenTransferCall(accountAddress, transferAmount)],
          sourceChainIds: [SOURCE_CHAIN_2.id],
          targetChainId: TARGET_CHAIN.id,
          targetAmount: transferAmount,
          inputTokens: [INPUT_TOKEN_2],
          outputToken: OUTPUT_TOKEN,
        });

      setLoadingText("Sending user operation...");
      const { targetUserOperationHash, sourceUserOperationHashes } =
        await multiChainAccount.sendMultiChainUserOperation(
          prepareMultiChainUserOperationResult
        );
      console.log("sourceUserOperationHashes", sourceUserOperationHashes);

      setLoadingText("Waiting for user operation receipt...");
      const targetBundlerClient = createBundlerClient(
        TARGET_CHAIN,
        TARGET_CHAIN_RPC_URL
      );
      const { receipt } = await targetBundlerClient.waitForUserOperationReceipt(
        { hash: targetUserOperationHash }
      );
      console.log("receipt", receipt);
      setTargetTxHash(receipt.transactionHash);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  }

  async function handleSendCrosschainLiquidityFromMultipleSources() {
    setLoading(true);
    setLoadingText("Preparing user operation...");
    setShowTxModal(false);
    try {
      // initialize paymaster
      const paymaster = new Web3AuthPaymaster(MULTI_CHAIN_PAYMASTER_SETTINGS);

      // get smart account address
      const accountAddress = await multiChainAccount.getAddress();
      const ouputToken = WETH_CONTRACT_MAP[TARGET_CHAIN.id];

      const transferAmount = parseUnits(targetAmount.toString(), 18);
      const tokenTransferCall = createTokenTransferCall(
        accountAddress,
        transferAmount,
        ouputToken
      );

      const prepareMultiChainUserOperationResult =
        await paymaster.core.prepareMultiChainUserOperation({
          account: multiChainAccount,
          calls: [tokenTransferCall],
          sourceChainIds: [SOURCE_CHAIN_1.id, SOURCE_CHAIN_2.id],
          sourceFunds: [
            toHex(parseEther(sourceAmount1.toString())),
            toHex(parseEther(sourceAmount2.toString())),
          ],
          targetChainId: TARGET_CHAIN.id,
          inputTokens: [INPUT_TOKEN_1, INPUT_TOKEN_2],
          outputToken: OUTPUT_TOKEN,
          targetAmount: transferAmount,
        });
      console.log(
        "prepareMultiChainUserOperationResult",
        prepareMultiChainUserOperationResult
      );
      setLoadingText("Sending user operation...");
      const { sourceUserOperationHashes, targetUserOperationHash } =
        await multiChainAccount.sendMultiChainUserOperation(
          prepareMultiChainUserOperationResult
        );
      console.log("sourceUserOperationHashes", sourceUserOperationHashes);

      setLoadingText("Waiting for user operation receipt...");
      const targetBundlerClient = createBundlerClient(
        TARGET_CHAIN,
        TARGET_CHAIN_RPC_URL
      );
      const { receipt } = await targetBundlerClient.waitForUserOperationReceipt(
        { hash: targetUserOperationHash }
      );
      console.log("receipt", receipt);
      setTargetTxHash(receipt.transactionHash);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <button
        className="bg-blue-400 p-2 rounded-md text-sm w-full"
        onClick={sendUserOpWithCrosschainSponsor}
      >
        Mint TestToken on OP Sepolia with Crosschain Sponsorship (POL Amoy WETH)
      </button>
      <button
        className="bg-blue-400 p-2 rounded-md text-sm w-full"
        onClick={sendCrosschainLiquidityTransaction}
      >
        Send 0.01 Weth from Polygon Amoy to Optimism Sepolia
      </button>
      <button
        className="bg-blue-400 p-2 rounded-md text-sm w-full"
        onClick={() => setShowTxModal(true)}
      >
        Send Weth from Polygon Amoy and Base Sepolia to Optimism Sepolia
      </button>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 text-sm text-gray-800">
          {loadingText}
        </div>
      )}
      {showTxModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-400/80 text-sm text-gray-800">
          <div className="flex flex-col gap-2 p-4 rounded-md bg-white">
            <p className="text-lg font-bold">
              Cross-chain Liquidity Transfer (Weth) from Multiple Sources
            </p>
            <p className="text-sm font-bold text-gray-500">Target:</p>
            <div className="flex gap-2">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-gray-600">
                  {TARGET_CHAIN.name}
                </p>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(Number(e.target.value))}
                  className="p-2 text-sm border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
            </div>
            <p className="text-sm font-bold text-gray-500">Sources:</p>
            <div className="flex gap-2">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-gray-600">
                  {SOURCE_CHAIN_1.name}
                </p>
                <input
                  type="number"
                  value={sourceAmount1}
                  onChange={(e) => setSourceAmount1(Number(e.target.value))}
                  className="p-2 text-sm border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-gray-600">
                  {SOURCE_CHAIN_2.name}
                </p>
                <input
                  type="number"
                  value={sourceAmount2}
                  onChange={(e) => setSourceAmount2(Number(e.target.value))}
                  className="p-2 text-sm border border-gray-300 rounded-md bg-gray-100"
                />
              </div>
            </div>
            <button
              className="bg-blue-400 p-2 rounded-md text-sm w-full text-white font-bold"
              onClick={handleSendCrosschainLiquidityFromMultipleSources}
            >
              Send
            </button>
            <button
              className="bg-gray-400 p-2 rounded-md text-sm w-full text-white font-bold"
              onClick={() => setShowTxModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {targetTxHash && (
        <div className="mt-4 w-full bg-gray-200 p-2 rounded-md">
          <p className="text-xs">
            Target Transaction Hash:{" "}
            <a
              className="text-xs text-blue-400 font-bold underline"
              target="_blank"
              href={`https://sepolia-optimism.etherscan.io/tx/${targetTxHash}`}
            >
              123{targetTxHash}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
