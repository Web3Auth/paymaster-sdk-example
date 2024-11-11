import { Hex } from 'viem'

export type WebAuthnKey = {
  publicKey: string
  authenticatorId: string
  authenticatorIdHash: Hex
}

export type CallType = 'call' | 'delegatecall' | 'batchcall'

export type Call = {
  to: Hex
  data?: Hex | undefined
  value?: bigint | undefined
}
