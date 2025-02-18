import Dropdown from "./dropdown";
import { CHAIN_1, CHAIN_2, CHAIN_3 } from "@/config";

interface IMultiSourceTxProps {
  handleSourceChain1Selected: (chainId: number) => void;
  handleSourceChain2Selected: (chainId: number) => void;
  sourceAmount1: number;
  sourceAmount1OnChange: (amount: number) => void;
  sourceAmount2: number;
  sourceAmount2OnChange: (amount: number) => void;
}

export default function MultiSourceTx({
  handleSourceChain1Selected,
  handleSourceChain2Selected,
  sourceAmount1,
  sourceAmount1OnChange,
  sourceAmount2,
  sourceAmount2OnChange,
}: IMultiSourceTxProps) {
  return (
    <div>
      <div className="flex flex-col gap-2 mb-2">
        <p className="text-sm font-bold text-gray-900">Source Chain 1:</p>
        <div className="flex gap-2">
          <Dropdown options={[CHAIN_1, CHAIN_2, CHAIN_3]} onSelect={handleSourceChain1Selected} />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={sourceAmount1}
              onChange={(e) => sourceAmount1OnChange(Number(e.target.value))}
              className="px-1 py-2 text-sm border border-gray-300 rounded-md bg-gray-100 w-40 text-right"
            />
            <label className="text-xs font-bold text-gray-600">W3P</label>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 mb-2">
        <p className="text-sm font-bold text-gray-900">Source Chain 2:</p>
        <div className="flex gap-2">
          <Dropdown options={[CHAIN_1, CHAIN_2, CHAIN_3]} onSelect={handleSourceChain2Selected} />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={sourceAmount2}
              onChange={(e) => sourceAmount2OnChange(Number(e.target.value))}
              className="px-1 py-2 text-sm border border-gray-300 rounded-md bg-gray-100 w-40 text-right"
            />
            <label className="text-xs font-bold text-gray-600">W3P</label>
          </div>
        </div>
      </div>
    </div>
  );
}
