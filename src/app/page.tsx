'use client'

import { useState } from 'react'
import { SmartAccount } from 'viem/account-abstraction'

import { WebAuthnCredentials } from '@/account/webauthnSigner'
import Menu from '@/components/menu'
import Wallet from '@/components/wallet'
import { LocalAccount } from 'viem/accounts'

export default function Home() {
  const [ecdsaSigner, setEcdsaSigner] = useState<LocalAccount>()
  const [account, setAccount] = useState<{ account: SmartAccount; type: 'ecdsa' | 'webauthn' }>()
  const [webAuthnCredentials, setWebAuthnCredentials] = useState<WebAuthnCredentials>()

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="w-full absolute top-0 left-0 p-4 bg-gray-100 dark:bg-gray-800">
        <p className="text-lg font-bold text-gray-800 dark:text-gray-200">Web3Auth Paymaster SDK Example</p>
      </div>
      {account ? (
        <Wallet account={account.account} type={account.type} webAuthnCredentials={webAuthnCredentials} ecdsaSigner={ecdsaSigner} />
      ) : (
        <Menu
          onAccountCreated={({ account, type, webAuthnCredentials, ecdsaSigner }) => {
            setAccount({ account, type })
            setWebAuthnCredentials(webAuthnCredentials)
            setEcdsaSigner(ecdsaSigner)
          }}
        />
      )}
    </div>
  )
}
