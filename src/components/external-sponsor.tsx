'use client'

import { SOURCE_CHAIN, WEB3PAY_API_URL } from "@/config"
import { useCallback, useEffect, useState } from "react"
import { Address, generatePrivateKey, PrivateKeyAccount, privateKeyToAccount } from "viem/accounts"

interface ExternalSponsorProps {
  onEoaWalletFunded: (account: PrivateKeyAccount) => void
}

export default function ExternalSponsor({ onEoaWalletFunded }: ExternalSponsorProps) {
  const [loadingText, setLoadingText] = useState('Generating random EOA wallet...')
  const [eoaWallet, setEoaWallet] = useState<PrivateKeyAccount>()

  const fundEoaWallet = useCallback(async (eoaAddress: Address) => {
    await fetch(`${WEB3PAY_API_URL}/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chainId: SOURCE_CHAIN.id, toAddress: eoaAddress }),
    })
  }, [])
  
  useEffect(() => {
    let timeout: NodeJS.Timeout
    (async () => {
      setLoadingText('Generating random EOA wallet...')
      timeout = setTimeout(async () => {
        const privateKey = generatePrivateKey()
        const account = privateKeyToAccount(privateKey)
        setEoaWallet(account)

        // funding test token to eoa wallet
        setLoadingText('Funding test token to EOA wallet...')

        await fundEoaWallet(account.address)

        setLoadingText('EOA wallet funded!')
        onEoaWalletFunded(account)
      }, 1000)
    })()
    return () => clearTimeout(timeout)
  }, [fundEoaWallet, onEoaWalletFunded])

  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-gray-300 rounded-md p-6">
      {eoaWallet && <p className="text-sm bg-gray-100 p-2 rounded-md">EOA address: {eoaWallet.address}</p>}
      <p className="text-xs">{loadingText}</p>
    </div>
  )
}
