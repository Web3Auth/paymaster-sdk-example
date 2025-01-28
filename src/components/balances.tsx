import { SOURCE_CHAIN_1, SOURCE_CHAIN_2, TARGET_CHAIN } from "@/config";
import { Address } from "viem";

interface BalancesState {
  weth: string;
  w3pay: string;
}

interface BalancesProps {
  accountAddress: Address;
  source1Balances: BalancesState;
  source2Balances: BalancesState;
  targetBalances: BalancesState;
  onClose: () => void;
}

export default function Balances({
  accountAddress,
  source1Balances,
  source2Balances,
  targetBalances,
  onClose,
}: BalancesProps) {
  return (
    <div className="absolute w-full h-full top-0 left-0 flex items-center justify-center gap-2 bg-gray-400/50 z-50">
      <div className="flex flex-col justify-center gap-2 bg-white p-4 rounded-md">
        <div>Account: {accountAddress}</div>
        <p className="text-sm font-bold">{SOURCE_CHAIN_1.name}</p>
        <div className="flex items-center gap-2 w-full bg-gray-100 p-2 rounded-md">
          <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
            WETH Balance: <b className="text-sm">{source1Balances.weth}</b>
          </p>
          <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
            W3P Balance: <b className="text-sm">{source1Balances.w3pay}</b>
          </p>
        </div>
        <p className="text-sm font-bold">{SOURCE_CHAIN_2.name}</p>
        <div className="flex items-center gap-2 w-full bg-gray-100 p-2 rounded-md">
          <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
            WETH Balance: <b className="text-sm">{source2Balances.weth}</b>
          </p>
          <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
            W3P Balance: <b className="text-sm">{source2Balances.w3pay}</b>
          </p>
        </div>
        <p className="text-sm font-bold">{TARGET_CHAIN.name}</p>
        <div className="flex items-center gap-2 w-full bg-gray-100 p-2 rounded-md">
          <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
            WETH Balance: <b className="text-sm">{targetBalances.weth}</b>
          </p>
          <p className="text-xs bg-gray-100 p-2 rounded-md text-gray-800">
            W3P Balance: <b className="text-sm">{targetBalances.w3pay}</b>
          </p>
        </div>
        <button
          className="w-full bg-blue-500 text-white p-2 rounded-md"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
