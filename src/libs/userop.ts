import { concat, Hex, keccak256, toHex, size, pad } from "viem";
import { entryPoint07Address, getUserOperationHash, UserOperation } from "viem/account-abstraction";

export type TSponsorUserOp = Required<
  Pick<
    UserOperation<"0.7">,
    | "callGasLimit"
    | "verificationGasLimit"
    | "preVerificationGas"
    | "paymaster"
    | "paymasterVerificationGasLimit"
    | "paymasterPostOpGasLimit"
    | "paymasterData"
  >
>;

export const userOpGasHexToBigInt = (userOp: TSponsorUserOp) => {
  return {
    ...userOp,
    callGasLimit: BigInt(userOp.callGasLimit),
    verificationGasLimit: BigInt(userOp.verificationGasLimit),
    preVerificationGas: BigInt(userOp.preVerificationGas),
    paymasterVerificationGasLimit: BigInt(userOp.paymasterVerificationGasLimit ?? 0),
    paymasterPostOpGasLimit: BigInt(userOp.paymasterPostOpGasLimit ?? 0),
  };
};

export async function signMultichainOp(
  sourceOp: { userOp: UserOperation<"0.7">; chainId: number },
  targetOp: { userOp: UserOperation<"0.7">; chainId: number },
  signMessage: (rootHash: Hex) => Promise<Hex>
) {
  const sourceHash = getUserOperationHash({
    userOperation: { ...sourceOp.userOp },
    entryPointAddress: entryPoint07Address,
    entryPointVersion: "0.7",
    chainId: sourceOp.chainId,
  });
  const targetHash = getUserOperationHash({
    userOperation: { ...targetOp.userOp },
    entryPointAddress: entryPoint07Address,
    entryPointVersion: "0.7",
    chainId: targetOp.chainId,
  });

  const rootHash = keccak256(concat([sourceHash, targetHash]));
  const rootSig = await signMessage(rootHash);

  const sourceSigType = pad(toHex(1), { size: 1 });
  const sourceAccountSig = concat([sourceSigType, rootSig, targetHash]);
  const sourceAccountSigLen = pad(toHex(size(sourceAccountSig)), { size: 2 });
  const sourceSig = concat([sourceAccountSigLen, sourceAccountSig]);

  const targetSigType = pad(toHex(2), { size: 1 });
  const targetAccountSig = concat([targetSigType, rootSig, sourceHash]);
  const targetAccountSigLen = pad(toHex(size(targetAccountSig)), { size: 2 });
  const targetSig = concat([targetAccountSigLen, targetAccountSig]);

  return { partialSignedSourceOp: sourceSig, partialSignedTargetOp: targetSig };
}
