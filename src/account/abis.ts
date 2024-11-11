export const KernelV3InitAbi = [
  {
    type: 'function',
    name: 'initialize',
    inputs: [
      {
        name: '_rootValidator',
        type: 'bytes21',
        internalType: 'ValidationId',
      },
      { name: 'hook', type: 'address', internalType: 'contract IHook' },
      { name: 'validatorData', type: 'bytes', internalType: 'bytes' },
      { name: 'hookData', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

export const KernelFactoryStakerAbi = [
  {
    type: 'constructor',
    inputs: [{ name: '_owner', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approveFactory',
    inputs: [
      {
        name: 'factory',
        type: 'address',
        internalType: 'contract KernelFactory',
      },
      { name: 'approval', type: 'bool', internalType: 'bool' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'approved',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract KernelFactory',
      },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'cancelOwnershipHandover',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'completeOwnershipHandover',
    inputs: [{ name: 'pendingOwner', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'deployWithFactory',
    inputs: [
      {
        name: 'factory',
        type: 'address',
        internalType: 'contract KernelFactory',
      },
      { name: 'createData', type: 'bytes', internalType: 'bytes' },
      { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ name: 'result', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ownershipHandoverExpiresAt',
    inputs: [{ name: 'pendingOwner', type: 'address', internalType: 'address' }],
    outputs: [{ name: 'result', type: 'uint256', internalType: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'renounceOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'requestOwnershipHandover',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'stake',
    inputs: [
      {
        name: 'entryPoint',
        type: 'address',
        internalType: 'contract IEntryPoint',
      },
      { name: 'unstakeDelay', type: 'uint32', internalType: 'uint32' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [{ name: 'newOwner', type: 'address', internalType: 'address' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'unlockStake',
    inputs: [
      {
        name: 'entryPoint',
        type: 'address',
        internalType: 'contract IEntryPoint',
      },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'withdrawStake',
    inputs: [
      {
        name: 'entryPoint',
        type: 'address',
        internalType: 'contract IEntryPoint',
      },
      {
        name: 'recipient',
        type: 'address',
        internalType: 'address payable',
      },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'event',
    name: 'OwnershipHandoverCanceled',
    inputs: [
      {
        name: 'pendingOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OwnershipHandoverRequested',
    inputs: [
      {
        name: 'pendingOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'oldOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  { type: 'error', name: 'AlreadyInitialized', inputs: [] },
  { type: 'error', name: 'NewOwnerIsZeroAddress', inputs: [] },
  { type: 'error', name: 'NoHandoverRequest', inputs: [] },
  { type: 'error', name: 'NotApprovedFactory', inputs: [] },
  { type: 'error', name: 'Unauthorized', inputs: [] },
] as const

export const EIP1271Abi = [
  {
    type: 'function',
    name: 'eip712Domain',
    inputs: [],
    outputs: [
      { name: 'fields', type: 'bytes1', internalType: 'bytes1' },
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'version', type: 'string', internalType: 'string' },
      { name: 'chainId', type: 'uint256', internalType: 'uint256' },
      {
        name: 'verifyingContract',
        type: 'address',
        internalType: 'address',
      },
      { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
      { name: 'extensions', type: 'uint256[]', internalType: 'uint256[]' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isValidSignature',
    inputs: [
      { name: 'data', type: 'bytes32', internalType: 'bytes32' },
      { name: 'signature', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: 'magicValue', type: 'bytes4', internalType: 'bytes4' }],
    stateMutability: 'view',
  },
] as const
