import { Hex } from 'viem'

import { CallType } from './types'

export const CALL_TYPE_HEX: Record<CallType, Hex> = {
  call: '0x00',
  batchcall: '0x01',
  delegatecall: '0x01',
}

export const VALIDATOR_TYPE = {
  ROOT: '0x00',
  VALIDATOR: '0x01',
  PERMISSION: '0x02',
} as const
export enum VALIDATOR_MODE {
  DEFAULT = '0x00',
  ENABLE = '0x01',
}
