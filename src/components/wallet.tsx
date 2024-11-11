'use client'

import { getWeb3AuthValidatorAddress, PaymasterVersion, ValidatorType, Web3AuthPaymaster } from '@web3auth/paymaster-sdk'
import { createSmartAccountClient } from 'permissionless/clients'
import { useCallback, useState } from 'react'
import { concat, createPublicClient, createWalletClient, Hex, http, keccak256, maxInt256, PrivateKeyAccount } from 'viem'
import { entryPoint07Address, GetPaymasterDataParameters, GetPaymasterDataReturnType, GetPaymasterStubDataReturnType, getUserOperationHash, SendUserOperationParameters, SmartAccount, UserOperation } from 'viem/account-abstraction'

import { toWebAuthnKernelSmartAccount } from '@/account/smartAccount'
import { b64ToBytes, fundTestToken } from '@/account/utils'
import { WebAuthnCredentials } from '@/account/webauthnSigner'
import { SOURCE_CHAIN, SOURCE_CHAIN_RPC_URL, TARGET_CHAIN, TARGET_CHAIN_RPC_URL, WEB3PAY_TEST_TOKEN } from '@/config'
import ExternalSponsor from './external-sponsor'
import { approveAuthPaymasterToSpendToken, generateCallDataForGuarantorFlow, getGuarantorSigForUserOp } from '@/libs/guarantor'
import { signMultichainOp, userOpGasHexToBigInt } from '@/libs/userop'

interface WalletProps {
  account: SmartAccount
  type: 'ecdsa' | 'webauthn'
  webAuthnCredentials?: WebAuthnCredentials
}

