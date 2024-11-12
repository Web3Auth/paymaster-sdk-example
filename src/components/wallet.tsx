"use client";

import {
  getWeb3AuthValidatorAddress,
  PaymasterVersion,
  ValidatorType,
  Web3AuthPaymaster,
} from "@web3auth/paymaster-sdk";
import { createSmartAccountClient } from "permissionless/clients";
import { useCallback, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  keccak256,
  LocalAccount,
  maxInt256,
  PrivateKeyAccount,
} from "viem";
import {
  entryPoint07Address,
  getUserOperationHash,
  SendUserOperationParameters,
  SmartAccount,
  UserOperation,
} from "viem/account-abstraction";

import { toWebAuthnKernelSmartAccount } from "@/account/smartAccount";
import { b64ToBytes, fundTestToken } from "@/account/utils";
import { WebAuthnCredentials } from "@/account/webauthnSigner";
import {
  SOURCE_CHAIN,
  SOURCE_CHAIN_RPC_URL,
  TARGET_CHAIN,
  TARGET_CHAIN_RPC_URL,
} from "@/config";
import ExternalSponsor from "./external-sponsor";
import { approveAuthPaymasterToSpendToken } from "@/libs/sponsor";

interface WalletProps {
  account: SmartAccount;
  type: "ecdsa" | "webauthn";
  ecdsaSigner?: LocalAccount;
  webAuthnCredentials?: WebAuthnCredentials;
}

