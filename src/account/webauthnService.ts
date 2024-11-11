import { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/typescript-types'

export async function webauthnRegister() {
  const ts = Date.now()
  const username = `user-${ts}`

  const optionsUrl = 'https://lrc-accounts.web3auth.io/api/register/options'
  const resp = await fetch(optionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
    }),
  })

  const { options, userId } = (await resp.json()) as { options: PublicKeyCredentialCreationOptionsJSON; userId: string }

  const { startRegistration } = await import('@simplewebauthn/browser')
  const cred = await startRegistration({ optionsJSON: options })

  const verifyUrl = 'https://lrc-accounts.web3auth.io/api/register/verify'
  const verifyResp = await fetch(verifyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      cred,
      userId,
      accountVersion: '0.1.0'
    }),
  })

  const registerVerifyResponse = await verifyResp.json()

  return {
    registerVerifyResponse,
    cred,
    options,
  }
}
