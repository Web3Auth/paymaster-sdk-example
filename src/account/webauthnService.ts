import { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/typescript-types'

export async function webauthnRegister() {
  const ts = Date.now()
  const username = `user-${ts}`

  const optionsUrl = 'https://passkeys.zerodev.app/api/v3/147e33a3-6671-4681-a6e2-f52e6bc7ee5e/register/options'
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

  const verifyUrl = 'https://passkeys.zerodev.app/api/v3/147e33a3-6671-4681-a6e2-f52e6bc7ee5e/register/verify'
  const verifyResp = await fetch(verifyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      cred,
      userId,
    }),
  })

  const registerVerifyResponse = await verifyResp.json()

  return {
    registerVerifyResponse,
    cred,
    options,
  }
}
