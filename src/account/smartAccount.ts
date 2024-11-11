import { ToEcdsaKernelSmartAccountParameters } from 'permissionless/accounts'
import { getAccountNonce, getSenderAddress } from 'permissionless/actions'
import { encode7579Calls } from 'permissionless/utils'
import {
  Address,
  concat,
  concatHex,
  encodeAbiParameters,
  encodeFunctionData,
  getTypesForEIP712Domain,
  hashTypedData,
  Hex,
  maxUint16,
  pad,
  parseAbi,
  SignableMessage,
  SignTypedDataParameters,
  size,
  toHex,
  TypedDataDefinition,
  validateTypedData,
  zeroAddress,
} from 'viem'
import {
  entryPoint07Abi,
  entryPoint07Address,
  getUserOperationHash,
  SmartAccount,
  toSmartAccount,
  ToSmartAccountReturnType,
} from 'viem/account-abstraction'

import { Call, CallType, WebAuthnKey } from './types'
import { parseXandYfromPublicKey, toWebAuthnSigner } from './webauthnSigner'

export interface ToWebAuthnKernelSmartAccountParameters extends Omit<ToEcdsaKernelSmartAccountParameters<'0.7', '0.3.0-beta'>, 'owners'> {
  webAuthnKey: WebAuthnKey
  validatorAddress: Address
}

const kernelVersion = '0.3.0-beta'

const KERNEL_VERSION_TO_ADDRESSES_MAP = {
  '0.3.0-beta': {
    FACTORY_ADDRESS: '0x6723b44Abeec4E71eBE3232BD5B455805baDD22f',
    META_FACTORY_ADDRESS: '0xd703aaE79538628d27099B8c4f621bE4CCd142d5',
  } as Record<string, Address>,
}

const VALIDATOR_TYPE = {
  ROOT: '0x00',
  VALIDATOR: '0x01',
  PERMISSION: '0x02',
} as const

enum VALIDATOR_MODE {
  DEFAULT = '0x00',
  ENABLE = '0x01',
}

