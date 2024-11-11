'use client'

import { getWeb3AuthValidatorAddress, PaymasterVersion, ValidatorType, Web3AuthPaymaster } from '@web3auth/paymaster-sdk'
import { createSmartAccountClient } from 'permissionless/clients'
import { useState } from 'react'
import { createPublicClient, Hex, http, keccak256 } from 'viem'
import { entryPoint07Address, getUserOperationHash, SendUserOperationParameters, SmartAccount, UserOperation } from 'viem/account-abstraction'

import { toWebAuthnKernelSmartAccount } from '@/account/smartAccount'
import { b64ToBytes, fundTestToken } from '@/account/utils'
import { WebAuthnCredentials } from '@/account/webauthnSigner'
import { SOURCE_CHAIN, SOURCE_CHAIN_RPC_URL, TARGET_CHAIN, TARGET_CHAIN_RPC_URL } from '@/config/networks'

interface WalletProps {
  account: SmartAccount
  type: 'ecdsa' | 'webauthn'
  webAuthnCredentials?: WebAuthnCredentials
}

export default function Wallet({ account, type, webAuthnCredentials }: WalletProps) {
  const [loading, setLoading] = useState(false)
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

  async function sendUserOperationWithCrosschainSponsor() {
    try {
      if (type === 'ecdsa') {
        throw new Error('ECDSA account type not supported for crosschain sponsor')
      }
      setLoading(true)
      const accountClient = createSmartAccountClient({ account, bundlerTransport: http(SOURCE_CHAIN_RPC_URL) })

      if (!funded) {
        // fund test token to account
        console.log('Funding test token to account')
        await fundTestToken(account.address)
        console.log('Funded test token to account')
        setFunded(true)
      }

      const paymaster = new Web3AuthPaymaster({
        apiKey: process.env.NEXT_PUBLIC_WEB3AUTH_PAYMASTER_API_KEY || '',
        chains: [
          { chainId: SOURCE_CHAIN.id, rpcUrl: SOURCE_CHAIN_RPC_URL },
          { chainId: TARGET_CHAIN.id, rpcUrl: TARGET_CHAIN_RPC_URL },
        ],
        paymasterVersion: PaymasterVersion.V0_2_0,
      })

      const targetOp = await prepareTargetOp(paymaster)

      const sourceOp = (await accountClient.prepareUserOperation({
        account,
        parameters: ['factory', 'fees', 'paymaster', 'nonce', 'signature'],
        callData: await account.encodeCalls([
          paymaster.core.createTokenApprovalCall({ chainId: SOURCE_CHAIN.id }),
          paymaster.core.createPreFundCall({ chainId: SOURCE_CHAIN.id }),
        ]),
        paymaster: paymaster.core.preparePaymasterData({ chainId: SOURCE_CHAIN.id }),
      })) as SendUserOperationParameters

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
      const sourceHash = await accountClient.sendUserOperation({ ...sourceOp })
      console.log('Source user op hash:', sourceHash)
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
    setLoading(true)
  }

  return (
    <div className="relative flex flex-col items-center justify-center gap-3 border border-gray-300 rounded-md p-6">
      <h1>Wallet</h1>
      <div className="flex items-center justify-center gap-2">
        <p className="text-sm bg-gray-100 p-2 rounded-md">{account.address}</p>
        <p className="text-sm bg-green-100 p-2 rounded-md">{type}</p>
      </div>
      {targetOpHash && <p className="text-xs bg-red-50 p-2 rounded-md">Target userOp hash: {targetOpHash}</p>}
      <button className="bg-blue-400 mt-8 p-2 rounded-md text-sm w-full" onClick={sendUserOperation} disabled={loading}>
        Send User Operation
      </button>
      {type === 'webauthn' && (
        <>
          <button className="bg-blue-500 p-2 rounded-md text-sm w-full" onClick={sendUserOperationWithCrosschainSponsor} disabled={loading}>
            Send User Operation with Crosschain Sponsor
          </button>
          <button className="bg-blue-600 p-2 rounded-md text-sm w-full" onClick={sendUserOperationWithEoaSponsor} disabled={loading}>
            Sponsor User Operation with EOA
          </button>
        </>
      )}
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 text-sm">Loading...</div>}
    </div>
  )
}