export default function Wallet({ account, type, webAuthnCredentials }: WalletProps) {
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('Loading...')
  const [isExternalSponsor, setIsExternalSponsor] = useState(false)
  const [eoaWallet, setEoaWallet] = useState<PrivateKeyAccount>()
  const [funded, setFunded] = useState(false)
  const [targetOpHash, setTargetOpHash] = useState<Hex>()

  async function sendUserOperation() {
    const paymaster = new Web3AuthPaymaster({
      apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || '',
      chains: [{ chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL }],
    })

    const client = createSmartAccountClient({ account, bundlerTransport: http(SOURCE_CHAIN_RPC_URL) })
    const preparedUserOp = await client.prepareUserOperation({
      account,
      callData: await account.encodeCalls([paymaster.core.createTokenApprovalCall()]),
      paymaster: paymaster.core.preparePaymasterData(),
    })
    console.log('preparedUserOp', preparedUserOp)
  }

  async function prepareTargetOp(paymaster: Web3AuthPaymaster) {
    if (!webAuthnCredentials) throw new Error('WebAuthn credentials are required')
    setLoadingText('Preparing target user operation ...')
    // get validator address from Paymaster SDK
    const validatorAddress = getWeb3AuthValidatorAddress(TARGET_CHAIN.id, PaymasterVersion.V0_2_0, ValidatorType.WEB_AUTHN)
    const targetAccount = await toWebAuthnKernelSmartAccount({
      client: createPublicClient({ chain: TARGET_CHAIN, transport: http(TARGET_CHAIN_RPC_URL) }),
      webAuthnKey: {
        publicKey: webAuthnCredentials.publicKey,
        authenticatorId: webAuthnCredentials.authenticatorId,
        authenticatorIdHash: keccak256(b64ToBytes(webAuthnCredentials.authenticatorId)),
      },
      validatorAddress,
    })

    const targetAccountClient = createSmartAccountClient({ account: targetAccount, bundlerTransport: http(TARGET_CHAIN_RPC_URL) })
    const targetUserOp = (await targetAccountClient.prepareUserOperation({
      account: targetAccount,
      parameters: ['factory', 'fees', 'paymaster', 'nonce', 'signature'],
      callData: await targetAccount.encodeCalls([paymaster.core.createTestTokenMintCall({ chainId: TARGET_CHAIN.id })]),
      paymaster: paymaster.core.preparePaymasterData({ chainId: TARGET_CHAIN.id }),
    })) as SendUserOperationParameters

    return targetUserOp
  }

  async function prepareSourceOp(paymaster: Web3AuthPaymaster) {
    setLoadingText('Preparing source user operation ...')
    const accountClient = createSmartAccountClient({ account, bundlerTransport: http(SOURCE_CHAIN_RPC_URL) })
    const sourceOp = (await accountClient.prepareUserOperation({
      account,
      parameters: ['factory', 'fees', 'paymaster', 'nonce', 'signature'],
      callData: await account.encodeCalls([
        paymaster.core.createTokenApprovalCall({ chainId: SOURCE_CHAIN.id }),
        paymaster.core.createPreFundCall({ chainId: SOURCE_CHAIN.id }),
      ]),
      paymaster: paymaster.core.preparePaymasterData({ chainId: SOURCE_CHAIN.id }),
    })) as SendUserOperationParameters
    return sourceOp
  }

  async function fundAccountIfNeeded() {
    if (!funded) {
      setLoadingText('Funding test token to account ...')
      console.log('Funding test token to account')
      await fundTestToken(account.address)
      console.log('Funded test token to account')
      setFunded(true)
    }
  }

  async function sendUserOperationWithCrosschainSponsor() {
    try {
      if (type === 'ecdsa') {
        throw new Error('ECDSA account type not supported for crosschain sponsor')
      }
      setLoading(true)
      const accountClient = createSmartAccountClient({ account, bundlerTransport: http(SOURCE_CHAIN_RPC_URL) })

      await fundAccountIfNeeded()
      const paymaster = new Web3AuthPaymaster({
        apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || '',
        chains: [
          { chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL },
          { chainId: TARGET_CHAIN.id, rpcUrl: TARGET_CHAIN_RPC_URL },
        ],
        paymasterVersion: PaymasterVersion.V0_2_0,
      })

      const targetOp = await prepareTargetOp(paymaster)
      const sourceOp = await prepareSourceOp(paymaster)

      console.log('partial-sourceOp', sourceOp)
      console.log('partial-targetOp', targetOp)

      const { sourceUserOpSignature, partialTargetUserOpSignature } = await paymaster.core.signMultiChainUserOperation({
        sourceOp: { userOp: sourceOp as UserOperation<'0.7'>, chainId: SOURCE_CHAIN.id },
        targetOp: { userOp: targetOp as UserOperation<'0.7'>, chainId: TARGET_CHAIN.id },
        signMessage: async (rootHash: Hex) => {
          return account.signMessage({ message: { raw: rootHash } })
        },
      })

      sourceOp.signature = sourceUserOpSignature
      targetOp.signature = partialTargetUserOpSignature

      await paymaster.core.saveSignedTargetUserOp({
        targetUserOp: targetOp as UserOperation<'0.7'>,
        sourceChainId: SOURCE_CHAIN.id,
        targetChainId: TARGET_CHAIN.id,
      })

      // Send source chain operation
      setLoadingText('Sending source user operation ...')
      const sourceHash = await accountClient.sendUserOperation({ ...sourceOp })
      console.log('Source user op hash:', sourceHash)
      setLoadingText('Waiting for source user operation receipt ...')
      const { receipt } = await accountClient.waitForUserOperationReceipt({ hash: sourceHash })
      console.log('Source receipt:', receipt.transactionHash)

      const targetOpHash = getUserOperationHash({
        userOperation: targetOp as UserOperation<'0.7'>,
        entryPointAddress: entryPoint07Address,
        entryPointVersion: '0.7',
        chainId: TARGET_CHAIN.id,
      })
      console.log('Target user op hash:', targetOpHash)

      setTargetOpHash(targetOpHash)
      setLoading(false)
    } catch (error) {
      console.error('error', (error as Error).stack)
      setLoading(false)
    }
  }

  async function sendUserOperationWithEoaSponsor() {
    if (type === 'ecdsa') {
      throw new Error('ECDSA account type not supported for eoa sponsor')
    }

    if (!eoaWallet) {
      setIsExternalSponsor(true)
      return
    }

    try {
      const paymaster = new Web3AuthPaymaster({
        apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || '',
        chains: [
          { chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL },
          { chainId: TARGET_CHAIN.id, rpcUrl: TARGET_CHAIN_RPC_URL },
        ],
        sponsor: eoaWallet.address,
      })
  
      setLoading(true)
      setLoadingText('Preparing target user operation ...')
      const targetOp = await prepareTargetOp(paymaster)
      console.log('partial-targetOp', targetOp)
      const eoaWalletClient = createWalletClient({
        account: eoaWallet,
        chain: SOURCE_CHAIN,
        transport: http(SOURCE_CHAIN_RPC_URL),
      })
      const { simulationCallData, callData } = await generateCallDataForGuarantorFlow({
        userOp: targetOp as UserOperation<'0.7'>,
        walletClient: eoaWalletClient,
        amount: 0n,
        authPmAddress: paymaster.core.getPaymasterAddress(),
      })
      const accountClient = createSmartAccountClient({ account, bundlerTransport: http(SOURCE_CHAIN_RPC_URL) })
      let sourcePmSig: Hex | undefined;
      const sourceUserOp = (await accountClient.prepareUserOperation({
        account,
        parameters: ['factory', 'fees', 'paymaster', 'nonce', 'signature'],
        callData: await account.encodeCalls([callData]),
        paymaster: {
          getPaymasterStubData: async () => ({}) as GetPaymasterStubDataReturnType,
          getPaymasterData: async (params: GetPaymasterDataParameters) => {
            console.log('params', params)
            const data = await paymaster.core.requestSourceChainSponsorData(params, {
              chainId: SOURCE_CHAIN.id,
              type: "external",
              token: WEB3PAY_TEST_TOKEN,
              simulatedEncodedCallData: await account.encodeCalls([simulationCallData]),
              eoaAddress: eoaWallet.address,
              version: PaymasterVersion.V0_2_0,
            })
            console.log('data', data)
            sourcePmSig = data.signature ?? "0x";
    
            return userOpGasHexToBigInt(data) as GetPaymasterDataReturnType;
          },
        },
      })) as SendUserOperationParameters
  
      console.log('sourcePmSig', sourcePmSig)
      console.log('partial-sourceUserOp', sourceUserOp)
  
      const { partialSignedSourceOp, partialSignedTargetOp } = await signMultichainOp(
        {
          userOp: sourceUserOp as unknown as UserOperation,
          chainId: SOURCE_CHAIN.id,
        },
        {
          userOp: targetOp as UserOperation<"0.7">,
          chainId: TARGET_CHAIN.id,
        },
        async (rootHash: Hex) => {
          return account.signMessage({ message: { raw: rootHash } });
        }
      );
  
      const guarantorSig = await getGuarantorSigForUserOp({
        walletClient: eoaWalletClient,
        userOp: sourceUserOp as unknown as UserOperation,
        authPmAddress: paymaster.core.getPaymasterAddress(),
      });
  
      sourceUserOp.signature = concat([partialSignedSourceOp, sourcePmSig || "0x00", guarantorSig]);
      targetOp.signature = partialSignedTargetOp;
  
      // approve paymaster to spend source token from EOA
      await approveAuthPaymasterToSpendToken(eoaWalletClient, maxInt256, paymaster.core.getPaymasterAddress());
  
      await paymaster.core.saveSignedTargetUserOp({
        targetUserOp: targetOp as UserOperation<'0.7'>,
        sourceChainId: SOURCE_CHAIN.id,
        targetChainId: TARGET_CHAIN.id,
      })
  
      // Send source chain operation
      setLoadingText('Sending source user operation ...')
      const sourceHash = await accountClient.sendUserOperation({ ...sourceUserOp })
      console.log('Source user op hash:', sourceHash)
      setLoadingText('Waiting for source user operation receipt ...')
      const { receipt } = await accountClient.waitForUserOperationReceipt({ hash: sourceHash })
      console.log('Source receipt:', receipt.transactionHash)
  
      const targetOpHash = getUserOperationHash({
        userOperation: targetOp as UserOperation<'0.7'>,
        entryPointAddress: entryPoint07Address,
        entryPointVersion: '0.7',
        chainId: TARGET_CHAIN.id,
      })
      console.log('Target user op hash:', targetOpHash)
  
      setTargetOpHash(targetOpHash)
  
      setLoading(false)
    } catch (error) {
      console.error('error', (error as Error).stack)
      setLoading(false)
    }
  }

  const onEoaWalletFunded = useCallback((account: PrivateKeyAccount) => {
    setIsExternalSponsor(true)
    setEoaWallet(account)
  }, [])

  return (
    <div className="relative flex flex-col items-center justify-center gap-3 border border-gray-300 rounded-md p-6">
      <h1>Wallet</h1>
      <div className="flex items-center justify-center gap-2">
        <p className="text-sm bg-gray-100 p-2 rounded-md">{account.address}</p>
        <p className="text-sm bg-red-100 p-2 rounded-md">{type}</p>
      </div>
      {targetOpHash && <p className="text-xs bg-green-50 p-2 rounded-md mb-4">Target userOp hash: {targetOpHash}</p>}
      {isExternalSponsor && <ExternalSponsor onEoaWalletFunded={onEoaWalletFunded} />}
      <button className="bg-blue-400 mt-8 p-2 rounded-md text-sm w-full" onClick={sendUserOperation} disabled={loading}>
        Send User Operation
      </button>
      {type === 'webauthn' && (
        <>
          <button className="bg-blue-500 p-2 rounded-md text-sm w-full" onClick={sendUserOperationWithCrosschainSponsor} disabled={loading}>
            Send User Operation with Crosschain Sponsor
          </button>
          <button className="bg-blue-600 p-2 rounded-md text-sm w-full" onClick={sendUserOperationWithEoaSponsor} disabled={loading}>
            {eoaWallet ? 'Send User Operation with EOA Sponsor' : 'Generate EOA Wallet for Sponsorship'}
          </button>
        </>
      )}
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 text-sm">{loadingText}</div>}
    </div>
  )
}
