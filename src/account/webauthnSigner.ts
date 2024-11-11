import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/typescript-types'
import {
  Address,
  Client,
  concat,
  concatHex,
  encodeAbiParameters,
  getTypesForEIP712Domain,
  hashMessage,
  hashTypedData,
  Hex,
  hexToBytes,
  keccak256,
  LocalAccount,
  pad,
  SignableMessage,
  size,
  toHex,
  TypedDataDomain,
  validateTypedData,
  zeroAddress,
} from 'viem'
import { entryPoint07Address, getUserOperationHash, UserOperation } from 'viem/account-abstraction'
import { toAccount } from 'viem/accounts'
import { signMessage } from 'viem/actions'

import { VALIDATOR_MODE } from './constants'
import { b64ToBytes, base64FromUint8Array, findQuoteIndices, isRIP7212SupportedNetwork, parseAndNormalizeSig, uint8ArrayToHexString } from './utils'
import { bytesToBase64 } from './utils'

export type WebAuthnCredentials = {
  authenticatorId: string
  publicKey: string
}

export type CreateWebAuthnPluginParameters = WebAuthnCredentials & {
  chainId: number
}

async function signMessageWithWebAuthn(
  message: SignableMessage,
  chainId: number,
  allowCredentials?: PublicKeyCredentialRequestOptionsJSON['allowCredentials']
) {
  // remove 0x prefix if present
  const formattedMessage = hashMessage(message)

  const challenge = base64FromUint8Array(hexToBytes(formattedMessage), true)

  // prepare assertion options
  const assertionOptions: PublicKeyCredentialRequestOptionsJSON = {
    challenge,
    allowCredentials,
    userVerification: 'required',
  }

  // start authentication (signing)

  const { startAuthentication } = await import('@simplewebauthn/browser')
  const cred = await startAuthentication({ optionsJSON: assertionOptions })

  // get authenticator data
  const { authenticatorData } = cred.response
  const authenticatorDataHex = uint8ArrayToHexString(b64ToBytes(authenticatorData))

  // get client data JSON
  const clientDataJSON = atob(cred.response.clientDataJSON)

  // get challenge and response type location
  const { beforeType } = findQuoteIndices(clientDataJSON)
  // get signature r,s
  const { signature } = cred.response
  const signatureHex = uint8ArrayToHexString(b64ToBytes(signature))
  const { r, s } = parseAndNormalizeSig(signatureHex)

  // encode signature
  const encodedSignature = encodeAbiParameters(
    [
      { name: 'authenticatorData', type: 'bytes' },
      { name: 'clientDataJSON', type: 'string' },
      { name: 'responseTypeLocation', type: 'uint256' },
      { name: 'r', type: 'uint256' },
      { name: 's', type: 'uint256' },
      { name: 'usePrecompiled', type: 'bool' },
    ],
    [authenticatorDataHex, clientDataJSON, beforeType, BigInt(r), BigInt(s), isRIP7212SupportedNetwork(chainId)]
  )
  return encodedSignature
}

export async function parseXandYfromPublicKey(publicKey: string): Promise<{ pubX: Hex; pubY: Hex }> {
  const spkiDer = Buffer.from(publicKey, 'base64')
  const key = await crypto.subtle.importKey(
    'spki',
    spkiDer,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['verify']
  )

  // Export the key to the raw format
  const rawKey = await crypto.subtle.exportKey('raw', key)
  const rawKeyBuffer = Buffer.from(rawKey)

  // The first byte is 0x04 (uncompressed), followed by x and y coordinates (32 bytes each for P-256)
  const pubKeyX = rawKeyBuffer.subarray(1, 33).toString('hex')
  const pubKeyY = rawKeyBuffer.subarray(33).toString('hex')

  return { pubX: `0x${pubKeyX}`, pubY: `0x${pubKeyY}` }
}

