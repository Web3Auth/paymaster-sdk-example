"use client";

import { MultiChainAccount, SignerType } from "@web3auth/paymaster-sdk";
import { useEffect, useState } from "react";
import { Address, formatUnits } from "viem";
import { SmartAccount } from "viem/account-abstraction";

import {
  SOURCE_CHAIN_1,
  SOURCE_CHAIN_1_RPC_URL,
  SOURCE_CHAIN_2,
  SOURCE_CHAIN_2_RPC_URL,
  TARGET_CHAIN,
  TARGET_CHAIN_RPC_URL,
  WEB3PAY_TEST_TOKEN,
  WETH_CONTRACT_MAP,
} from "@/config";
import WebAuthnActions from "./webauthn";
import EcdsaActions from "./ecdsa";
import Balances from "./balances";
import { getErc20TokenBalance } from "@/libs/utils";

interface WalletProps {
  account: SmartAccount | MultiChainAccount;
  type: SignerType;
}
interface BalancesState {
  weth: string;
  w3pay: string;
}
const defaultBalances: BalancesState = {
  weth: "0",
  w3pay: "0",
};

export default function Wallet({ account: _account, type }: WalletProps) {
  const [loading, setLoading] = useState(true);
  const [accountAddress, setAccountAddress] = useState<Address>();
  const [showBalances, setShowBalances] = useState(false);
  const [source1Balances, setSource1Balances] =
    useState<BalancesState>(defaultBalances);
  const [source2Balances, setSource2Balances] =
    useState<BalancesState>(defaultBalances);
  const [targetBalances, setTargetBalances] =
    useState<BalancesState>(defaultBalances);

  async function viewBalances() {
    if (!accountAddress) return;

    setLoading(true);
    try {
      const src1WethAddress = WETH_CONTRACT_MAP[SOURCE_CHAIN_1.id];
      const src2WethAddress = WETH_CONTRACT_MAP[SOURCE_CHAIN_2.id];
      const targetWethAddress = WETH_CONTRACT_MAP[TARGET_CHAIN.id];
      const [src1WethBalance, src2WethBalance, targetWethBalance] =
        await Promise.all([
          getErc20TokenBalance(
            accountAddress,
            src1WethAddress,
            SOURCE_CHAIN_1,
            SOURCE_CHAIN_1_RPC_URL
          ),
          getErc20TokenBalance(
            accountAddress,
            src2WethAddress,
            SOURCE_CHAIN_2,
            SOURCE_CHAIN_2_RPC_URL
          ),
          getErc20TokenBalance(
            accountAddress,
            targetWethAddress,
            TARGET_CHAIN,
            TARGET_CHAIN_RPC_URL
          ),
        ]);
      const [src1W3pBalance, src2W3pBalance, targetW3pBalance] =
        await Promise.all([
          getErc20TokenBalance(
            accountAddress,
            WEB3PAY_TEST_TOKEN,
            SOURCE_CHAIN_1,
            SOURCE_CHAIN_1_RPC_URL
          ),
          getErc20TokenBalance(
            accountAddress,
            WEB3PAY_TEST_TOKEN,
            SOURCE_CHAIN_2,
            SOURCE_CHAIN_2_RPC_URL
          ),
          getErc20TokenBalance(
            accountAddress,
            WEB3PAY_TEST_TOKEN,
            TARGET_CHAIN,
            TARGET_CHAIN_RPC_URL
          ),
        ]);
      setSource1Balances({
        weth: formatUnits(src1WethBalance, 18),
        w3pay: formatUnits(src1W3pBalance, 6),
      });
      setSource2Balances({
        weth: formatUnits(src2WethBalance, 18),
        w3pay: formatUnits(src2W3pBalance, 6),
      });
      setTargetBalances({
        weth: formatUnits(targetWethBalance, 18),
        w3pay: formatUnits(targetW3pBalance, 6),
      });
      setShowBalances(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      let address: Address;
      if (type === SignerType.ECDSA) {
        address = (_account as SmartAccount).address;
      } else {
        address = await (_account as MultiChainAccount).getAddress();
      }
      setAccountAddress(address);
      setLoading(false);
    })();
  }, [_account, type]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-gray-300 rounded-md p-6">
      <h1>Wallet</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="flex items-center gap-2 w-full mb-4">
            <p className="text-xs bg-blue-100 p-1 rounded-md text-gray-800">
              <b>Source Chain 1:</b> {SOURCE_CHAIN_1.name}
            </p>
            <p className="text-xs bg-violet-100 p-1 rounded-md text-gray-800">
              <b>Source Chain 2:</b> {SOURCE_CHAIN_2.name}
            </p>
            <p className="text-xs bg-violet-100 p-1 rounded-md text-gray-800">
              <b>Target Chain:</b> {TARGET_CHAIN.name}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 w-full">
            <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
              Smart Account: <b className="text-sm">{accountAddress}</b>
            </p>
            <p className="text-sm bg-red-100 p-2 rounded-md text-gray-800">
              {type}
            </p>
          </div>
          <button
            className="bg-blue-500 text-white p-2 rounded-md"
            onClick={viewBalances}
          >
            View Balances
          </button>
          {showBalances && accountAddress && (
            <Balances
              source1Balances={source1Balances}
              source2Balances={source2Balances}
              targetBalances={targetBalances}
              accountAddress={accountAddress}
              onClose={() => setShowBalances(false)}
            />
          )}
          {type === "webauthn" ? (
            <WebAuthnActions
              multiChainAccount={_account as MultiChainAccount}
            />
          ) : (
            <EcdsaActions account={_account as SmartAccount} />
          )}
        </>
      )}
    </div>
  );
}