export default function Wallet({
  account,
  ecdsaSigner,
  type,
  webAuthnCredentials,
}: WalletProps) {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Loading...");
  const [isExternalSponsor, setIsExternalSponsor] = useState(false);
  const [eoaWallet, setEoaWallet] = useState<PrivateKeyAccount>();
  const [funded, setFunded] = useState(false);
  const [targetOpHash, setTargetOpHash] = useState<Hex>();

  async function sendUserOperation() {
    if (!ecdsaSigner)
      throw new Error('ECDSA signer is required')
    try {
      setLoading(true);
      await fundAccountIfNeeded();

      const paymaster = new Web3AuthPaymaster({
        apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
        chains: [{ chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL }],
      });

      const client = createSmartAccountClient({
        account,
        bundlerTransport: http(SOURCE_CHAIN_RPC_URL),
      });
      setLoadingText("Preparing user operation ...");
      const userOp = (await client.prepareUserOperation({
        account,
        callData: await account.encodeCalls([
          paymaster.core.createTokenApprovalCall(),
        ]),
        paymaster: paymaster.core.preparePaymasterData(),
      })) as SendUserOperationParameters;
      console.log("userOp", userOp);

      setLoadingText("Signing user operation ...");
      const signature = await paymaster.core.signUserOperation({
        chainId: SOURCE_CHAIN.id,
        userOperation: userOp as UserOperation<'0.7'>,
        signMessage: async (rootHash: Hex) => {
          return ecdsaSigner.signMessage({ message: { raw: rootHash } });
        },
      });
      userOp.signature = signature

      setLoadingText("Sending user operation ...");
      const hash = await client.sendUserOperation({ ...userOp })
      setLoadingText("Waiting for user operation receipt ...");
      const { receipt } = await client.waitForUserOperationReceipt({ hash })

      console.log('receipt', receipt.transactionHash)
      setTargetOpHash(receipt.transactionHash)
    } catch (error) {
      console.error("error", (error as Error).stack);
      setLoading(false);
    }
  }

  async function prepareTargetOp(paymaster: Web3AuthPaymaster) {
    if (!webAuthnCredentials)
      throw new Error("WebAuthn credentials are required");
    setLoadingText("Preparing target user operation ...");
    // get validator address from Paymaster SDK
    const validatorAddress = getWeb3AuthValidatorAddress(
      TARGET_CHAIN.id,
      PaymasterVersion.V0_2_0,
      ValidatorType.WEB_AUTHN
    );
    const targetAccount = await toWebAuthnKernelSmartAccount({
      client: createPublicClient({
        chain: TARGET_CHAIN,
        transport: http(TARGET_CHAIN_RPC_URL),
      }),
      webAuthnKey: {
        publicKey: webAuthnCredentials.publicKey,
        authenticatorId: webAuthnCredentials.authenticatorId,
        authenticatorIdHash: keccak256(
          b64ToBytes(webAuthnCredentials.authenticatorId)
        ),
      },
      validatorAddress,
    });

    const targetAccountClient = createSmartAccountClient({
      account: targetAccount,
      bundlerTransport: http(TARGET_CHAIN_RPC_URL),
    });
    const targetUserOp = (await targetAccountClient.prepareUserOperation({
      account: targetAccount,
      parameters: ["factory", "fees", "paymaster", "nonce", "signature"],
      callData: await targetAccount.encodeCalls([
        paymaster.core.createTestTokenMintCall({ chainId: TARGET_CHAIN.id }),
      ]),
      paymaster: paymaster.core.preparePaymasterData({
        chainId: TARGET_CHAIN.id,
      }),
    })) as SendUserOperationParameters;

    return targetUserOp;
  }

  async function prepareSourceOp(paymaster: Web3AuthPaymaster) {
    setLoadingText("Preparing source user operation ...");
    const accountClient = createSmartAccountClient({
      account,
      bundlerTransport: http(SOURCE_CHAIN_RPC_URL),
    });

    let callData: Hex;
    let sponsorPrefundCallForSimulation: Hex | undefined;
    if (eoaWallet) {
      const { simulationCallData, prefundCallData } =
        await paymaster.core.createPrefundCallForSponsor({
          chainId: SOURCE_CHAIN.id,
          signPrefundCallWithSponsor: async (message: Hex) => {
            return eoaWallet.signMessage({ message: { raw: message } });
          },
        });
      callData = await account.encodeCalls([prefundCallData]);
      sponsorPrefundCallForSimulation = await account.encodeCalls([
        simulationCallData,
      ]);
    } else {
      callData = await account.encodeCalls([
        paymaster.core.createTokenApprovalCall({ chainId: SOURCE_CHAIN.id }),
        paymaster.core.createPreFundCall({ chainId: SOURCE_CHAIN.id }),
      ]);
    }

    const sourceOp = (await accountClient.prepareUserOperation({
      account,
      parameters: ["factory", "fees", "paymaster", "nonce", "signature"],
      callData,
      paymaster: paymaster.core.preparePaymasterData({
        chainId: SOURCE_CHAIN.id,
        sponsorPrefundCallForSimulation,
      }),
    })) as SendUserOperationParameters;
    return sourceOp;
  }

  async function sendAndTrackMultiChainUserOperation(
    paymaster: Web3AuthPaymaster,
    targetOp: SendUserOperationParameters,
    sourceOp: SendUserOperationParameters
  ) {
    await paymaster.core.saveSignedTargetUserOp({
      targetUserOp: targetOp as UserOperation<"0.7">,
      sourceChainId: SOURCE_CHAIN.id,
      targetChainId: TARGET_CHAIN.id,
    });

    // Send source chain operation
    setLoadingText("Sending source user operation ...");
    const accountClient = createSmartAccountClient({
      account,
      bundlerTransport: http(SOURCE_CHAIN_RPC_URL),
    });
    const sourceHash = await accountClient.sendUserOperation({ ...sourceOp });
    console.log("Source user op hash:", sourceHash);
    setLoadingText("Waiting for source user operation receipt ...");
    const { receipt } = await accountClient.waitForUserOperationReceipt({
      hash: sourceHash,
    });
    console.log("Source receipt:", receipt.transactionHash);

    const targetOpHash = getUserOperationHash({
      userOperation: targetOp as UserOperation<"0.7">,
      entryPointAddress: entryPoint07Address,
      entryPointVersion: "0.7",
      chainId: TARGET_CHAIN.id,
    });
    console.log("Target user op hash:", targetOpHash);

    setTargetOpHash(targetOpHash);
  }

  async function fundAccountIfNeeded() {
    if (!funded) {
      setLoadingText("Funding test token to account ...");
      console.log("Funding test token to account");
      await fundTestToken(account.address);
      console.log("Funded test token to account");
      setFunded(true);
    }
  }

  async function sendUserOperationWithCrosschainSponsor() {
    try {
      if (type === "ecdsa") {
        throw new Error(
          "ECDSA account type not supported for crosschain sponsor"
        );
      }
      setLoading(true);
      await fundAccountIfNeeded();
      const paymaster = new Web3AuthPaymaster({
        apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
        chains: [
          { chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL },
          { chainId: TARGET_CHAIN.id, rpcUrl: TARGET_CHAIN_RPC_URL },
        ],
        paymasterVersion: PaymasterVersion.V0_2_0,
      });

      const targetOp = await prepareTargetOp(paymaster);
      const sourceOp = await prepareSourceOp(paymaster);

      console.log("partial-sourceOp", sourceOp);
      console.log("partial-targetOp", targetOp);

      const { sourceUserOpSignature, partialTargetUserOpSignature } =
        await paymaster.core.signMultiChainUserOperation({
          sourceOp: {
            userOp: sourceOp as UserOperation<"0.7">,
            chainId: SOURCE_CHAIN.id,
          },
          targetOp: {
            userOp: targetOp as UserOperation<"0.7">,
            chainId: TARGET_CHAIN.id,
          },
          signMessage: async (rootHash: Hex) => {
            return account.signMessage({ message: { raw: rootHash } });
          },
        });

      sourceOp.signature = sourceUserOpSignature;
      targetOp.signature = partialTargetUserOpSignature;

      await sendAndTrackMultiChainUserOperation(paymaster, targetOp, sourceOp);
      setLoading(false);
    } catch (error) {
      console.error("error", (error as Error).stack);
      setLoading(false);
    }
  }

  async function sendUserOperationWithEoaSponsor() {
    if (!eoaWallet) {
      setIsExternalSponsor(true);
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const paymaster = new Web3AuthPaymaster({
        apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || "",
        chains: [
          { chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL },
          { chainId: TARGET_CHAIN.id, rpcUrl: TARGET_CHAIN_RPC_URL },
        ],
        sponsor: eoaWallet.address,
      });
      const targetOp = await prepareTargetOp(paymaster);
      console.log("partial-targetOp", targetOp);
      const sourceOp = await prepareSourceOp(paymaster);
      console.log("partial-sourceUserOp", sourceOp);

      const { sourceUserOpSignature, partialTargetUserOpSignature } =
        await paymaster.core.signMultiChainUserOperation({
          sourceOp: {
            userOp: sourceOp as UserOperation<"0.7">,
            chainId: SOURCE_CHAIN.id,
          },
          targetOp: {
            userOp: targetOp as UserOperation<"0.7">,
            chainId: TARGET_CHAIN.id,
          },
          signMessage: async (rootHash: Hex) => {
            return account.signMessage({ message: { raw: rootHash } });
          },
          signMessageWithSponsor: async (hash: Hex) => {
            return eoaWallet.signMessage({ message: { raw: hash } });
          },
        });
      sourceOp.signature = sourceUserOpSignature;
      targetOp.signature = partialTargetUserOpSignature;

      // approve paymaster to spend source token from EOA
      const eoaWalletClient = createWalletClient({
        account: eoaWallet,
        chain: SOURCE_CHAIN,
        transport: http(SOURCE_CHAIN_RPC_URL),
      });
      await approveAuthPaymasterToSpendToken(
        eoaWalletClient,
        maxInt256,
        paymaster.core.getPaymasterAddress()
      );

      await sendAndTrackMultiChainUserOperation(paymaster, targetOp, sourceOp);

      setLoading(false);
    } catch (error) {
      console.error("error", (error as Error).stack);
      setLoading(false);
    }
  }

  const onEoaWalletFunded = useCallback((account: PrivateKeyAccount) => {
    setIsExternalSponsor(true);
    setEoaWallet(account);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center gap-3 border border-gray-300 rounded-md p-6">
      <h1>Wallet</h1>
      <div className="flex items-center justify-center gap-2">
        <p className="text-sm bg-gray-100 p-2 rounded-md text-gray-800">{account.address}</p>
        <p className="text-sm bg-red-100 p-2 rounded-md text-gray-800">{type}</p>
      </div>
      {targetOpHash && (
        <p className="text-xs bg-green-300 p-2 rounded-md mb-4 text-gray-800">
          Target userOp hash: {targetOpHash}
        </p>
      )}
      {isExternalSponsor && (
        <ExternalSponsor onEoaWalletFunded={onEoaWalletFunded} />
      )}
      {type === "webauthn" ? (
        <>
          <button
            className="bg-blue-400 p-2 rounded-md text-sm w-full"
            onClick={sendUserOperationWithCrosschainSponsor}
            disabled={loading}
          >
            Send User Operation with Crosschain Sponsor
          </button>
          <button
            className="bg-blue-500 p-2 rounded-md text-sm w-full"
            onClick={sendUserOperationWithEoaSponsor}
            disabled={loading}
          >
            {eoaWallet
              ? "Send User Operation with EOA Sponsor"
              : "Generate EOA Wallet for Sponsorship"}
          </button>
        </>
      ) : (
        <button
          className="bg-blue-400 mt-8 p-2 rounded-md text-sm w-full"
          onClick={sendUserOperation}
          disabled={loading}
        >
          Send User Operation (with ERC20 Token gas)
        </button>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 text-sm text-gray-800">
          {loadingText}
        </div>
      )}
    </div>
  );
}