export async function toWebAuthnSigner(client: Client, parameters: CreateWebAuthnPluginParameters, validatorAddress: Address) {
  const { chainId, authenticatorId } = parameters
  const { pubX: pubKeyX, pubY: pubKeyY } = await parseXandYfromPublicKey(parameters.publicKey)
  const authenticatorIdHash = keccak256(uint8ArrayToHexString(b64ToBytes(authenticatorId)))

  const account: LocalAccount = toAccount({
    address: zeroAddress,

    async signMessage({ message }: { message: SignableMessage }) {
      console.log('signer::signMessage::message', message)
      return signMessageWithWebAuthn(message, chainId, [{ id: authenticatorId, type: 'public-key' }])
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async signTransaction(_, __) {
      throw new Error('sign transaction is not supported by SmartAccount')
    },

    async signTypedData(parameters) {
      const { domain, message, primaryType } = parameters

      const types = {
        EIP712Domain: getTypesForEIP712Domain({
          domain: domain as TypedDataDomain,
        }),
        ...parameters.types,
      }

      validateTypedData({
        domain: domain as TypedDataDomain,
        message: message as Record<string, unknown>,
        types,
        primaryType: primaryType as string,
      })

      const hash = hashTypedData(parameters)

      const signature = await signMessage(client, {
        account,
        message: hash,
      })

      return signature
    },
  })

  const getEnableData = async () => {
    return encodeAbiParameters(
      [
        {
          components: [
            { name: 'x', type: 'uint256' },
            { name: 'y', type: 'uint256' },
          ],
          name: 'webAuthnData',
          type: 'tuple',
        },
        {
          name: 'authenticatorIdHash',
          type: 'bytes32',
        },
      ],
      [
        {
          x: BigInt(pubKeyX),
          y: BigInt(pubKeyY),
        },
        authenticatorIdHash,
      ]
    )
  }

  return {
    ...account,
    address: validatorAddress,
    getEnableData,

    getIdentifier() {
      return validatorAddress
    },

    async getStubSignature() {
      const opHash = `0x${'ff'.repeat(32)}` as Hex
      const paymasterSig =
        '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c'
      const guarantorSig =
        '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c'

      const rootSig = encodeAbiParameters(
        [
          { name: 'authenticatorData', type: 'bytes' },
          { name: 'clientDataJSON', type: 'string' },
          { name: 'responseTypeLocation', type: 'uint256' },
          { name: 'r', type: 'uint256' },
          { name: 's', type: 'uint256' },
          { name: 'usePrecompiled', type: 'bool' },
        ],
        [
          '0x49960de5880e8c687434170f6476605b8fe4aeb9a28632c7995cf3ba831d97631d00000000',
          '{"type":"webauthn.get","challenge":"tbxXNFS9X_4Byr1cMwqKrIGB-_30a0QhZ6y7ucM0BOE","origin":"http://localhost:3010","crossOrigin":false, "other_keys_can_be_added_here":"do not compare clientDataJSON against a template. See https://goo.gl/yabPex"}',
          1n,
          44941127272049826721201904734628716258498742255959991581049806490182030242267n,
          9910254599581058084911561569808925251374718953855182016200087235935345969636n,
          false,
        ]
      )

      const sigType = '0x01' // Two op sig.
      const accountSig = concat([sigType, rootSig, opHash])
      const accountSigLen = pad(toHex(size(accountSig)), { size: 2 })
      return concat([accountSigLen, accountSig, paymasterSig, guarantorSig])
    },

    async getValidatorInitData() {
      const identifierData = concat(['0x01', validatorAddress])
      return {
        validatorAddress,
        enableData: await getEnableData(),
        identifier: pad(identifierData, { size: 21, dir: 'right' }),
      }
    },

    getSerializedData() {
      const dataToSerialize = {
        validatorAddress,
        pubKeyX,
        pubKeyY,
        authenticatorId,
        authenticatorIdHash,
      }
      const jsonString = JSON.stringify(dataToSerialize, (_key: string, val: unknown) => {
        return typeof val === 'bigint' ? toHex(val) : val
      })
      const uint8Array = new TextEncoder().encode(jsonString)
      const b64String = bytesToBase64(uint8Array)
      return b64String
    },

    async signUserOperation(userOperation: UserOperation) {
      const uopHash = getUserOperationHash({
        userOperation: {
          ...userOperation,
          signature: '0x',
        },
        entryPointAddress: entryPoint07Address,
        entryPointVersion: '0.7',
        chainId,
      })

      const signature: Hex = await signMessage(client, {
        account,
        message: { raw: uopHash },
      })

      return signature
    },

    async getNonceKey() {
      const validatorMode = VALIDATOR_MODE.DEFAULT
      const validatorType = '0x00'
      const identifier = validatorAddress
      const localNonceKey = pad(toHex(0n), { size: 2 })

      const encoding = pad(concatHex([validatorMode, validatorType, identifier, localNonceKey]), { size: 24 })
      return BigInt(encoding)
    },
  }
}
