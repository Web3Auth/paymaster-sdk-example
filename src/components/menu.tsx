'use client'

import { getWeb3AuthValidatorAddress, PaymasterVersion, ValidatorType } from '@web3auth/paymaster-sdk'
import { toEcdsaKernelSmartAccount } from 'permissionless/accounts'
import { createPublicClient, http, keccak256 } from 'viem'
import { SmartAccount } from 'viem/account-abstraction'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import { toWebAuthnKernelSmartAccount } from '@/account/smartAccount'
import { b64ToBytes } from '@/account/utils'
import { webauthnRegister } from '@/account/webauthnService'
import { WebAuthnCredentials } from '@/account/webauthnSigner'
import { SOURCE_CHAIN, SOURCE_CHAIN_RPC_URL } from '@/config'

interface MenuProps {
  onAccountCreated: (address: SmartAccount, type: 'ecdsa' | 'webauthn', webAuthnCredentials?: WebAuthnCredentials) => void
}

export default function Menu({ onAccountCreated }: MenuProps) {
  async function createECDSAAccount() {
    const privKey = generatePrivateKey()
    const owner = privateKeyToAccount(privKey)
    const client = createPublicClient({
      chain: SOURCE_CHAIN,
      transport: http(SOURCE_CHAIN_RPC_URL),
    })
    const account: SmartAccount = await toEcdsaKernelSmartAccount({ client, owners: [owner] })
    onAccountCreated(account, 'ecdsa')
  }

  async function createWebAuthnAccount() {
    const client = createPublicClient({
      chain: SOURCE_CHAIN,
      transport: http(SOURCE_CHAIN_RPC_URL),
    })
    const { cred } = await webauthnRegister()
    const publicKey = cred.response.publicKey
    if (!publicKey) throw new Error('public not return from the Passksey authentication')

    const authenticatorId = cred.id

    // get validator address from Paymaster SDK
    const validatorAddress = getWeb3AuthValidatorAddress(SOURCE_CHAIN.id, PaymasterVersion.V0_2_0, ValidatorType.WEB_AUTHN)
    console.log('validatorAddress', validatorAddress)
    const account = await toWebAuthnKernelSmartAccount({
      client,
      webAuthnKey: {
        publicKey,
        authenticatorId,
        authenticatorIdHash: keccak256(b64ToBytes(authenticatorId)),
      },
      validatorAddress,
    })
    console.log('account', account)
    onAccountCreated(account, 'webauthn', { authenticatorId, publicKey })
  }

  return (
    <div className="flex gap-2">
      <button className="bg-blue-400 p-2 rounded-md text-sm" onClick={createECDSAAccount}>
        Create ECDSA Account
      </button>
      <button className="bg-blue-400 p-2 rounded-md text-sm" onClick={createWebAuthnAccount}>
        Create WebAuthn Account
      </button>
    </div>
  )
}
