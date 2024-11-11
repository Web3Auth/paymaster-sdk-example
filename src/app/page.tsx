'use client'

import { useState } from 'react'
import { SmartAccount } from 'viem/account-abstraction'

import { WebAuthnCredentials } from '@/account/webauthnSigner'
import Menu from '@/components/menu'
import Wallet from '@/components/wallet'

export default function Home() {
  const [account, setAccount] = useState<{ account: SmartAccount; type: 'ecdsa' | 'webauthn' }>()
  const [webAuthnCredentials, setWebAuthnCredentials] = useState<WebAuthnCredentials>()

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="w-full absolute top-0 left-0 p-4 bg-gray-100">
        <h1>Web3Auth Paymaster</h1>
      </div>
      {account ? (
        <Wallet account={account.account} type={account.type} webAuthnCredentials={webAuthnCredentials} />
      ) : (
        <Menu
          onAccountCreated={(account, type, webAuthnCredentials) => {
            setAccount({ account, type })
            setWebAuthnCredentials(webAuthnCredentials)
          }}
        />
      )}
    </div>
  )
}