export const toWebAuthnKernelSmartAccount = async (parameters: ToWebAuthnKernelSmartAccountParameters): Promise<SmartAccount> => {
  const { webAuthnKey, client, validatorAddress } = parameters

  const addresses = KERNEL_VERSION_TO_ADDRESSES_MAP[kernelVersion]
  const factoryAddress = addresses.FACTORY_ADDRESS
  const metaFactoryAddress = addresses.META_FACTORY_ADDRESS
  if (!factoryAddress || !metaFactoryAddress) throw new Error(`Invalid kernel version: ${kernelVersion}`)

  const getFactoryArgs = async () => {
    const { pubX, pubY } = await parseXandYfromPublicKey(webAuthnKey.publicKey)
    return {
      factory: metaFactoryAddress,
      factoryData: await (async () => {
        const enableData = encodeAbiParameters(
          [
            {
              components: [
                { name: 'x', type: 'uint256' },
                { name: 'y', type: 'uint256' },
              ],
              name: 'webAuthnData',
              type: 'tuple',
            },
            { name: 'authenticatorIdHash', type: 'bytes32' },
          ],
          [{ x: BigInt(pubX), y: BigInt(pubY) }, webAuthnKey.authenticatorIdHash]
        )
        const initializationData = encodeFunctionData({
          abi: parseAbi(['function initialize(bytes21,address,bytes,bytes)']),
          functionName: 'initialize',
          args: [concat([VALIDATOR_TYPE.VALIDATOR, validatorAddress]), zeroAddress, enableData, '0x'],
        })
        return encodeFunctionData({
          abi: parseAbi(['function deployWithFactory(address,bytes,bytes32)']),
          functionName: 'deployWithFactory',
          args: [factoryAddress, initializationData, toHex(0n, { size: 32 })],
        })
      })(),
    }
  }

  const getAddress = async () => {
    const { factory, factoryData } = await getFactoryArgs()
    return getSenderAddress(client, {
      factory,
      factoryData,
      entryPointAddress: entryPoint07Address,
    })
  }

  const signMessage = async (message: SignableMessage) => {
    console.log('account::signMessage', message)
    const webAuthnSigner = await toWebAuthnSigner(
      client,
      {
        authenticatorId: webAuthnKey.authenticatorId,
        publicKey: webAuthnKey.publicKey,
        chainId: client.chain?.id as number,
      },
      validatorAddress
    )
    const rootSig = await webAuthnSigner.signMessage({ message })
    return rootSig
  }

  const sign = signMessage

  const signTypedData = async (typedData: Parameters<ToSmartAccountReturnType['signTypedData']>[0]) => {
    const { domain, message, primaryType } = typedData as SignTypedDataParameters
    const types = { EIP712Domain: getTypesForEIP712Domain({ domain }), ...typedData.types }
    validateTypedData({ domain, message, primaryType, types } as TypedDataDefinition)

    const hash = hashTypedData(typedData)
    const signature = await signMessage({ raw: hash })
    return signature
  }

  const signUserOperation = async (userOperation: Parameters<ToSmartAccountReturnType['signUserOperation']>[0]) => {
    const hash = getUserOperationHash({
      userOperation: { ...userOperation, sender: await getAddress() },
      entryPointAddress: entryPoint07Address,
      entryPointVersion: '0.7',
      chainId: client.chain?.id as number,
    })

    const signature: Hex = await signMessage(hash)
    return signature
  }

  return {
    ...(await toSmartAccount({
      client,
      entryPoint: { address: entryPoint07Address, abi: entryPoint07Abi, version: '0.7' },
      async getAddress() {
        return getAddress()
      },
      async encodeCalls(calls: readonly Call[]) {
        const type: CallType = calls.length > 1 ? 'batchcall' : 'call'
        return encode7579Calls({
          mode: {
            type,
            revertOnError: false,
            selector: '0x',
            context: '0x',
          },
          callData: calls,
        })
      },
      async getNonce() {
        if (parameters.nonceKey && parameters.nonceKey > maxUint16)
          throw new Error(`nonce key must be equal or less than 2 bytes(maxUint16) for Kernel version ${kernelVersion}`)

        const encoding = pad(
          concatHex([
            VALIDATOR_MODE.DEFAULT, // 1 byte
            VALIDATOR_TYPE.ROOT, // 1 byte
            validatorAddress, // 20 bytes
            toHex(parameters.nonceKey ?? 0n, { size: 2 }), // 2 byte
          ]),
          { size: 24 }
        )
        return getAccountNonce(client, {
          address: await getAddress(),
          entryPointAddress: entryPoint07Address,
          key: BigInt(encoding),
        })
      },
      async getFactoryArgs() {
        return getFactoryArgs()
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
      async sign({ hash }) {
        return signMessage(hash)
      },
      async signMessage({ message }) {
        return signMessage(message)
      },
      async signTypedData(typedData) {
        return signTypedData(typedData as Parameters<ToSmartAccountReturnType['signTypedData']>[0])
      },
      async signUserOperation(userOperation) {
        return signUserOperation(userOperation as Parameters<ToSmartAccountReturnType['signUserOperation']>[0])
      },
    })),
    // override sign methods because viem will mutate the signatures
    async sign({ hash }: Parameters<NonNullable<ToSmartAccountReturnType['sign']>>[0]) {
      return sign(hash)
    },
    async signMessage({ message }: Parameters<ToSmartAccountReturnType['signMessage']>[0]) {
      return signMessage(message)
    },
    // async signTypedData(typedData: Parameters<ToSmartAccountReturnType['signTypedData']>[0]) {
    //   return signTypedData(typedData)
    // },
    async signUserOperation(userOperation: Parameters<ToSmartAccountReturnType['signUserOperation']>[0]) {
      return signUserOperation(userOperation)
    },
  }
}
